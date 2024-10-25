import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import { TransactionRefundRequestedEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger, redactLogObject } from "@/lib/logger";
import {
  getHyperswitchAmountFromSaleorMoney,
  getSaleorAmountFromHyperswitchAmount,
} from "../../hyperswitch/currencies";
import { callHyperswitchClient } from "../../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { intoRefundResponse } from "../../hyperswitch/hyperswitch-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";

export type PaymentRefundResponse = {
  status: string;
};

export const hyperswitchRefundToTransactionResult = (
  status: string,
): TransactionRefundRequestedResponse["result"] | null => {
  switch (status) {
    case "succeeded":
      return "REFUND_SUCCESS";
    case "failed":
      return "REFUND_FAILURE";
    case "pending":
      return undefined;
    default:
      return null;
  }
};

export const TransactionRefundRequestedHyperswitchWebhookHandler = async (
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
  const amount = getHyperswitchAmountFromSaleorMoney(
    event.action.amount,
    sourceObject?.total.gross.currency,
  );
  const payment_id = event.transaction.pspReference;

  const refundPayload: paymentsComponents["schemas"]["RefundRequest"] = {
    payment_id,
    amount,
    metadata: {
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    },
  };

  logger.info({
    payload: redactLogObject(refundPayload),
    message: "Creating refund with payload",
  });
  const refundPaymentResponse = await callHyperswitchClient({
    configData,
    targetPath: "/refunds",
    method: "POST",
    body: JSON.stringify(refundPayload),
  });
  logger.info("Successfully called hyperswitch client for transaction refund request.");

  const refundPaymentResponseData = intoRefundResponse(refundPaymentResponse);
  logger.info({
    payload: redactLogObject(refundPaymentResponseData),
    message: "Refunds successful",
  });

  const result = hyperswitchRefundToTransactionResult(refundPaymentResponseData.status);

  const transactionRefundRequestedResponse: TransactionRefundRequestedResponse =
    result === undefined
      ? {
          pspReference: refundPaymentResponseData.refund_id,
          message: "pending",
        }
      : result === null
        ? {
            pspReference: refundPaymentResponseData.payment_id,
            message: `Unexpected status: ${refundPaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            pspReference: refundPaymentResponseData.refund_id,
            result,
            amount: getSaleorAmountFromHyperswitchAmount(
              refundPaymentResponseData.amount,
              refundPaymentResponseData.currency,
            ),
          };
  return transactionRefundRequestedResponse;
};
