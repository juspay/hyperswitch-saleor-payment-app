import { invariant } from "@/lib/invariant";
import { createLogger, redactLogObject } from "@/lib/logger";
import {
  TransactionFlowStrategyEnum,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

import { getWebhookPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { UnExpectedHyperswitchPaymentStatus } from "@/errors";
import { getSaleorAmountFromHyperswitchAmount } from "../../hyperswitch/currencies";
import { callHyperswitchClient } from "../../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { intoPaymentResponse } from "../../hyperswitch/hyperswitch-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import {
  SyncWebhookAppErrors,
  TransactionProcessSessionResponse,
} from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";

export const hyperswitchPaymentIntentToTransactionProcessResult = (
  status: string,
  transactionFlow: TransactionFlowStrategyEnum,
): TransactionProcessSessionResponse["result"] => {
  const prefix =
    transactionFlow === TransactionFlowStrategyEnum.Authorization
      ? "AUTHORIZATION"
      : transactionFlow === TransactionFlowStrategyEnum.Charge
        ? "CHARGE"
        : null;

  invariant(prefix, `Unsupported transactionFlowStrategy: ${transactionFlow}`);

  switch (status) {
    case "succeeded":
    case "partially_captured_and_capturable":
    case "partially_captured":
      return `${prefix}_SUCCESS`;
    case "failed":
    case "cancelled":
      return `${prefix}_FAILURE`;
    case "requires_capture":
      return "AUTHORIZATION_SUCCESS";
    case "requires_payment_method":
    case "requires_customer_action":
    case "requires_confirmation":
      return `${prefix}_ACTION_REQUIRED`;
    case "processing":
      return `${prefix}_REQUEST`;
    default:
      throw new UnExpectedHyperswitchPaymentStatus(
        `Status received from hyperswitch: ${status}, is not expected . Please check the payment flow.`,
      );
  }
};

export const TransactionProcessSessionHyperswitchWebhookHandler = async (
  event: TransactionProcessSessionEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
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
  const errors: SyncWebhookAppErrors = [];
  const channelId = event.sourceObject.channel.id;

  const resource_id: paymentsComponents["schemas"]["PaymentIdType"] = {
    PaymentIntentId: event.transaction.pspReference,
  };

  const capture_method =
    event.action.actionType == TransactionFlowStrategyEnum.Authorization ? "manual" : "automatic";

  const retrievePaymentPayload: paymentsComponents["schemas"]["PaymentsRetrieveRequest"] = {
    force_sync: true,
    resource_id,
  };

  const payment_id = event.transaction.pspReference;

  const retrievePaymentResponse = await callHyperswitchClient({
    configData,
    targetPath: `/payments/${payment_id}`,
    method: "GET",
    body: JSON.stringify(retrievePaymentPayload),
  });
  logger.info("Successfully called hyperswitch client for transaction process session.");

  const retrievePaymentResponseData = intoPaymentResponse(retrievePaymentResponse);
  logger.info({
    payload: redactLogObject(retrievePaymentResponseData),
    message: "Creating payment successful",
  });

  const result = hyperswitchPaymentIntentToTransactionProcessResult(
    retrievePaymentResponseData.status,
    event.action.actionType,
  );
  const transactionProcessSessionResponse: TransactionProcessSessionResponse = {
    data: {
      errors,
    },
    pspReference: retrievePaymentResponseData.payment_id,
    result,
    amount: getSaleorAmountFromHyperswitchAmount(
      retrievePaymentResponseData.amount,
      retrievePaymentResponseData.currency,
    ),
    time: new Date().toISOString(),
  };
  return transactionProcessSessionResponse;
};
