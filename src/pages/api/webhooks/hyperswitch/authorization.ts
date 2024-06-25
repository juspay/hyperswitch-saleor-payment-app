import { ChannelNotConfigured, UnsupportedEvent } from "@/errors";
import { headers } from "next/headers";
import { createClient } from "@/lib/create-graphq-client";
import { invariant } from "@/lib/invariant";
import {
  intoPaymentResponse,
  intoRefundResponse,
  intoWebhookResponse,
  WebhookResponse,
} from "@/modules/hyperswitch/hyperswitch-api-response";
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
import { Event } from "../../../../../generated/graphql";
import { getPaymentAppConfigurator } from "@/modules/payment-app-configuration/payment-app-configuration-factory";
import { getConfigurationForChannel } from "@/modules/payment-app-configuration/payment-app-configuration";
import { paymentAppFullyConfiguredEntrySchema } from "@/modules/payment-app-configuration/config-entry";
import { createHyperswitchClient } from "@/modules/hyperswitch/hyperswitch-api";
import { getSaleorAmountFromHyperswitchAmount } from "@/modules/hyperswitch/currencies";
import crypto from "crypto";
import { result } from "lodash-es";
import { createLogger, logger } from "@/lib/logger";

export const hyperswitchStatusToSaleorTransactionResult = (
  status: string,
  isRefund: boolean,
): TransactionEventTypeEnum => {
  switch (status) {
    case "succeeded":
      if (isRefund) {
        return TransactionEventTypeEnum.RefundSuccess;
      } else {
        return TransactionEventTypeEnum.ChargeSuccess;
      }
    case "failed":
      if (isRefund) {
        return TransactionEventTypeEnum.RefundFailure;
      } else {
        return TransactionEventTypeEnum.ChargeFailure;
      }
    case "requires_capture":
      return TransactionEventTypeEnum.AuthorizationSuccess;
    case "cancelled":
      return TransactionEventTypeEnum.CancelSuccess;
    case "requires_payment_method":
    case "requires_customer_action":
    case "requires_confirmation":
      return TransactionEventTypeEnum.AuthorizationActionRequired;
    default:
      throw new UnsupportedEvent("This Event is not supported");
  }
};

export const verifyWebhookSource = (
  signature: string | string[],
  req: NextApiRequest,
  paymentResponseHashKey: string,
): boolean => {
  const hmac = crypto.createHmac("sha512", paymentResponseHashKey);
  hmac.update(JSON.stringify(req.body));
  const computedHash = hmac.digest("hex");
  if (Array.isArray(signature)) {
    // If signature is an array, check if the computed hash matches any element in the array
    return signature.includes(computedHash);
  } else {
    // If signature is a string, directly compare with the computed hash
    return computedHash === signature;
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

export const getRefundId = (webhookBody: WebhookResponse): string => {
  invariant(webhookBody.content.object.refund_id, "No Refund Id");
  return webhookBody.content.object.refund_id;
};

export default async function hyperswitchAuthorizationWebhookHandler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const logger = createLogger({ msgPrefix: "[HyperswitchWebhookHandler]" });

  console.log(req.headers["x-webhook-signature-512"]);
  const signature = req.headers["x-webhook-signature-512"];
  invariant(signature, "Failed fetching webhook signature");
  let webhookBody = intoWebhookResponse(req.body);

  const transactionId = webhookBody.content.object.metadata.transaction_id;
  const saleorApiUrl = webhookBody.content.object.metadata.saleor_api_url;
  const isRefund = webhookBody.content.type === "refund_details";

  const authData = await saleorApp.apl.get(saleorApiUrl);
  if (authData === undefined) {
    res.status(401).json("Failed fetching auth data, check your Saleor API URL");
  }

  invariant(authData, "Failed fetching auth data");
  const client = createClient(saleorApiUrl, async () => ({ token: authData?.token }));
  const transaction = await client
    .query<GetTransactionByIdQuery, GetTransactionByIdQueryVariables>(GetTransactionByIdDocument, {
      transactionId,
    })
    .toPromise();

  const sourceObject =
    transaction.data?.transaction?.checkout ?? transaction.data?.transaction?.order;

  const configurator = getPaymentAppConfigurator(client, saleorApiUrl);
  const appConfig = await configurator.getConfig();
  const appChannelConfig = getConfigurationForChannel(appConfig, sourceObject?.channel.id);

  if (appChannelConfig == null) {
    return res.status(401).json("Channel Not Configured");
  }

  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  const paymentResponseHashKey = HyperswitchConfig.paymentResponseHashKey;
  if (!verifyWebhookSource(signature, req, paymentResponseHashKey)) {
    return res.status(401).json("Source Verification Failed");
  }
  logger.info("Webhook Source Verified");
  const payment_id = webhookBody.content.object.payment_id;
  const refund_id = webhookBody.content.object.refund_id;
  const hyperswitchClient = createHyperswitchClient({
    apiKey: HyperswitchConfig.apiKey,
  });

  let hyperswitchSyncResponse = null;
  let pspReference = null;
  if (isRefund) {
    const paymentSync = hyperswitchClient.path("/refunds/{refund_id}").method("get").create();

    invariant(refund_id, "Missing refund id");

    const refundSyncResponse = await paymentSync({
      ...{},
      refund_id,
    });
    hyperswitchSyncResponse = intoRefundResponse(refundSyncResponse.data);
    pspReference = hyperswitchSyncResponse.refund_id;
  } else {
    const paymentSync = hyperswitchClient.path("/payments/{payment_id}").method("get").create();

    const paymentSyncResponse = await paymentSync({
      ...{},
      payment_id,
    });
    hyperswitchSyncResponse = intoPaymentResponse(paymentSyncResponse.data);
    pspReference = hyperswitchSyncResponse.payment_id;
  }

  const type = hyperswitchStatusToSaleorTransactionResult(
    webhookBody.content.object.status,
    isRefund,
  );
  await client
    .mutation(TransactionEventReportDocument, {
      transactionId,
      amount: getSaleorAmountFromHyperswitchAmount(
        hyperswitchSyncResponse.amount,
        hyperswitchSyncResponse.currency,
      ),
      availableActions: getAvailableActions(type),
      externalUrl: "",
      time: new Date().toISOString(),
      type,
      pspReference: isRefund ? getRefundId(webhookBody) : webhookBody.content.object.payment_id,
      message: "",
    })
    .toPromise();

  res.status(200).json("[OK]");
}
