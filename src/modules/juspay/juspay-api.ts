import { ConfigObject } from "@/backend-lib/api-route-utils";
import { type paths as JuspayPaymentPaths } from "generated/juspay-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { env } from "../../lib/env.mjs";
import { intoErrorResponse } from "../hyperswitch/hyperswitch-api-response";
import { ChannelNotConfigured, ConfigurationNotFound, JuspayHttpClientError } from "@/errors";
import { PaymentAppConfigEntryFullyConfigured, paymentAppFullyConfiguredEntrySchema } from "../payment-app-configuration/common-app-configuration/config-entry";
import { JuspayFullyConfiguredEntry } from "../payment-app-configuration/juspay-app-configuration/config-entry";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";

const JUSPAY_SANDBOX_BASE_URL: string = "https://sandbox.juspay.in";
const JUSPAY_PROD_BASE_URL: string ="https://api.juspay.in";

const getJuspayBaseUrl = () => {
    if (env.ENV == "production") {
      return JUSPAY_PROD_BASE_URL;
    } else {
      return JUSPAY_SANDBOX_BASE_URL;
    }
  };

const fetchJuspayConfiguration = async (
    configData: ConfigObject,
  ): Promise<JuspayFullyConfiguredEntry> => {
    const appConfig = await configData.configurator.getConfig();
    const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
    if (appChannelConfig == null) {
      throw new ChannelNotConfigured("Please assign a channel for your configuration");
    }
  
    return getJuspayConfig(paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig));
  };

  export const fetchJuspayCleintId = async (
    configData: ConfigObject,
  ): Promise<string> => {
    const appConfig = await configData.configurator.getConfig();
    const appChannelConfig = getConfigurationForChannel(appConfig, configData.channelId);
    if (appChannelConfig == null) {
      throw new ChannelNotConfigured("Please assign a channel for your configuration");
    }
    const HyperswitchConfig = getJuspayConfig(
      paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig),
    );
    return HyperswitchConfig.clientId;
  };

export const createJuspayClient = async ({ configData }: { configData: ConfigObject }) => {
    const JuspayConfig  = await fetchJuspayConfiguration(configData);
    const fetcher = Fetcher.for<JuspayPaymentPaths>();
    fetcher.configure({
      baseUrl: getJuspayBaseUrl(),
      init: {
        headers: {
          "authorization": `Basic ${JuspayConfig.apiKey}`,
          "content-type": "application/json",
          "x-merchantid": `${JuspayConfig.merchantId}`
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

  export function getJuspayConfig(
    config: PaymentAppConfigEntryFullyConfigured,
  ): JuspayFullyConfiguredEntry {
    if (config.juspayConfiguration) {
      return config.juspayConfiguration;
    } else {
      throw new ConfigurationNotFound("Please add Juspay configuration");
    }
  }
  