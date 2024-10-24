import {
  TransactionFlowStrategyEnum,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import {
  buildAddressDetails,
  validatePaymentCreateRequest,
  validateTransactionAmount,
  generateUniqueUUID,
} from "../../api-utils";
import { UnExpectedHyperswitchPaymentStatus } from "@/errors";
import { callJuspayClient, fetchJuspayCleintId } from "@/modules/juspay/juspay-api";
import { type components as paymentsComponents } from "generated/juspay-payments";
import { intoPaymentResponse } from "../../juspay/juspay-api-response";
import { normalizeValue } from "../../payment-app-configuration/utils";
import { ConfigObject } from "@/backend-lib/api-route-utils";
import {
  PaymentLinks,
  SdkPayload,
  SyncWebhookAppErrors,
  TransactionInitializeSessionResponse,
} from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

export const juspayPaymentIntentToTransactionResult = (
  status: string,
  transactionFlow: TransactionFlowStrategyEnum,
): TransactionInitializeSessionResponse["result"] => {
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
  validateTransactionAmount(event.action.amount);
  const errors: SyncWebhookAppErrors = [];
  let requestData = null;
  if (event.data != null) {
    requestData = validatePaymentCreateRequest(event.data);
  }

  const userEmail = requestData?.billingEmail
    ? requestData?.billingEmail
    : event.sourceObject.userEmail;

  const billingAddress = buildAddressDetails(event.sourceObject.billingAddress, userEmail);
  const shippingAddress = buildAddressDetails(
    event.sourceObject.shippingAddress,
    requestData?.shippingEmail,
  );
  const capture_method =
    event.action.actionType == TransactionFlowStrategyEnum.Authorization ? "manual" : "automatic";
  const encryptedSaleorApiUrl = btoa(saleorApiUrl);
  const encryptSaleorTransactionId = btoa(event.transaction.id);

  const payment_page_client_id = await fetchJuspayCleintId(configData);

  const captureMethod =
    event.action.actionType == TransactionFlowStrategyEnum.Authorization ? false : true;

  const orderId = generateUniqueUUID();

  const createOrderPayload: paymentsComponents["schemas"]["SessionRequest"] = {
    order_id: normalizeValue(orderId),
    amount: event.action.amount,
    customer_id: normalizeValue(requestData?.customerId),
    customer_email: normalizeValue(userEmail),
    customer_phone: normalizeValue(event.sourceObject.billingAddress?.phone),
    payment_page_client_id,
    return_url: normalizeValue(requestData?.returnUrl),
    description: normalizeValue(requestData?.description),
    first_name: normalizeValue(event.sourceObject.billingAddress?.firstName),
    last_name: normalizeValue(event.sourceObject.billingAddress?.lastName),
    currency: event.action.currency,
    udf1: normalizeValue(encryptSaleorTransactionId),
    udf2: normalizeValue(encryptedSaleorApiUrl),
    udf3: normalizeValue(capture_method),
    billing_address_first_name: normalizeValue(billingAddress?.address?.first_name),
    billing_address_last_name: normalizeValue(billingAddress?.address?.last_name),
    billing_address_line1: normalizeValue(billingAddress?.address?.line1),
    billing_address_line2: normalizeValue(billingAddress?.address?.line2),
    billing_address_city: normalizeValue(billingAddress?.address?.city),
    billing_address_state: normalizeValue(billingAddress?.address?.state),
    billing_address_country: normalizeValue(billingAddress?.address?.zip),
    billing_address_postal_code: normalizeValue(billingAddress?.address?.zip),
    shipping_address_first_name: normalizeValue(shippingAddress?.address?.first_name),
    shipping_address_last_name: normalizeValue(shippingAddress?.address?.last_name),
    shipping_address_line1: normalizeValue(shippingAddress?.address?.line1),
    shipping_address_line2: normalizeValue(shippingAddress?.address?.line2),
    shipping_address_city: normalizeValue(shippingAddress?.address?.city),
    shipping_address_state: normalizeValue(shippingAddress?.address?.state),
    shipping_address_country: normalizeValue(shippingAddress?.address?.zip),
    shipping_address_postal_code: normalizeValue(shippingAddress?.address?.zip),
    "metadata.JUSPAY:gateway_reference_id": requestData?.gatewayReferenceId,
    "metadata.txns.auto_capture": captureMethod,
    payment_filter: normalizeValue(requestData?.allowedPaymentMethods),
  };

  const createOrderResponse = await callJuspayClient({
    configData,
    targetPath: `/session`,
    method: "POST",
    body: JSON.stringify(createOrderPayload),
  });

  logger.info("Successfully called juspay client for transaction initialize.");

  const createPaymentResponseData = intoPaymentResponse(createOrderResponse);
  invariant(
    createPaymentResponseData.status &&
      createPaymentResponseData.order_id &&
      createPaymentResponseData.payment_links &&
      createPaymentResponseData.sdk_payload,
    `Required fields not found session call response`,
  );

  const result = juspayPaymentIntentToTransactionResult(
    createPaymentResponseData.status,
    event.action.actionType,
  );
  const transactionInitializeSessionResponse: TransactionInitializeSessionResponse = {
    pspReference: createPaymentResponseData.order_id,
    data: {
      paymentLinks: {
        web: createPaymentResponseData.payment_links.web,
        expiry: createPaymentResponseData.payment_links.expiry,
        deepLink: createPaymentResponseData.payment_links.deep_link,
      } as PaymentLinks,
      sdkPayload: createPaymentResponseData.sdk_payload as SdkPayload,
      errors,
    },
    result,
    amount: event.action.amount,
    time: new Date().toISOString(),
  };

  return transactionInitializeSessionResponse;
};
