import {
  ChannelNotConfigured,
  ConfigurationNotFound,
  HttpRequestError,
  HyperswitchHttpClientError,
} from "@/errors";
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
} from "../payment-app-configuration/common-app-configuration/config-entry";
import { config } from "../../pages/api/webhooks/saleor/transaction-initialize-session";
import { HyperswitchFullyConfiguredEntry } from "../payment-app-configuration/hyperswitch-app-configuration/config-entry";
import { invariant } from "@/lib/invariant";

const SANDBOX_BASE_URL: string = "https://sandbox.hyperswitch.io";
const PROD_BASE_URL: string = "https://api.hyperswitch.io";

export const getEnvironmentFromKey = (): string => {
  return "production";
};

const getHyperswitchBaseUrl = (publishableKey: string) => {
  if (getEnvironmentFromKey() == "production") {
    return PROD_BASE_URL;
  } else {
    return SANDBOX_BASE_URL;
  }
};

const fetchHyperswitchConfiguration = async (
  configurator: PaymentAppConfigurator,
  channelId: string,
): Promise<HyperswitchFullyConfiguredEntry> => {
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, channelId);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  return getHyperswitchConfig(paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig));
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
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
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
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
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
  const HyperswitchConfig = getHyperswitchConfig(
    paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
  );
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

export function getHyperswitchConfig(
  config: PaymentAppConfigEntryFullyConfigured,
): HyperswitchFullyConfiguredEntry {
  if (config.hyperswitchConfiguration) {
    return config.hyperswitchConfiguration;
  } else {
    throw new ConfigurationNotFound("Please add Hyperswitch configuration");
  }
}
