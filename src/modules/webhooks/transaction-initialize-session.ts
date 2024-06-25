import { getWebhookPaymentAppConfigurator } from "../payment-app-configuration/payment-app-configuration-factory";
import { paymentAppFullyConfiguredEntrySchema } from "../payment-app-configuration/config-entry";
import { obfuscateConfig, obfuscateValue } from "../app-configuration/utils";
import { getConfigurationForChannel } from "../payment-app-configuration/payment-app-configuration";
import {
  SyncWebhookAppErrors,
  type TransactionInitializeSessionResponse,
} from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  TransactionFlowStrategyEnum,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import {
  getHyperswitchAmountFromSaleorMoney,
  getSaleorAmountFromHyperswitchAmount,
} from "../hyperswitch/currencies";
import { validatePaymentCreateRequest } from "../hyperswitch/hyperswitch-api-request";
import { ChannelNotConfigured } from "@/errors";
import { createHyperswitchClient, fetchHyperswitchPublishableKey } from "../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { Channel } from '../../types';
import {
  intoPaymentResponse,
  PaymentResponseSchema,
} from "../hyperswitch/hyperswitch-api-response";

export const hyperswitchPaymentIntentToTransactionResult = (
  status: string,
  transactionFlow: TransactionFlowStrategyEnum,
): TransactionInitializeSessionResponse["result"] => {
  const prefix =
  transactionFlow === TransactionFlowStrategyEnum.Authorization
    ? "AUTHORIZATION"
    : transactionFlow === TransactionFlowStrategyEnum.Charge
      ? "CHARGE"
      :
        null;

  invariant(prefix, `Unsupported transactionFlowStrategy: ${transactionFlow}`);

  switch (status) {
    case "succeeded":
      return "CHARGE_SUCCESS";
    case "requires_payment_method":
      return `${prefix}_ACTION_REQUIRED`;
    case "requires_capture":
      return "AUTHORIZATION_SUCCESS";
    case "failed":
    case "cancelled":
        return `${prefix}_FAILURE`;
    case "processing":
    default: 
        return `${prefix}_REQUEST`;
  }
};


export const TransactionInitializeSessionWebhookHandler = async (
  event: TransactionInitializeSessionEventFragment,
  saleorApiUrl: string,
): Promise<TransactionInitializeSessionResponse> => {
  const logger = createLogger(
    { saleorApiUrl },
    { msgPrefix: "[TransactionInitializeSessionWebhookHandler] " },
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
  const { privateMetadata } = app;
  const configurator = getWebhookPaymentAppConfigurator({ privateMetadata }, saleorApiUrl);
  const errors: SyncWebhookAppErrors = [];
  const currency = event.action.currency;
  const amount = getHyperswitchAmountFromSaleorMoney(event.action.amount, currency);
  let requestData = null;
  if (event.data != null) {
    requestData = validatePaymentCreateRequest(event.data);
  };
  const billingAddress = event.sourceObject.billingAddress;
  const shippingAddress = event.sourceObject.shippingAddress;
  const channelId = event.sourceObject.channel.id;

  const hyperswitchClient = await createHyperswitchClient({
    configurator,
    channelId,
  });

  const createHyperswitchPayment = hyperswitchClient.path("/payments").method("post").create();

  const capture_method =
    event.action.actionType == TransactionFlowStrategyEnum.Authorization ? "manual" : "automatic";
  const createPaymentPayload: paymentsComponents["schemas"]["PaymentsCreateRequest"] = {
    amount,
    confirm: false,
    currency: currency as paymentsComponents["schemas"]["PaymentsCreateRequest"]["currency"],
    capture_method,
    customer_id: requestData?.customerId,
    authentication_type: requestData?.authenticationType,
    return_url: requestData?.returnUrl,
    description: requestData?.description,
    billing: {
      address: {
        line1: billingAddress?.streetAddress1,
        line2: billingAddress?.streetAddress2,
        city: billingAddress?.city,
        state: billingAddress?.countryArea,
        zip: billingAddress?.postalCode,
        country: billingAddress?.country.code as paymentsComponents["schemas"]["CountryAlpha2"],
        first_name: billingAddress?.firstName,
        last_name: billingAddress?.lastName,
      },
      phone: {
        number: billingAddress?.phone,
      },
      email: requestData?.billingEmail,
    },
    shipping: {
      address: {
        line1: shippingAddress?.streetAddress1,
        line2: shippingAddress?.streetAddress2,
        city: shippingAddress?.city,
        state: shippingAddress?.countryArea,
        zip: shippingAddress?.postalCode,
        country: shippingAddress?.country.code as paymentsComponents["schemas"]["CountryAlpha2"],
        first_name: shippingAddress?.firstName,
        last_name: shippingAddress?.lastName,
      },
      phone: {
        number: shippingAddress?.phone,
      },
      email: requestData?.shippingEmail,
    },
    metadata: {
      transaction_id: event.transaction.id,
      saleor_api_url: saleorApiUrl,
    },
  };
  const publishableKey = await fetchHyperswitchPublishableKey(
    configurator,
    channelId,
    );

  const createPaymentResponse = await createHyperswitchPayment(createPaymentPayload);
  const createPaymentResponseData = intoPaymentResponse(createPaymentResponse.data);
  const result = hyperswitchPaymentIntentToTransactionResult(
    createPaymentResponseData.status,
    event.action.actionType,
  );
  const transactionInitializeSessionResponse: TransactionInitializeSessionResponse = {
    data: {
      clientSecret: createPaymentResponseData.client_secret,
      publishableKey,
      errors,
    },
    pspReference: createPaymentResponseData.payment_id,
    result,
    amount: getSaleorAmountFromHyperswitchAmount(
      createPaymentResponseData.amount,
      createPaymentResponseData.currency,
    ),
    time: new Date().toISOString(),
  };
  return transactionInitializeSessionResponse;
};
