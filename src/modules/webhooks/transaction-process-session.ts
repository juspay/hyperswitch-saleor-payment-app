import { SyncWebhookAppErrors, type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { invariant } from "@/lib/invariant";
import { type JSONObject } from "@/types";
import { createLogger } from "@/lib/logger";
import { obfuscateConfig } from "@/modules/app-configuration/utils";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import {
  TransactionFlowStrategyEnum,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { ChannelNotConfigured } from "@/errors";
import { getHyperswitchAmountFromSaleorMoney, getSaleorAmountFromHyperswitchAmount } from "../hyperswitch/currencies";
import { createHyperswitchClient } from "../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { validatePaymentCreateRequest } from "../hyperswitch/hyperswitch-api-request";
import { intoPaymentResponse } from "../hyperswitch/hyperswitch-api-response";
import { hyperswitchPaymentIntentToTransactionResult } from "./transaction-initialize-session";


export const TransactionProcessSessionWebhookHandler = async (
  event: TransactionProcessSessionEventFragment,
  saleorApiUrl: string,
): Promise<TransactionProcessSessionResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionProcessSessionWebhookHandler] " },
  );
  logger.debug(
    {
      transaction: event.transaction,
      action: event.action,
      sourceObject: {
        id: event.sourceObject.id,
        channel: event.sourceObject.channel,
        __typename: event.sourceObject.__typename,
      },
      merchantReference: event.merchantReference,
    },
    "Received event",
  );

  const app = event.recipient;
  invariant(app, "Missing event.recipient!");
  const { privateMetadata } = app;
  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, event.sourceObject.channel.id);
  const errors: SyncWebhookAppErrors = [];
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  let requestData = null;
  if (event.data != null) {
    requestData = validatePaymentCreateRequest(event.data);
  };
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  const currency = event.action.currency;
  const amount = getHyperswitchAmountFromSaleorMoney(event.action.amount, currency);
  const billingAddress = event.sourceObject.billingAddress;
  const shippingAddress = event.sourceObject.shippingAddress;

  const hyperswitchClient = createHyperswitchClient({
    apiKey: HyperswitchConfig.apiKey,
  });
  const updateHyperswitchPayment = hyperswitchClient.path("/payments/{payment_id}").method("post").create();

  const capture_method =
    event.action.actionType == TransactionFlowStrategyEnum.Authorization ? "manual" : "automatic";

  const updatePaymentPayload: paymentsComponents["schemas"]["PaymentsUpdateRequest"] = {
    amount,
    confirm: false,
    currency: currency as paymentsComponents["schemas"]["PaymentsUpdateRequest"]["currency"],
    capture_method,
    customer_id: requestData?.customerId,
    authentication_type: requestData?.authenticationType,
    return_url: requestData?.returnUrl,
    description: requestData?.description,
    billing: {
      address: {
        line1: billingAddress?.streetAddress1,
        line2: billingAddress?.streetAddress2,
        city: billingAddress?.city,
        state: billingAddress?.countryArea,
        zip: billingAddress?.postalCode,
        country: billingAddress?.country.code as paymentsComponents["schemas"]["CountryAlpha2"],
        first_name: billingAddress?.firstName,
        last_name: billingAddress?.lastName,
      },
      phone: {
        number: billingAddress?.phone,
      },
      email: requestData?.billingEmail,
    },
    shipping: {
      address: {
        line1: shippingAddress?.streetAddress1,
        line2: shippingAddress?.streetAddress2,
        city: shippingAddress?.city,
        state: shippingAddress?.countryArea,
        zip: shippingAddress?.postalCode,
        country: shippingAddress?.country.code as paymentsComponents["schemas"]["CountryAlpha2"],
        first_name: shippingAddress?.firstName,
        last_name: shippingAddress?.lastName,
      },
      phone: {
        number: shippingAddress?.phone,
      },
      email: requestData?.shippingEmail,
    },
    metadata: {
      channel_id: event.sourceObject.channel.id,
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    },
  };

  const payment_id = event.transaction.pspReference;

  const updatePaymentResponse = await updateHyperswitchPayment({
    ...updatePaymentPayload,
    payment_id
  });
  const updatePaymentResponseData = intoPaymentResponse(updatePaymentResponse.data);

  const result = hyperswitchPaymentIntentToTransactionResult(
    updatePaymentResponseData.status,
    event.action.actionType,
  );
  const transactionProcessSessionResponse: TransactionProcessSessionResponse = {
    data: {
      clientSecret: updatePaymentResponseData.client_secret,
      publishableKey: HyperswitchConfig.publishableKey,
      errors,
    },
    pspReference: updatePaymentResponseData.payment_id,
    result,
    amount: getSaleorAmountFromHyperswitchAmount(
      updatePaymentResponseData.amount,
      updatePaymentResponseData.currency,
    ),
    time: new Date().toISOString(),
  };
  return transactionProcessSessionResponse;
};
