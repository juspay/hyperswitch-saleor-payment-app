import { ChannelNotConfigured, HttpRequestError, HyperswitchHttpClientError } from "@/errors";
import { type paths as PaymentPaths } from "generated/hyperswitch-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { intoErrorResponse } from "./hyperswitch-api-response";
import { SyncWebhookAppError } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  getConfigurationForChannel,
  PaymentAppConfigurator,
} from "../payment-app-configuration/payment-app-configuration";
import {
  PaymentAppConfigEntryFullyConfigured,
  paymentAppFullyConfiguredEntrySchema,
} from "../payment-app-configuration/config-entry";

const SANDBOX_BASE_URL: string = "https://sandbox.hyperswitch.io";
const PROD_BASE_URL: string = "https://api.hyperswitch.io";

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

const fetchHyperswitchConfiguration = async (
  configurator: PaymentAppConfigurator,
  channelId: string,
): Promise<PaymentAppConfigEntryFullyConfigured> => {
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  return paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
};

export const fetchHyperswitchProfileID = async (
  configurator: PaymentAppConfigurator,
  channelId: string,
): Promise<string> => {
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.profileId;
};

export const fetchHyperswitchPublishableKey = async (
  configurator: PaymentAppConfigurator,
  channelId: string,
): Promise<string> => {
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.publishableKey;
};

export const fetchHyperswitchPaymentResponseHashKey = async (
  configurator: PaymentAppConfigurator,
  channelId: string,
): Promise<string> => {
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  return HyperswitchConfig.paymentResponseHashKey;
};

export const createHyperswitchClient = async ({
  configurator,
  channelId,
}: {
  configurator: PaymentAppConfigurator;
  channelId: string;
}) => {
  const HyperswitchConfig = await fetchHyperswitchConfiguration(configurator, channelId);
  const fetcher = Fetcher.for<PaymentPaths>();
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
