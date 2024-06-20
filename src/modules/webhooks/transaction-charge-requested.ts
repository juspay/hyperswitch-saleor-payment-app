import { paymentAppFullyConfiguredEntrySchema } from "../payment-app-configuration/config-entry";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "../payment-app-configuration/payment-app-configuration-factory";
import { type TransactionChargeRequestedResponse } from "@/schemas/TransactionChargeRequested/TransactionChargeRequestedResponse.mjs";

import { invariant } from "@/lib/invariant";
import {
  GetTransactionByIdDocument,
  type GetTransactionByIdQuery,
  type GetTransactionByIdQueryVariables,
  TransactionEventReportDocument,
  TransactionEventTypeEnum,
  TransactionActionEnum,
  TransactionChargeRequestedEventFragment,
} from "generated/graphql";
import { saleorApp } from "@/saleor-app";
import { createClient } from "@/lib/create-graphq-client";
import { intoErrorResponse, intoPaymentResponse } from "../hyperswitch/hyperswitch-api-response";
import { createLogger } from "@/lib/logger";
import {
  getHyperswitchAmountFromSaleorMoney,
  getSaleorAmountFromHyperswitchAmount,
} from "../hyperswitch/currencies";
import { ChannelNotConfigured, HyperswitchHttpClientError } from "@/errors";
import { SyncWebhookAppErrors } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { createHyperswitchClient } from "../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";

export const hyperswitchPaymentCaptureStatusToSaleorTransactionResult = (
  status: string,
): TransactionChargeRequestedResponse["result"] => {
  switch (status) {
    case "succeeded":
    case "partially_captured":
    case "partially_captured_and_capturable":
      return "CHARGE_SUCCESS";
    case "failed":
    case "cancelled":
      return "CHARGE_FAILURE";
    default:
      return undefined;
  }
};

export const TransactionChargeRequestedWebhookHandler = async (
  event: TransactionChargeRequestedEventFragment,
  saleorApiUrl: string,
): Promise<TransactionChargeRequestedResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionChargeRequestedWebhookHandler] " },
  );
  logger.debug(
    {
      transaction: event.transaction,
      action: event.action,
    },
    "Received event",
  );
  const app = event.recipient;
  invariant(app, "Missing event.recipient!");
  const { privateMetadata } = app;
  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  invariant(event.transaction, "Missing transaction");
  const authData = await saleorApp.apl.get(saleorApiUrl);
  invariant(authData, "Failed fetching auth data");

  // Fetch Transaction Details
  invariant(event.transaction.sourceObject, "Missing sourceObject");
  const sourceObject = event.transaction.sourceObject
  invariant(sourceObject?.total.gross.currency, "Missing Currency");
  const amount_to_capture = getHyperswitchAmountFromSaleorMoney(
    event.action.amount,
    sourceObject?.total.gross.currency,
  );
  const payment_id = event.transaction.pspReference;
  const appChannelConfig = getConfigurationForChannel(appConfig, sourceObject.channel.id);
  const errors: SyncWebhookAppErrors = [];
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  const hyperswitchClient = createHyperswitchClient({
    apiKey: HyperswitchConfig.apiKey,
  });
  const captureHyperswitchPayment = hyperswitchClient
    .path("/payments/{payment_id}/capture")
    .method("post")
    .create();
  const capturePaymentPayload: paymentsComponents["schemas"]["PaymentsCaptureRequest"] = {
    amount_to_capture,
  };

  const capturePaymentResponse = await captureHyperswitchPayment({
    ...capturePaymentPayload,
    payment_id,
  });

  const capturePaymentResponseData = intoPaymentResponse(capturePaymentResponse.data);
  const result = hyperswitchPaymentCaptureStatusToSaleorTransactionResult(
    capturePaymentResponseData.status,
  );
  const transactionChargeRequestedResponse: TransactionChargeRequestedResponse = 
  (result === "CHARGE_SUCCESS" || result === "CHARGE_FAILURE") ? 
  {
    result,
    pspReference: capturePaymentResponseData.payment_id,
    amount: getSaleorAmountFromHyperswitchAmount(
      capturePaymentResponseData.amount,
      capturePaymentResponseData.currency,
    ),
  } : 
  {
    pspReference: capturePaymentResponseData.payment_id,
    message: `hyperswitch status: ${capturePaymentResponseData.status}, reason_code: ${capturePaymentResponseData.error_code}, reason: ${capturePaymentResponseData.error_message}`
  };

  return transactionChargeRequestedResponse;
};
