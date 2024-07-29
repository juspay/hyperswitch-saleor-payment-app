import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import { type JuspayTransactionCancelationRequestedResponse } from "@/schemas/JuspayTransactionCancelationRequested/JuspayTransactionCancelationRequestedResponse.mjs";
import {
  type TransactionCancelationRequestedEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { createJuspayClient } from "../../hyperswitch/hyperswitch-api";
import { intoPreAuthTxnResponse} from "../../juspay/juspay-api-response";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { normalizeValue } from "../../payment-app-configuration/utils";
import { type components as paymentsComponents } from "generated/juspay-payments";

export const juspayPaymentCancelStatusToSaleorTransactionResult = (
  status: string,
): JuspayTransactionCancelationRequestedResponse["result"] | null => {
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

export const TransactionCancelationRequestedHyperswitchWebhookHandler = async (
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
  invariant(event.transaction, "Missing transaction");
  // Fetch Transaction Details
  invariant(event.transaction.sourceObject, "Missing sourceObject");

  

  const txn_uuid = event.transaction.pspReference;

  const juspayClient = await createJuspayClient({
    configData,
  });

  const cancelJuspayPayment = juspayClient
    .path("/v2/txns/{txn_uuid}/void")
    .method("post")
    .create();

  const preAuthVoidTxnPayload: paymentsComponents["schemas"]["PreAuthTxnRequest"] = {
    amount: "1.0",
    metadata: normalizeValue(""),
    idempotence_key: normalizeValue("")
  };

  const preAuthVoidTxnResponse = await cancelJuspayPayment(
    {...preAuthVoidTxnPayload,
      txn_uuid
    });

  const cancelPaymentResponseData = intoPreAuthTxnResponse(preAuthVoidTxnResponse.data);
  invariant(cancelPaymentResponseData.status && cancelPaymentResponseData.order_id && cancelPaymentResponseData.amount, `Required fields not found session call response`);
  const result = juspayPaymentCancelStatusToSaleorTransactionResult(
    cancelPaymentResponseData.status,
  );

  const transactionCancelationRequestedResponse: JuspayTransactionCancelationRequestedResponse =
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
            amount:cancelPaymentResponseData.amount,
          };

  return transactionCancelationRequestedResponse;
};
