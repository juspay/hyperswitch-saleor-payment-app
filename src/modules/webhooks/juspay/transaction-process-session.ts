import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import {
  TransactionFlowStrategyEnum,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

import { UnExpectedHyperswitchPaymentStatus } from "@/errors";
import { callJuspayClient } from "@/modules/juspay/juspay-api";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { intoOrderStatusResponse } from "@/modules/juspay/juspay-api-response";
import {
  SyncWebhookAppErrors,
  TransactionProcessSessionResponse,
} from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";

export const juspayOrderStatusResult = (
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
    case "SUCCESS":
    case "PARTIAL_CHARGED":
    case "AUTO_REFUNDED":
    case "VOIDED":
    case "COD_INITIATED":
    case "CHARGED":
      return `${prefix}_SUCCESS`;
    case "DECLINED":
    case "ERROR":
    case "NOT_FOUND":
    case "VOID_FAILED":
    case "CAPTURE_FAILED":
    case "AUTHORIZATION_FAILED":
    case "JUSPAY_DECLINED":
    case "AUTHENTICATION_FAILED":
      return `${prefix}_FAILURE`;
    case "CAPTURE_INITIATED":
    case "AUTHORIZED":
    case "VOID_INITIATED":
      return "AUTHORIZATION_SUCCESS";
    case "NEW":
    case "CREATED":
    case "PENDING_AUTHENTICATION":
    case "PENDING_VBV":
      return `${prefix}_ACTION_REQUIRED`;
    case "AUTHORIZING":
      return `${prefix}_REQUEST`;
    default:
      throw new UnExpectedHyperswitchPaymentStatus(
        `Status received from juspay: ${status}, is not expected . Please check the payment flow.`,
      );
  }
};

export const TransactionProcessSessionJuspayWebhookHandler = async (
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
  const errors: SyncWebhookAppErrors = [];

  let order_id = event.transaction.pspReference;
  const orderStatusResponse = await callJuspayClient({
    configData,
    targetPath: `/orders/${order_id}`,
    method: "GET",
    body: undefined,
  });

  const parsedOrderStatusRespData = intoOrderStatusResponse(orderStatusResponse);
  invariant(
    parsedOrderStatusRespData.order_id && parsedOrderStatusRespData.amount,
    `Required fields not found session call response`,
  );
  const result = juspayOrderStatusResult(parsedOrderStatusRespData.status, event.action.actionType);
  const transactionProcessSessionResponse: TransactionProcessSessionResponse = {
    data: {
      errors,
    },
    pspReference: parsedOrderStatusRespData.order_id,
    result,
    amount: parsedOrderStatusRespData.amount,
    time: new Date().toISOString(),
  };
  return transactionProcessSessionResponse;
};
