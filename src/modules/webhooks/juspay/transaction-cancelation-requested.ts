import { type TransactionCancelationRequestedEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { callJuspayClient } from "@/modules/juspay/juspay-api";
import { intoOrderStatusResponse, intoPreAuthTxnResponse } from "../../juspay/juspay-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

export const juspayPaymentCancelStatusToSaleorTransactionResult = (
  status: string,
): TransactionCancelationRequestedResponse["result"] | null => {
  switch (status) {
    case "VOIDED":
      return "CANCEL_SUCCESS";
    case "VOID_FAILED":
      return "CANCEL_FAILURE";
    case "VOID_INITIATED":
      return undefined;
    default:
      return null;
  }
};

export const TransactionCancelationRequestedJuspayWebhookHandler = async (
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
  invariant(event.transaction, "Missing transaction");
  // Fetch Transaction Details
  invariant(event.transaction.sourceObject, "Missing sourceObject");

  const order_id = event.transaction.pspReference;
  const orderStatusResponse = await callJuspayClient({
    configData,
    targetPath: `/orders/${order_id}`,
    method: "GET",
    body: undefined,
  });

  const parsedOrderStatusRespData = intoOrderStatusResponse(orderStatusResponse);

  const preAuthVoidTxnResponse = await callJuspayClient({
    configData,
    targetPath: `/v2/txns/${parsedOrderStatusRespData.txn_uuid}/void`,
    method: "POST",
    body: undefined,
  });

  invariant(parsedOrderStatusRespData.txn_uuid, `Txn_uuid not found in orderstatus response`);

  const cancelPaymentResponseData = intoPreAuthTxnResponse(preAuthVoidTxnResponse);
  invariant(
    cancelPaymentResponseData.status &&
      cancelPaymentResponseData.order_id &&
      cancelPaymentResponseData.amount,
    `Required fields not found session call response`,
  );
  const result = juspayPaymentCancelStatusToSaleorTransactionResult(
    cancelPaymentResponseData.status,
  );

  const transactionCancelationRequestedResponse: TransactionCancelationRequestedResponse =
    result === undefined
      ? {
          pspReference: cancelPaymentResponseData.order_id,
          message: "processing",
        }
      : result === null
        ? {
            pspReference: cancelPaymentResponseData.order_id,
            message: `Unexpected status: ${cancelPaymentResponseData.status} recieved from juspay. Please check the payment flow.`,
          }
        : {
            pspReference: cancelPaymentResponseData.order_id,
            result,
            amount: cancelPaymentResponseData.amount,
          };

  return transactionCancelationRequestedResponse;
};
