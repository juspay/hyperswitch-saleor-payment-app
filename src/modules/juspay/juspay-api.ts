import { ConfigObject } from "@/backend-lib/api-route-utils";
import { type paths as JuspayPaymentPaths } from "generated/juspay-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { env } from "../../lib/env.mjs";
import { ChannelNotConfigured, ConfigurationNotFound, JuspayHttpClientError } from "@/errors";
import {
  PaymentAppConfigEntryFullyConfigured,
  paymentAppFullyConfiguredEntrySchema,
} from "../payment-app-configuration/common-app-configuration/config-entry";
import { JuspayFullyConfiguredEntry } from "../payment-app-configuration/juspay-app-configuration/config-entry";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import { intoErrorResponse } from "./juspay-api-response";
import { invariant } from "@/lib/invariant";

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

export const createJuspayClient = async ({ configData }: { configData: ConfigObject }) => {
  const SavedConfiguration = await fetchSavedConfiguration(configData);
  const JuspayConfig = getJuspayConfig(SavedConfiguration);
  const fetcher = Fetcher.for<JuspayPaymentPaths>();
  const apiKey = Buffer.from(JuspayConfig.apiKey).toString("base64");
  fetcher.configure({
    baseUrl: getJuspayBaseUrl(SavedConfiguration.environment),
    init: {
      headers: {
        authorization: `Basic ${apiKey}`,
        "content-type": "application/json",
        "x-merchantid": `${JuspayConfig.merchantId}`,
      },
    },
    use: [
      (url, init, next) =>
        next(url, init).catch((err) => {
          if (err instanceof ApiError) {
            const errorData = intoErrorResponse(err.data);
            const errorMessage = errorData.error_message
              ? errorData.error_message
              : errorData.user_message
                ? errorData.user_message
                : "NO ERROR MESSAGE";
            throw new JuspayHttpClientError(errorMessage);
          } else {
            throw err;
          }
        }),
    ],
  });
  return fetcher;
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
