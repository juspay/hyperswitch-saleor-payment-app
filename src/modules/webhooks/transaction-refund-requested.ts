
import { getWebhookPaymentAppConfigurator } from "../payment-app-configuration/payment-app-configuration-factory";
import { paymentAppFullyConfiguredEntrySchema } from "../payment-app-configuration/config-entry";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import { GetTransactionByIdDocument, GetTransactionByIdQuery, GetTransactionByIdQueryVariables, TransactionFlowStrategyEnum, TransactionRefundRequestedEventFragment, type TransactionInitializeSessionEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import {type TransactionRefundRequestedResponse} from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";
import { saleorApp } from "@/saleor-app";
import { createClient } from "@/lib/create-graphq-client";
import { getHyperswitchAmountFromSaleorMoney, getSaleorAmountFromHyperswitchAmount } from "../hyperswitch/currencies";
import { ChannelNotConfigured } from "@/errors";
import { createHyperswitchClient } from "../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { intoRefundResponse } from "../hyperswitch/hyperswitch-api-response";


export type PaymentRefundResponse =  {
  status: string,
}

export const hyperswitchRefundToTransactionResult = (
  status: string,
): TransactionRefundRequestedResponse["result"] => {
  switch (status) {
    case "succeeded":
      return "REFUND_SUCCESS"
    case "failed": 
      return "REFUND_FAILURE"
    default:
      return undefined
  }
};


export const TransactionRefundRequestedWebhookHandler = async (
  event: TransactionRefundRequestedEventFragment,
  saleorApiUrl: string,
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
  const appConfig = await configurator.getConfig();
  invariant(event.transaction, "Missing transaction");
  const authData = await saleorApp.apl.get(saleorApiUrl);
  invariant(authData, "Failed fetching auth data");

  // Fetch Transaction Details
  // const client = createClient(saleorApiUrl, async () => ({ token: authData?.token }));
  // const transaction = await client
  //   .query<GetTransactionByIdQuery, GetTransactionByIdQueryVariables>(GetTransactionByIdDocument, {
  //     transactionId: event.transaction.id,
  //   })
  //   .toPromise();
  invariant(event.transaction, "Missing sourceObject");
  const sourceObject = event.transaction.sourceObject
  invariant(sourceObject?.total.gross.currency, "Missing Currency");
  const amount = getHyperswitchAmountFromSaleorMoney(
    event.action.amount,
    sourceObject?.total.gross.currency,
  );
  const payment_id = event.transaction.pspReference;
  const appChannelConfig = getConfigurationForChannel(appConfig, sourceObject.channel.id);
  if (appChannelConfig == null) {
    throw new ChannelNotConfigured("Please assign a channel for your configuration");
  }
  const HyperswitchConfig = paymentAppFullyConfiguredEntrySchema.parse(appChannelConfig);
  const HyperswitchClient = createHyperswitchClient({
    apiKey: HyperswitchConfig.apiKey,
  });
  const refundHyperswitchPayment = HyperswitchClient
    .path("/refunds")
    .method("post")
    .create();
    
  const refundPayload: paymentsComponents["schemas"]["RefundRequest"] = {
    payment_id,
    amount,
    metadata: {
      channel_id: sourceObject.channel.id,
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    },
  };

  const refundPaymentResponse = await refundHyperswitchPayment(refundPayload);

  const refundPaymentResponseData = intoRefundResponse(refundPaymentResponse.data);
  const result = hyperswitchRefundToTransactionResult(
    refundPaymentResponseData.status
  );
  
  const transactionRefundRequestedResponse: TransactionRefundRequestedResponse = 
    (result != undefined) ? {
    pspReference: refundPaymentResponseData.refund_id,
    result,
    amount: getSaleorAmountFromHyperswitchAmount(
      refundPaymentResponseData.amount,
      refundPaymentResponseData.currency,
    ),
  }:  {
    pspReference: refundPaymentResponseData.refund_id,
  };
  return transactionRefundRequestedResponse;

};
