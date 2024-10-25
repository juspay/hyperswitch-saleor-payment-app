import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import { type TransactionCancelationRequestedEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger, redactLogObject } from "@/lib/logger";
import { callHyperswitchClient } from "../../hyperswitch/hyperswitch-api";
import { getSaleorAmountFromHyperswitchAmount } from "../../hyperswitch/currencies";
import { intoPaymentResponse } from "../../hyperswitch/hyperswitch-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

export const hyperswitchPaymentCancelStatusToSaleorTransactionResult = (
  status: string,
): TransactionCancelationRequestedResponse["result"] | null => {
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

export const TransactionCancelationRequestedHyperswitchWebhookHandler = async (
  event: TransactionCancelationRequestedEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
): Promise<TransactionCancelationRequestedResponse> => {
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

  const cancelPaymentPayload = {
    metadata: {
      channel_id: sourceObject.channel.id,
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    },
  };

  const cancelPaymentResponse = await callHyperswitchClient({
    configData,
    targetPath: `/payments/${payment_id}/cancel`,
    method: "POST",
    body: JSON.stringify(cancelPaymentPayload),
  });
  logger.info("Successfully called hyperswitch client for transaction cancelation.");

  const cancelPaymentResponseData = intoPaymentResponse(cancelPaymentResponse);
  logger.info({
    payload: redactLogObject(cancelPaymentResponseData),
    message: "Creating cancel payment successful",
  });

  const result = hyperswitchPaymentCancelStatusToSaleorTransactionResult(
    cancelPaymentResponseData.status,
  );

  const transactionCancelationRequestedResponse: TransactionCancelationRequestedResponse =
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
