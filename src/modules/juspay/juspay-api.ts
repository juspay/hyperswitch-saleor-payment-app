import { ConfigObject } from "@/backend-lib/api-route-utils";
import { type paths as JuspayPaymentPaths } from "generated/juspay-payments";
import { ApiError } from "openapi-typescript-fetch";
import fetch, { Headers } from "node-fetch";
import { ChannelNotConfigured, ConfigurationNotFound, JuspayHttpClientError } from "@/errors";
import {
  PaymentAppConfigEntryFullyConfigured,
  paymentAppFullyConfiguredEntrySchema,
} from "../payment-app-configuration/common-app-configuration/config-entry";
import { JuspayFullyConfiguredEntry } from "../payment-app-configuration/juspay-app-configuration/config-entry";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import { intoErrorResponse } from "./juspay-api-response";
import { invariant } from "@/lib/invariant";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "../../lib/env.mjs";

const getJuspayBaseUrl = (config_env: string) => {
  if (config_env == "live") {
    invariant(env.JUSPAY_PROD_BASE_URL, "ENV variable HYPERSWITCH_PROD_BASE_URL not set");
    return env.JUSPAY_PROD_BASE_URL;
  } else {
    invariant(env.JUSPAY_SANDBOX_BASE_URL, "ENV variable HYPERSWITCH_SANDBOX_BASE_URL not set");
    return env.JUSPAY_SANDBOX_BASE_URL;
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

export const fetchJuspayCleintId = async (configData: ConfigObject): Promise<string> => {
  const appChannelConfig = await fetchSavedConfiguration(configData);
  const JuspayConfig = getJuspayConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return JuspayConfig.clientId;
};

export const fetchJuspayUsername = async (configData: ConfigObject): Promise<string> => {
  const appChannelConfig = await fetchSavedConfiguration(configData);
  const JuspayConfig = getJuspayConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return JuspayConfig.username;
};

export const fetchJuspayPassword = async (configData: ConfigObject): Promise<string> => {
  const appChannelConfig = await fetchSavedConfiguration(configData);
  const JuspayConfig = getJuspayConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
  return JuspayConfig.password;
};

export const callJuspayClient = async ({
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
  const HyperswitchConfig = getJuspayConfig(
    paymentAppFullyConfiguredEntrySchema.parse(SavedConfiguration),
  );
  const baseUrl = getJuspayBaseUrl(SavedConfiguration.environment);
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
    const errorMessage = errorData.error_message || "NO ERROR MESSAGE";
    throw new JuspayHttpClientError(errorMessage);
  }
};

export function getJuspayConfig(
  config: PaymentAppConfigEntryFullyConfigured,
): JuspayFullyConfiguredEntry {
  if (config.juspayConfiguration) {
    return config.juspayConfiguration;
  } else {
    throw new ConfigurationNotFound("Please add Juspay configuration");
  }
}
