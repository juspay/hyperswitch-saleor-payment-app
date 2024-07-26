
import { getWebhookPaymentAppConfigurator } from "../../payment-app-configuration/payment-app-configuration-factory";
import {
  SyncWebhookAppErrors,
  type JuspayTransactionInitializeSessionResponse,
  PaymentLinks,
  SdkPayload,
} from "@/schemas/JuspayTransactionInitializeSession/JuspayTransactionInitializeSessionResponse.mjs";
import {
  TransactionFlowStrategyEnum,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import {
  getHyperswitchAmountFromSaleorMoney,
  getSaleorAmountFromHyperswitchAmount,
} from "../../hyperswitch/currencies";
import {
  buildAddressDetails,
  validatePaymentCreateRequest,
} from "../../hyperswitch/hyperswitch-api-request";
import {
  UnExpectedHyperswitchPaymentStatus
} from "@/errors";
import {
  createHyperswitchClient,
  createJuspayClient,
  fetchHyperswitchProfileID,
  fetchHyperswitchPublishableKey,
} from "../../hyperswitch/hyperswitch-api";
import { type components as paymentsComponents } from "generated/juspay-payments";
import {
  intoPaymentResponse
} from "../../juspay/juspay-api-response";
import { normalizeValue } from "../../payment-app-configuration/utils";
import { ConfigObject } from "@/backend-lib/api-route-utils";

export const juspayPaymentIntentToTransactionResult = (
  status: string,
  transactionFlow: TransactionFlowStrategyEnum,
): JuspayTransactionInitializeSessionResponse["result"] => {
  const prefix =
    transactionFlow === TransactionFlowStrategyEnum.Authorization
      ? "AUTHORIZATION"
      : transactionFlow === TransactionFlowStrategyEnum.Charge
        ? "CHARGE"
        : null;

  invariant(prefix, `Unsupported transactionFlowStrategy: ${transactionFlow}`);

  switch (status) {
    case "NEW":
      return `${prefix}_ACTION_REQUIRED`;
    case "TO_BE_CHARGED":
      return "AUTHORIZATION_SUCCESS";
    case "NOT_FOUND":
    case "ERROR":
    case "JUSPAY_DECLINED":
      return `${prefix}_FAILURE`;
    case "PENDING_AUTHENTICATION":
    case "AUTHORIZING": 
      return `${prefix}_REQUEST`;
    default:
      throw new UnExpectedHyperswitchPaymentStatus(
        `Status received from juspay: ${status}, is not expected . Please check the payment flow.`,
      );
  }
};

export const TransactionInitializeSessionJuspayWebhookHandler = async (
  event: TransactionInitializeSessionEventFragment,
  saleorApiUrl: string,
  configData: ConfigObject,
): Promise<JuspayTransactionInitializeSessionResponse> => {
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
  }
  const channelId = event.sourceObject.channel.id;

  const juspayClient = await createJuspayClient({
    configData,
  });

  const createJuspayPayment = juspayClient.path("/session").method("post").create();
  

  const createOrderPayload: paymentsComponents["schemas"]["SessionRequest"] = {
    order_id: normalizeValue("001f055e14d041c7bb3c39164552acd5"),
    amount: normalizeValue("1.0"),
    customer_id: normalizeValue("testing-customer-one"),
    customer_email: normalizeValue("mrudul.vajpayee@juspay.in"),
    customer_phone: normalizeValue("9876543210"),
    payment_page_client_id: normalizeValue("geddit"),
    return_url: normalizeValue("https://shop.merchant.com"),
    description: normalizeValue("Complete your payment"),
    first_name: normalizeValue("John"),
    last_name: normalizeValue("wick"),
    currency: normalizeValue("INR")
};

  const createOrderResponse = await createJuspayPayment(createOrderPayload);
  const createPaymentResponseData = intoPaymentResponse(createOrderResponse.data);
  invariant(createPaymentResponseData.status && createPaymentResponseData.order_id && createPaymentResponseData.payment_links && createPaymentResponseData.sdk_payload, `Required fields not found session call response`);

  const result = juspayPaymentIntentToTransactionResult(
    createPaymentResponseData.status,
    event.action.actionType,
  );
  const transactionInitializeSessionResponse: JuspayTransactionInitializeSessionResponse = {
    pspReference:createPaymentResponseData.order_id,
    data: {
      order_id: createPaymentResponseData.order_id,
      payment_links: createPaymentResponseData.payment_links as PaymentLinks,
      sdk_payload: createPaymentResponseData.sdk_payload as SdkPayload,
      errors,
    },
    result,
    amount: 1.0,
    time: new Date().toISOString(),
  };
  return transactionInitializeSessionResponse;
};
