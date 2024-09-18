import {
  ChannelNotConfigured,
  ConfigurationNotFound,
  HttpRequestError,
  HyperswitchHttpClientError,
} from "@/errors";
import fetch, { Headers } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { type paths as HyperswitchPaymentPaths } from "generated/hyperswitch-payments";
import { intoErrorResponse } from "./hyperswitch-api-response";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import {
  PaymentAppConfigEntryFullyConfigured,
  paymentAppFullyConfiguredEntrySchema,
} from "../payment-app-configuration/common-app-configuration/config-entry";
import { config } from "../../pages/api/webhooks/saleor/transaction-initialize-session";
import { HyperswitchFullyConfiguredEntry } from "../payment-app-configuration/hyperswitch-app-configuration/config-entry";
import { env } from "@/lib/env.mjs";
import { invariant } from "@/lib/invariant";
import { ConfigObject } from "@/backend-lib/api-route-utils";

const getHyperswitchBaseUrl = (config_env: string) => {
  if (config_env == "live") {
    invariant(env.HYPERSWITCH_PROD_BASE_URL, "ENV variable HYPERSWITCH_PROD_BASE_URL not set");
    return env.HYPERSWITCH_PROD_BASE_URL;
  } else {
    invariant(
      env.HYPERSWITCH_SANDBOX_BASE_URL,
      "ENV variable HYPERSWITCH_SANDBOX_BASE_URL not set",
    );
    return env.HYPERSWITCH_SANDBOX_BASE_URL;
  }
};

const fetchSavedConfiguration = async (
  configData: ConfigObject,
): Promise<PaymentAppConfigEntryFullyConfigured> => {
  const appConfig = await configData.configurator.getConfig();

  const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  return paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
};

export const fetchHyperswitchProfileID = async (configData: ConfigObject): Promise<string> => {
  let appChannelConfig = await fetchSavedConfiguration(configData);
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return HyperswitchConfig.profileId;
};

export const fetchHyperswitchPublishableKey = async (configData: ConfigObject): Promise<string> => {
  let appChannelConfig = await fetchSavedConfiguration(configData);
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return HyperswitchConfig.publishableKey;
};

export const fetchHyperswitchPaymentResponseHashKey = async (
  configData: ConfigObject,
): Promise<string> => {
  let appChannelConfig = await fetchSavedConfiguration(configData);
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return HyperswitchConfig.paymentResponseHashKey;
};

export const callHyperswitchClient = async ({
  configData,
  targetPath,
  method,
  body,
}: {
  configData: ConfigObject;
  targetPath: string;
  method: string;
  body: string | undefined;
}) => {
  const SavedConfiguration = await fetchSavedConfiguration(configData);
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(SavedConfiguration),
  );
  const baseUrl = getHyperswitchBaseUrl(SavedConfiguration.environment);
  const targetUrl = new URL(`${baseUrl}${targetPath}`);
  const meta = {
    "api-key": HyperswitchConfig.apiKey,
    "content-type": "application/json",
  };
  const headers = new Headers(meta);

  try {
    const agent = env.PROXY_URL ? new HttpsProxyAgent(env.PROXY_URL) : undefined;

    const apiResponse = await fetch(targetUrl, {
      headers,
      method,
      body,
      ...(agent && { agent }),
    });

    let response = await apiResponse.json();

    if (!apiResponse.ok) {
      throw response;
    }

    return response;
  } catch (err) {
    const errorData = intoErrorResponse(err);
    const errorMessage = errorData.error?.message || "NO ERROR MESSAGE";
    throw new HyperswitchHttpClientError(errorMessage);
  }
};

export function getHyperswitchConfig(
  config: PaymentAppConfigEntryFullyConfigured,
): HyperswitchFullyConfiguredEntry {
  if (config.hyperswitchConfiguration) {
    return config.hyperswitchConfiguration;
  } else {
    throw new ConfigurationNotFound("Please add a Hyperswitch configuration");
  }
}
