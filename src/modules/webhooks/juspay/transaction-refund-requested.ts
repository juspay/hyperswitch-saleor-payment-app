import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import {
  TransactionRefundRequestedEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type JuspayTransactionRefundRequestedResponse } from "@/schemas/JuspayTransactionRefundRequested/JuspayTransactionRefundRequestedResponse.mjs";
import { createJuspayClient } from "../../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/juspay-payments";
import { intoRefundResponse } from "../../juspay/juspay-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { normalizeValue } from "@/modules/payment-app-configuration/utils";
import { v4 as uuidv4 } from 'uuid';

export const juspayRefundToTransactionResult = (
  status: string,
): JuspayTransactionRefundRequestedResponse["result"] | null => {
  switch (status) {
    case "SUCCESS":
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
): Promise<JuspayTransactionRefundRequestedResponse> => {
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
  const channelId = sourceObject.channel.id;
  const juspayClient = await createJuspayClient({
    configData,
  });

  const refundJuspayPayment = juspayClient.path("/orders/{order_id}/refunds").method("post").create();
  const refundPayload: paymentsComponents["schemas"]["RefundReq"] = {
    unique_request_id: uuidv4(),
    amount: event.action.amount,
    metaData: normalizeValue(JSON.stringify({
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    })),
  };

  const refundPaymentResponse = await refundJuspayPayment({
    ...refundPayload,
    order_id,
  });

  const refundPaymentResponseData = intoRefundResponse(refundPaymentResponse.data);
  const result = juspayRefundToTransactionResult(refundPaymentResponseData.status);

  const transactionRefundRequestedResponse: JuspayTransactionRefundRequestedResponse =
    result === undefined
      ? {
          pspReference: refundPaymentResponseData.txnDetailId,
          message: "pending",
        }
      : result === null
        ? {
            pspReference: refundPaymentResponseData.uniqueRequestId,
            message: `Unexpected status: ${refundPaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            pspReference: refundPaymentResponseData.txnDetailId,
            result,
            amount: refundPaymentResponseData.amount,
          };
  return transactionRefundRequestedResponse;
};
