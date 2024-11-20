import { HyperswitchHttpClientError, UnExpectedJuspayPaymentStatus } from "@/errors";
import { createClient } from "@/lib/create-graphq-client";
import { invariant } from "@/lib/invariant";
import {
  CaptureMethod,
  intoOrderStatusResponse,
  JuspaySupportedEvents,
  JuspayRefundEvents,
} from "@/modules/juspay/juspay-api-response";
import { intoWebhookResponse, parseWebhookEvent } from "@/modules/juspay/juspay-api-response";
import { saleorApp } from "@/saleor-app";
import {
  GetTransactionByIdDocument,
  GetTransactionByIdQuery,
  GetTransactionByIdQueryVariables,
  TransactionActionEnum,
  TransactionEvent,
  TransactionEventReportDocument,
  TransactionEventTypeEnum,
} from "generated/graphql";
import { NextApiRequest, NextApiResponse } from "next";
import { getPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import {
  callJuspayClient,
  fetchJuspayPassword,
  fetchJuspayUsername,
} from "@/modules/juspay/juspay-api";
import { createLogger, redactLogObject } from "@/lib/logger";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import { Buffer } from "buffer";

export const juspayStatusToSaleorTransactionResult = (
  status: string,
  isRefund: boolean,
  captureMethod: CaptureMethod | undefined | null,
  isChargeFlow: boolean | undefined,
): TransactionEventTypeEnum => {
  switch (status) {
    case "SUCCESS":
    case "CHARGED":
    case "COD_INITIATED":
    case "AUTO_REFUNDED":
      if (isRefund) {
        return TransactionEventTypeEnum.RefundSuccess;
      } else {
        return TransactionEventTypeEnum.ChargeSuccess;
      }
    case "AUTO_REFUND_REQUEST":
      return TransactionEventTypeEnum.RefundRequest;
    case "AUTO_REFUND_FAILED":
      return TransactionEventTypeEnum.RefundFailure;
    case "DECLINED":
    case "ERROR":
    case "NOT_FOUND":
    case "CAPTURE_FAILED":
    case "AUTHORIZATION_FAILED":
    case "AUTHENTICATION_FAILED":
    case "JUSPAY_DECLINED":
    case "FAILURE":
      if (isRefund) {
        return TransactionEventTypeEnum.RefundFailure;
      } else if (captureMethod == "manual" && !isChargeFlow) {
        return TransactionEventTypeEnum.AuthorizationFailure;
      } else {
        return TransactionEventTypeEnum.ChargeFailure;
      }
    case "VOID_FAILED":
      return TransactionEventTypeEnum.CancelFailure;
    case "PARTIAL_CHARGED":
      return TransactionEventTypeEnum.ChargeSuccess;
    case "AUTHORIZED":
    case "CAPTURE_INITIATED":
      return TransactionEventTypeEnum.AuthorizationSuccess;
    case "VOIDED":
      return TransactionEventTypeEnum.CancelSuccess;
    case "PENDING_AUTHENTICATION":
    case "PENDING_VBV":
    case "AUTHORIZING":
      if (captureMethod == "manual") {
        return TransactionEventTypeEnum.AuthorizationActionRequired;
      } else {
        return TransactionEventTypeEnum.ChargeActionRequired;
      }
    default:
      throw new UnExpectedJuspayPaymentStatus(
        `Status received from juspay: ${status}, is not expected . Please check the payment flow.`,
      );
  }
};

export const verifyWebhookSource = (
  req: NextApiRequest,
  configuredUserName: string,
  configuredPassword: string,
): boolean => {
  const authHeader = req.headers["authorization"];
  invariant(authHeader, "Failed fetching webhook auth header");
  const base64Creds = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Creds, "base64").toString("ascii");
  const [username, password] = credentials.split(":");
  if (username === configuredUserName && password === configuredPassword) {
    return true;
  } else {
    return false;
  }
};

export function hasChargeSuccess(events: Partial<TransactionEvent>[]): boolean {
  return events.some((event) => event.type === "CHARGE_SUCCESS");
}

const getAvailableActions = (
  transactionType: TransactionEventTypeEnum,
): TransactionActionEnum[] => {
  switch (transactionType) {
    case TransactionEventTypeEnum.AuthorizationSuccess:
      return [TransactionActionEnum.Cancel, TransactionActionEnum.Charge];
    case TransactionEventTypeEnum.ChargeSuccess:
      return [TransactionActionEnum.Refund];
    default:
      return [];
  }
};

function getEventMessage(errorMessage: string | undefined, webhookEvent: string): string {
  if (!errorMessage || errorMessage === "") {
    return webhookEvent.replace(/_/g, " ");
  }
  return errorMessage;
}

export default async function juspayAuthorizationWebhookHandler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const logger = createLogger({ msgPrefix: "[JuspayWebhookHandler]" });
  logger.info("Received Webhook from Juspay");

  try {
    const webhookEvent = parseWebhookEvent(req.body).event_name;
    logger.info(`${webhookEvent} Event received from Juspay`);

    if (!JuspaySupportedEvents.safeParse(webhookEvent).success) {
      return res.status(200).json("[OK]");
    }
    const webhookBody = intoWebhookResponse(req.body);
    logger.info({
      payload: redactLogObject(webhookBody),
      message: "Webhook body received",
    });

    const {
      udf1: transactionId,
      udf2: saleorApiUrl,
      udf3: captureMethod,
    } = webhookBody.content.order;
    const isRefund = JuspayRefundEvents.safeParse(webhookEvent).success;

    invariant(
      saleorApiUrl && transactionId && captureMethod,
      "User-defined fields not found in webhook",
    );

    const originalSaleorApiUrl = atob(saleorApiUrl);
    const originalSaleorTransactionId = atob(transactionId);

    const authData = await saleorApp.apl.get(originalSaleorApiUrl);
    if (!authData) {
      return res.status(401).json("Failed fetching auth data, check your Saleor API URL");
    }

    const client = createClient(originalSaleorApiUrl, async () => ({ token: authData.token }));
    const transaction = await client
      .query<
        GetTransactionByIdQuery,
        GetTransactionByIdQueryVariables
      >(GetTransactionByIdDocument, { transactionId: originalSaleorTransactionId })
      .toPromise();

    logger.info("Called Saleor Client Successfully");

    const sourceObject =
      transaction.data?.transaction?.checkout ?? transaction.data?.transaction?.order;
    const isChargeFlow = transaction.data?.transaction?.events.some(
      (event) => event.type === "AUTHORIZATION_SUCCESS",
    );

    invariant(sourceObject, "Missing Source Object");

    const configData: ConfigObject = {
      configurator: getPaymentAppConfigurator(client, originalSaleorApiUrl),
      channelId: sourceObject.channel.id,
    };

    const juspayUsername = await fetchJuspayUsername(configData);
    const juspayPassword = await fetchJuspayPassword(configData);

    if (!verifyWebhookSource(req, juspayUsername, juspayPassword)) {
      logger.info("Source Verification Failed");
      return res.status(400).json("Source Verification Failed");
    }

    logger.info("Source Verification Successful");

    const order_id = webhookBody.content.order.order_id;
    let paymentSyncResponse;

    try {
      paymentSyncResponse = await callJuspayClient({
        configData,
        targetPath: `/orders/${order_id}`,
        method: "GET",
        body: undefined,
      });
    } catch (errorData) {
      if (errorData instanceof HyperswitchHttpClientError && errorData.statusCode) {
        return res.status(errorData.statusCode).json(errorData.name);
      }
      return res.status(424).json("Sync call failed");
    }
    logger.info("Successfully retrieved status from Juspay");

    const juspaySyncResponse = intoOrderStatusResponse(paymentSyncResponse);
    logger.info({
      payload: redactLogObject(juspaySyncResponse),
      message: "Order retrieved successful",
    });

    let {
      status: orderStatus,
      amount: amountVal,
      order_id: pspReference,
      refunds: refundList,
    } = juspaySyncResponse;

    invariant(pspReference, "No order id found in sync response");

    if (isRefund) {
      const eventArray = transaction.data?.transaction?.events;
      invariant(eventArray, "Missing event list from transaction");
      invariant(refundList, "Missing refunds list in Juspay response");

      if (orderStatus === "AUTO_REFUNDED") {
        amountVal = juspaySyncResponse.amount;
        if (!hasChargeSuccess(eventArray)) {
          await client
            .mutation(TransactionEventReportDocument, {
              transactionId: originalSaleorTransactionId,
              amount: amountVal,
              availableActions: [TransactionActionEnum.Refund],
              externalUrl: "",
              time: new Date().toISOString(),
              type: TransactionEventTypeEnum.ChargeSuccess,
              pspReference: order_id,
              message: "Charged amount marked as conflicted, refund initiated by Juspay.",
            })
            .toPromise();
        }
        for (const refundObj of refundList) {
          let foundMatch = false;
          for (const eventObj of eventArray) {
            if (refundObj.unique_request_id == eventObj.pspReference) {
              foundMatch = true;
              break;
            }
          }
          if (!foundMatch) {
            amountVal = refundObj.amount;
            pspReference = refundObj.unique_request_id;
            orderStatus = refundObj.status;
            break;
          }
        }
      } else {
        for (const eventObj of eventArray) {
          if (eventObj.type === "REFUND_REQUEST") {
            for (const refundObj of refundList) {
              if (
                eventObj.pspReference === refundObj.unique_request_id &&
                refundObj.status !== "PENDING"
              ) {
                amountVal = refundObj.amount;
                pspReference = refundObj.unique_request_id;
                orderStatus = refundObj.status;
                break;
              }
            }
          }
        }
      }
    }

    invariant(amountVal, "No amount value found");
    invariant(orderStatus, "No status value found");

    const type = juspayStatusToSaleorTransactionResult(
      orderStatus,
      isRefund,
      captureMethod,
      isChargeFlow,
    );

    await client
      .mutation(TransactionEventReportDocument, {
        transactionId: originalSaleorTransactionId,
        amount: amountVal,
        availableActions: getAvailableActions(type),
        externalUrl: "",
        time: new Date().toISOString(),
        type,
        pspReference,
        message: getEventMessage(webhookBody.content.order.txn_detail?.error_message, webhookEvent),
      })
      .toPromise();

    logger.info("Updated status successfully");
    res.status(200).json("[OK]");
  } catch (error) {
    logger.info(`Deserialization Error: ${error} \n Juspay Webhook body: ${req.body}`);
    res.status(500).json("Deserialization Error");
  }
}
