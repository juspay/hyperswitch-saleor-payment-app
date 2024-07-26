import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import { type JuspayTransactionCancelationRequestedResponse } from "@/schemas/JuspayTransactionCancelationRequested/JuspayTransactionCancelationRequestedResponse.mjs";
import {
  type TransactionCancelationRequestedEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { createHyperswitchClient, createJuspayClient } from "../../hyperswitch/hyperswitch-api";
import {
  getSaleorAmountFromHyperswitchAmount,
} from "../../hyperswitch/currencies";
import { intoPaymentResponse } from "../../hyperswitch/hyperswitch-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";

export const juspayPaymentCancelStatusToSaleorTransactionResult = (
  status: string,
): JuspayTransactionCancelationRequestedResponse["result"] | null => {
  switch (status) {
    case "cancelled":
      return "CANCEL_SUCCESS";
    case "failed":
      return "CANCEL_FAILURE";
    case "processing":
      return undefined;
    default:
      return null;
  }
};

export const TransactionCancelationRequestedJuspayWebhookHandler = async (
  event: TransactionCancelationRequestedEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
): Promise<JuspayTransactionCancelationRequestedResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionCancelationRequestedWebhookHandler] " },
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
  invariant(event.transaction, "Missing transaction");
  // Fetch Transaction Details
  invariant(event.transaction.sourceObject, "Missing sourceObject");
  const sourceObject = event.transaction.sourceObject;
  const payment_id = event.transaction.pspReference;
  const channelId = sourceObject.channel.id;

  const juspayClient = await createJuspayClient({
    configData,
  });

  const cancelJuspayPayment = juspayClient
    .path("/v2/txns/{txn_uuid}/void")
    .method("post")
    .create();

  const cancelPaymentResponse = await cancelJuspayPayment({
    ...{
      metadata: {
        channel_id: sourceObject.channel.id,
        transaction_id: event.transaction.id,
        saleor_api_url: saleorApiUrl,
      },
    },
    payment_id,
  });

  const cancelPaymentResponseData = intoPaymentResponse(cancelPaymentResponse.data);
  const result = juspayPaymentCancelStatusToSaleorTransactionResult(
    cancelPaymentResponseData.status,
  );

  const transactionCancelationRequestedResponse: JuspayTransactionCancelationRequestedResponse =
    result === undefined
      ? {
          pspReference: cancelPaymentResponseData.payment_id,
          message: "processing",
        }
      : result === null
        ? {
            pspReference: cancelPaymentResponseData.payment_id,
            message: `Unexpected status: ${cancelPaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            pspReference: cancelPaymentResponseData.payment_id,
            result,
            amount: getSaleorAmountFromHyperswitchAmount(
              cancelPaymentResponseData.amount,
              cancelPaymentResponseData.currency,
            ),
          };

  return transactionCancelationRequestedResponse;
};
