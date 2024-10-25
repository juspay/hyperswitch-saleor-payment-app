import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";

import { invariant } from "@/lib/invariant";
import { TransactionChargeRequestedEventFragment } from "generated/graphql";
import { intoOrderStatusResponse, intoPreAuthTxnResponse } from "../../juspay/juspay-api-response";
import { createLogger, redactLogObject } from "@/lib/logger";
import { callJuspayClient } from "@/modules/juspay/juspay-api";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { TransactionChargeRequestedResponse } from "@/schemas/TransactionChargeRequested/TransactionChargeRequestedResponse.mjs";

export const hyperswitchPaymentCaptureStatusToSaleorTransactionResult = (
  status: string,
): TransactionChargeRequestedResponse["result"] | null => {
  switch (status) {
    case "CHARGED":
    case "PARTIAL_CHARGED":
      return "CHARGE_SUCCESS";
    case "CAPTURE_FAILED":
      return "CHARGE_FAILURE";
    case "CAPTURE_INITIATED":
      return undefined;
    default:
      return null;
  }
};

export const TransactionChargeRequestedJuspayWebhookHandler = async (
  event: TransactionChargeRequestedEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
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
  invariant(event.transaction, "Missing transaction");

  // Fetch Transaction Details
  invariant(event.transaction.sourceObject, "Missing sourceObject");
  const sourceObject = event.transaction.sourceObject;
  invariant(sourceObject?.total.gross.currency, "Missing Currency");

  let order_id = event.transaction.pspReference;
  const orderStatusResponse = await callJuspayClient({
    configData,
    targetPath: `/orders/${order_id}`,
    method: "GET",
    body: undefined,
  });
  logger.info("Successfully called juspay client for orders retrieve");

  const parsedOrderStatusRespData = intoOrderStatusResponse(orderStatusResponse);
  logger.info({
    payload: redactLogObject(parsedOrderStatusRespData),
    message: "Orders retrieve successful",
  });

  invariant(parsedOrderStatusRespData.txn_uuid, `Txn_uuid not found in orderstatus response`);

  const capturePaymentResponse = await callJuspayClient({
    configData,
    targetPath: `/v2/txns/${parsedOrderStatusRespData.txn_uuid}/capture`,
    method: "POST",
    body: undefined,
  });
  logger.info("Successfully called juspay client for transaction charge.");

  const capturePaymentResponseData = intoPreAuthTxnResponse(capturePaymentResponse);
  logger.info({
    payload: redactLogObject(capturePaymentResponseData),
    message: "Charge transaction successful",
  });

  invariant(
    capturePaymentResponseData.status &&
      capturePaymentResponseData.order_id &&
      capturePaymentResponseData.amount,
    `Required fields not found session call response`,
  );
  const result = hyperswitchPaymentCaptureStatusToSaleorTransactionResult(
    capturePaymentResponseData.status,
  );
  const transactionChargeRequestedResponse: TransactionChargeRequestedResponse =
    result === undefined
      ? {
          pspReference: capturePaymentResponseData.order_id,
          message: "processing",
        }
      : result === null
        ? {
            pspReference: capturePaymentResponseData.order_id,
            message: `Unexpected status: ${capturePaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            result,
            pspReference: capturePaymentResponseData.order_id,
            amount: capturePaymentResponseData.amount,
          };
  return transactionChargeRequestedResponse;
};
