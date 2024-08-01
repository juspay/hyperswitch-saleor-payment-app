import {
    HyperswitchHttpClientError,
    UnExpectedHyperswitchPaymentStatus,
  } from "@/errors";
  import { createClient } from "@/lib/create-graphq-client";
  import { invariant } from "@/lib/invariant";
  import {
    intoRefundResponse,
    CaptureMethod,
    WebhookResponse,
    intoOrderStatusResponse,
  } from "@/modules/juspay/juspay-api-response";
  import {
    intoPaymentResponse,
    intoWebhookResponse,
  } from "@/modules/juspay/juspay-api-response";
  import { saleorApp } from "@/saleor-app";
  import {
    GetTransactionByIdDocument,
    GetTransactionByIdQuery,
    GetTransactionByIdQueryVariables,
    TransactionActionEnum,
    TransactionEventReportDocument,
    TransactionEventTypeEnum,
  } from "generated/graphql";
  import { NextApiRequest, NextApiResponse } from "next";
  import { getPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
  import {
    createHyperswitchClient,
    fetchHyperswitchPaymentResponseHashKey,
    createJuspayClient
  } from "@/modules/hyperswitch/hyperswitch-api";
  import crypto from "crypto";
  import { createLogger} from "@/lib/logger";
  import { ConfigObject } from "@/backend-lib/api-route-utils";
  import { env } from "@/lib/env.mjs";
  import CryptoJS from 'crypto-js';
  import { Buffer } from 'buffer';
  
  export const juspayStatusToSaleorTransactionResult = (
    status: string,
    isRefund: boolean,
    captureMethod: CaptureMethod | undefined | null,
    isChargeFlow: boolean | undefined,
  ): TransactionEventTypeEnum => {
    switch (status) {
      case "SUCCESS":
        if (isRefund) {
          return TransactionEventTypeEnum.RefundSuccess;
        } else {
          return TransactionEventTypeEnum.ChargeSuccess;
        }
      case "DECLINED":
      case "ERROR":
      case "NOT_FOUND":
        if (isRefund) {
          return TransactionEventTypeEnum.RefundFailure;
        } else if (captureMethod == "manual" && !isChargeFlow) {
          return TransactionEventTypeEnum.AuthorizationFailure;
        } else {
          return TransactionEventTypeEnum.ChargeFailure;
        }
      case "partially_captured_and_capturable":
      case "PARTIAL_CHARGED":
        return TransactionEventTypeEnum.ChargeSuccess;
      case "requires_capture":
        return TransactionEventTypeEnum.AuthorizationSuccess;
      case "VOIDED":
        return TransactionEventTypeEnum.CancelSuccess;
      case "requires_payment_method":
      case "requires_customer_action":
      case "requires_confirmation":
        if (captureMethod == "manual") {
          return TransactionEventTypeEnum.AuthorizationActionRequired;
        } else {
          return TransactionEventTypeEnum.ChargeActionRequired;
        }
      default:
        throw new UnExpectedHyperswitchPaymentStatus(
          `Status received from hyperswitch: ${status}, is not expected . Please check the payment flow.`,
        );
    }
  };
  
  export const verifyWebhookSource = (
    req: NextApiRequest,
    paymentResponseHashKey: string,
  ): boolean => {
    const authHeader = req.headers["authorization"];
    invariant(authHeader, "Failed fetching webhook auth header");
    const base64Creds = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Creds, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Check if the credentials match the stored username and password
    if (username === "" && password === "") {
      return true;
    } else {
      return false;
    }
  };
  
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
  
  export default async function hyperswitchAuthorizationWebhookHandler(
    req: NextApiRequest,
    res: NextApiResponse,
  ): Promise<void> {
    const logger = createLogger({ msgPrefix: "[HyperswitchWebhookHandler]" });
    let webhookBody = intoWebhookResponse(req.body);
  
    const transactionId = webhookBody.content.order.udf1;
    const saleorApiUrl = webhookBody.content.order.udf2;
    const isRefund = webhookBody.event_name === "ORDER_REFUNDED" || webhookBody.event_name === "ORDER_REFUND_FAILED";
    
    invariant(saleorApiUrl && transactionId, "user defined fields not found in webhook");

    const decryptSaleorApiUrl = CryptoJS.AES.decrypt(saleorApiUrl, env.ENCRYPT_KEY);
    const originalSaleorApiUrl = decryptSaleorApiUrl.toString(CryptoJS.enc.Utf8);
  
    const authData = await saleorApp.apl.get(originalSaleorApiUrl);
    if (authData === undefined) {
      res.status(401).json("Failed fetching auth data, check your Saleor API URL");
    }
    invariant(authData, "Failed fetching auth data");
    const client = createClient(originalSaleorApiUrl, async () => ({ token: authData?.token }));
    const transaction = await client
      .query<GetTransactionByIdQuery, GetTransactionByIdQueryVariables>(GetTransactionByIdDocument, {
        transactionId,
      })
      .toPromise();
  
    const sourceObject =
      transaction.data?.transaction?.checkout ?? transaction.data?.transaction?.order;
  
    let isChargeFlow = transaction.data?.transaction?.events.some(
      (event) => event.type === "AUTHORIZATION_SUCCESS",
    );
  
    invariant(sourceObject, "Missing Source Object");
  
    const configData: ConfigObject = {
      configurator: getPaymentAppConfigurator(client, originalSaleorApiUrl),
      channelId: sourceObject.channel.id,
    };
  
    let authHeader = null;
    try {
      authHeader = await fetchHyperswitchPaymentResponseHashKey(configData);
    } catch (errorData) {
      return res.status(406).json("Channel not assigned");
    }
  
    if (!verifyWebhookSource(req, authHeader)) {
      return res.status(400).json("Source Verification Failed");
    }
    logger.info("Webhook Source Verified");
    const order_id = webhookBody.content.order.order_id;
  
    let juspayClient = null;
    try {
      juspayClient = await createJuspayClient({
        configData,
      });
    } catch (errorData) {
      if (errorData instanceof HyperswitchHttpClientError && errorData.statusCode != undefined) {
        return res.status(errorData.statusCode).json(errorData.name);
      } else {
        return res.status(424).json("Sync called failed");
      }
    }
  
    let juspaySyncResponse = null;
    let pspReference = null;
    let amountVal = null;
    const captureMethod = webhookBody.content.order.udf3;
    let refundStatus = null
    
    const paymentSync = juspayClient.path("/orders/{order_id}").method("get").create();

    const paymentSyncResponse = await paymentSync({
    ...{},
    order_id,
    });
    juspaySyncResponse = intoOrderStatusResponse(paymentSyncResponse.data);

    if (isRefund){
       let eventArray = transaction.data?.transaction?.events;
       let refundList = webhookBody.content.order.refunds
       invariant(eventArray, "Missing event list from transaction event");
       invariant(refundList, "Missing refunds list in event");
       outerLoop: for (const obj1 of eventArray) {
        if (obj1.type === "REFUND_REQUEST") {
          for (const obj2 of refundList) {
            if (obj1.id === obj2.unique_request_id && obj2.status !== "PENDING") {
              amountVal = obj2.amount;
              pspReference = obj2.unique_request_id;
              break outerLoop;
            }
          }
        }
      }
    }
    else{
      pspReference = juspaySyncResponse.order_id;
      amountVal = juspaySyncResponse.amount;
    }
  
    const type = juspayStatusToSaleorTransactionResult(
      webhookBody.content.order.status,
      isRefund,
      captureMethod,
      isChargeFlow,
    );
    invariant(amountVal, "no amount value found");
    invariant(pspReference, "no values of pspReference found");
    await client
      .mutation(TransactionEventReportDocument, {
        transactionId,
        amount: amountVal,
        availableActions: getAvailableActions(type),
        externalUrl: "",
        time: new Date().toISOString(),
        type,
        pspReference,
        message: webhookBody.content.order.txn_detail?.error_message
          ? webhookBody.content.order.txn_detail?.error_message
          : "",
      })
      .toPromise();
  
    res.status(200).json("[OK]");
  }
  