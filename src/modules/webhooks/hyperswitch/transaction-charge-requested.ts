import { getConfigurationForChannel } from "../../payment-app-configuration/payment-app-configuration";
import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";

import { invariant } from "@/lib/invariant";
import { TransactionChargeRequestedEventFragment } from "generated/graphql";
import { intoPaymentResponse } from "../../hyperswitch/hyperswitch-api-response";
import { createLogger } from "@/lib/logger";
import {
  getHyperswitchAmountFromSaleorMoney,
  getSaleorAmountFromHyperswitchAmount,
} from "../../hyperswitch/currencies";
import { callHyperswitchClient } from "../../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { SyncWebhookAppErrors } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { TransactionChargeRequestedResponse } from "@/schemas/TransactionChargeRequested/TransactionChargeRequestedResponse.mjs";

export const hyperswitchPaymentCaptureStatusToSaleorTransactionResult = (
  status: string,
): TransactionChargeRequestedResponse["result"] | null => {
  switch (status) {
    case "succeeded":
    case "partially_captured":
    case "partially_captured_and_capturable":
      return "CHARGE_SUCCESS";
    case "failed":
      return "CHARGE_FAILURE";
    case "processing":
      return undefined;
    default:
      return null;
  }
};

export const TransactionChargeRequestedHyperswitchWebhookHandler = async (
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
  const amount_to_capture = getHyperswitchAmountFromSaleorMoney(
    event.action.amount,
    sourceObject?.total.gross.currency,
  );
  const payment_id = event.transaction.pspReference;
  const capturePaymentPayload: paymentsComponents["schemas"]["PaymentsCaptureRequest"] = {
    amount_to_capture,
  };

  const capturePaymentResponse = await callHyperswitchClient({
    configData,
    targetPath: `/payments/${payment_id}/capture`,
    method: "POST",
    body: JSON.stringify(capturePaymentPayload),
  });

  logger.info("Successfully called hyperswitch client for transaction charge.");

  const capturePaymentResponseData = intoPaymentResponse(capturePaymentResponse);
  const result = hyperswitchPaymentCaptureStatusToSaleorTransactionResult(
    capturePaymentResponseData.status,
  );
  const transactionChargeRequestedResponse: TransactionChargeRequestedResponse =
    result === undefined
      ? {
          pspReference: capturePaymentResponseData.payment_id,
          message: "processing",
        }
      : result === null
        ? {
            pspReference: capturePaymentResponseData.payment_id,
            message: `Unexpected status: ${capturePaymentResponseData.status} recieved from hyperswitch. Please check the payment flow.`,
          }
        : {
            result,
            pspReference: capturePaymentResponseData.payment_id,
            amount: getSaleorAmountFromHyperswitchAmount(
              capturePaymentResponseData.amount,
              capturePaymentResponseData.currency,
            ),
          };
  return transactionChargeRequestedResponse;
};
