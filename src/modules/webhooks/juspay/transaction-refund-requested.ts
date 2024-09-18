import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import { TransactionRefundRequestedEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { callJuspayClient } from "@/modules/juspay/juspay-api";
import { type components as paymentsComponents } from "generated/juspay-payments";
import { intoRefundResponse } from "../../juspay/juspay-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { v4 as uuidv4 } from "uuid";
import { TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";

export const juspayRefundToTransactionResult = (
  status: string,
): TransactionRefundRequestedResponse["result"] | null => {
  switch (status) {
    case "SUCCESS":
    case "CHARGED":
      return "REFUND_SUCCESS";
    case "FAILURE":
      return "REFUND_FAILURE";
    case "PENDING":
    case "MANUAL_REVIEW":
      return undefined;
    default:
      return null;
  }
};

export const TransactionRefundRequestedJuspayWebhookHandler = async (
  event: TransactionRefundRequestedEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
): Promise<TransactionRefundRequestedResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionRefundRequestedWebhookHandler] " },
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
  invariant(event.transaction, "Missing sourceObject");
  const sourceObject = event.transaction.sourceObject;
  invariant(sourceObject?.total.gross.currency, "Missing Currency");
  const order_id = event.transaction.pspReference;
  const unique_request_id = uuidv4();

  const refundPayload: paymentsComponents["schemas"]["RefundReq"] = {
    unique_request_id,
    amount: event.action.amount,
  };

  const refundPaymentResponse = await callJuspayClient({
    configData,
    targetPath: `/orders/${order_id}/refunds`,
    method: "POST",
    body: JSON.stringify(refundPayload),
  });

  const refundPaymentResponseData = intoRefundResponse(refundPaymentResponse);
  let refundStatus = null;
  let refundAmount = null;
  const refundsList = refundPaymentResponseData.refunds;
  invariant(refundsList, "No refunds list in response");
  for (const obj1 of refundsList) {
    if (obj1.unique_request_id === unique_request_id) {
      refundStatus = obj1.status;
      refundAmount = obj1.amount;
    }
  }
  invariant(refundStatus && refundAmount, "No refunds data found with matched refund requested");

  const result = juspayRefundToTransactionResult(refundStatus);

  const transactionRefundRequestedResponse: TransactionRefundRequestedResponse =
    result === undefined
      ? {
          pspReference: unique_request_id,
          message: "pending",
        }
      : result === null
        ? {
            pspReference: refundPaymentResponseData.order_id,
            message: `Unexpected status: ${refundPaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            pspReference: unique_request_id,
            result,
            amount: refundAmount,
          };
  return transactionRefundRequestedResponse;
};
