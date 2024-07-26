import { ChannelNotConfigured, HttpRequestError, HyperswitchHttpClientError, JuspayHttpClientError } from "@/errors";
import { type paths as HyperswitchPaymentPaths } from "generated/hyperswitch-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { intoErrorResponse } from "./hyperswitch-api-response";
import { SyncWebhookAppError } from "@/schemas/HyperswitchTransactionInitializeSession/HyperswitchTransactionInitializeSessionResponse.mjs";
import {
  getConfigurationForChannel,
  PaymentAppConfigurator,
} from "../payment-app-configuration/payment-app-configuration";
import {
  PaymentAppConfigEntryFullyConfigured,
  paymentAppFullyConfiguredEntrySchema,
} from "../payment-app-configuration/config-entry";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { env } from "../../lib/env.mjs";
import { type paths as JuspayPaymentPaths } from "generated/juspay-payments";

const SANDBOX_BASE_URL: string = "https://sandbox.hyperswitch.io";
const PROD_BASE_URL: string = "https://api.hyperswitch.io";
const JUSPAY_SANDBOX_BASE_URL: string = "https://sandbox.juspay.in";
const JUSPAY_PROD_BASE_URL: string ="https://api.juspay.in";

export const getEnvironmentFromKey = (publishableKey: string) => {
  return publishableKey.startsWith("pk_snd_") || publishableKey.startsWith("pk_dev_")
    ? "test"
    : "live";
};

const getHyperswitchBaseUrl = (publishableKey: string) => {
  if (getEnvironmentFromKey(publishableKey) == "live") {
    return PROD_BASE_URL;
  } else {
    return SANDBOX_BASE_URL;
  }
};

const getJuspayBaseUrl = () => {
  if (env.ENV == "production") {
    return JUSPAY_PROD_BASE_URL;
  } else {
    return JUSPAY_SANDBOX_BASE_URL;
  }
};

const fetchHyperswitchConfiguration = async (
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
  const appConfig = await configData.configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.profileId;
};

export const fetchHyperswitchPublishableKey = async (configData: ConfigObject): Promise<string> => {
  const appConfig = await configData.configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.publishableKey;
};

export const fetchHyperswitchPaymentResponseHashKey = async (
  configData: ConfigObject,
): Promise<string> => {
  const appConfig = await configData.configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.paymentResponseHashKey;
};

export const createHyperswitchClient = async ({ configData }: { configData: ConfigObject }) => {
  const HyperswitchConfig = await fetchHyperswitchConfiguration(configData);
  const fetcher = Fetcher.for<HyperswitchPaymentPaths>();
  fetcher.configure({
    baseUrl: getHyperswitchBaseUrl(HyperswitchConfig.publishableKey),
    init: {
      headers: {
        "api-key": HyperswitchConfig.apiKey,
        "content-type": "application/json",
      },
    },
    use: [
      (url, init, next) =>
        next(url, init).catch((err) => {
          if (err instanceof ApiError) {
            const errorData = intoErrorResponse(err.data);
            const errorMessage = errorData.error?.message
              ? errorData.error?.message
              : "NO ERROR MESSAGE";
            throw new HyperswitchHttpClientError(errorMessage);
          } else {
            throw err;
          }
        }),
    ],
  });
  return fetcher;
};

const fetchJuspayConfiguration = async (
  configData: ConfigObject,
): Promise<PaymentAppConfigEntryFullyConfigured> => {
  const appConfig = await configData.configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  return paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
};

export const createJuspayClient = async ({ configData }: { configData: ConfigObject }) => {
  const fetcher = Fetcher.for<JuspayPaymentPaths>();
  fetcher.configure({
    baseUrl: getJuspayBaseUrl(),
    init: {
      headers: {
        "Authorization": "Basic RUVDQ0U1MzA3MTg0NEQ5Qjc0M0VEOUI0QzE3Q0JGOg==",
        "content-type": "application/json",
      },
    },
    use: [
      (url, init, next) =>
        next(url, init).catch((err) => {
          if (err instanceof ApiError) {
            const errorData = intoErrorResponse(err.data);
            const errorMessage = errorData.error?.message
              ? errorData.error?.message
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
