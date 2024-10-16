import { z, ZodError } from "zod";
import { JsonSchemaError } from "@/errors";

export const SaleorMetadataSchema = z.object({
  transaction_id: z.string(),
  saleor_api_url: z.string(),
});

export const SessionPaymentlinks = z.object({
  web: z.string().nullable(),
  expiry: z.string().nullable(),
  deep_link: z.string().nullable().optional(),
});

export const Payload = z.object({
  clientId: z.string().nullable().optional(),
  amount: z.string().nullable(),
  merchantId: z.string().nullable().optional(),
  clientAuthToken: z.string().nullable().optional(),
  clientAuthTokenExpiry: z.string().nullable(),
  environment: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  returnUrl: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  orderId: z.string().nullable(),
  description: z.string().nullable().optional(),
});

export const SessionSDKPayload = z.object({
  requestId: z.string(),
  service: z.string(),
  payload: Payload,
  expiry: z.string().nullable().optional(),
});

export const PaymentResponseSchema = z.object({
  status: z.string().nullable(),
  id: z.string().nullable(),
  order_id: z.string().nullable(),
  payment_links: SessionPaymentlinks,
  sdk_payload: SessionSDKPayload,
});

export type PaymentCreateResponse = z.infer<typeof PaymentResponseSchema>;

export function intoPaymentResponse(responseData: any): PaymentCreateResponse {
  try {
    return PaymentResponseSchema.parse(responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse payment create response: ${error}`);
    } else {
      throw error;
    }
  }
}

export const PreAuthPaymentResponse = z.object({
  status: z.string().nullable(),
  order_id: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  txn_uuid: z.string().nullable().optional(),
});

export type PaymentPreAuthResponse = z.infer<typeof PreAuthPaymentResponse>;

export function intoPreAuthTxnResponse(responseData: any): PaymentPreAuthResponse {
  try {
    return PreAuthPaymentResponse.parse(responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse payment void response`);
    } else {
      throw error;
    }
  }
}

export const Refunds = z.object({
  unique_request_id: z.string(),
  amount: z.number(),
  status: z.string(),
  error_message: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  refund_source: z.string().nullable().optional(),
});

export const OrderStatusResponse = z.object({
  status: z.string(),
  order_id: z.string().nullable(),
  amount: z.number().nullable().optional(),
  txn_uuid: z.string().nullable().optional(),
  refunded: z.boolean().nullable().optional(),
  refunds: z.array(Refunds).nullable().optional(),
  udf1: z.string().nullable().optional(),
  udf2: z.string().nullable().optional(),
});

export type GetOrderStatusResponse = z.infer<typeof OrderStatusResponse>;

export function intoOrderStatusResponse(responseData: any): GetOrderStatusResponse {
  try {
    return OrderStatusResponse.parse(responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse order status response`);
    } else {
      throw error;
    }
  }
}

export const ErrorSchema = z.object({
  error_message: z.string().nullable().optional(),
  user_message: z.string().nullable().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;

export function intoErrorResponse(eventData: unknown): ErrorResponse {
  try {
    // Try to parse the event data against the schema
    return ErrorSchema.parse(eventData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse error response: ${eventData}`);
    } else {
      throw error;
    }
  }
}

export const RefundResponseSchema = z.object({
  order_id: z.string(),
  amount: z.number(),
  status: z.string(),
  txn_uuid: z.string().nullable(),
  udf1: z.string().nullable().optional(),
  udf2: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  refunds: z.array(Refunds).nullable().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export function intoRefundResponse(responseData: any): RefundResponse {
  try {
    return RefundResponseSchema.parse(responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse refund response`);
    } else {
      throw error;
    }
  }
}

const CaptureMethodEnum = z.enum(["automatic", "manual"]);

const JuspayWebhookEventsEnum = z.enum([
  "ORDER_CREATED",
  "ORDER_UPDATED",
  "ORDER_SUCCEEDED",
  "ORDER_FAILED",
  "ORDER_AUTHORIZED",
  "TXN_CREATED",
  "ORDER_REFUNDED",
  "ORDER_REFUND_FAILED",
  "AUTO_REFUND_SUCCEEDED",
  "AUTO_REFUND_FAILED",
  "REFUND_MANUAL_REVIEW_NEEDED",
  "REFUND_ARN_CAPTURED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_ACTIVATED",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_CANCELLED",
  "INVOICE_CREATED",
  "INVOICE_PAYMENT_SUCCEEDED",
  "INVOICE_PAYMENT_FAILED",
  "INVOICE_PAYMENT_OVERDUE",
  "INVOICE_PAYMENT_CANCELLED",
  "MANDATE_CREATED",
  "MANDATE_ACTIVATED",
  "AUTO_REFUND_INITIATED",
  "REFUND_INITIATED",
  "MANDATE_FAILED",
  "MANDATE_REVOKED",
  "MANDATE_PAUSED",
  "MANDATE_UPDATED",
  "MANDATE_UNPAUSED",
  "MANDATE_EXPIRED",
  "NOTIFICATION_SUCCEEDED",
  "NOTIFICATION_FAILED",
  "CHARGEBACK_RECEIVED",
  "CHARGEBACK_RESOLVED_IN_MERCHANT_FAVOUR",
  "CHARGEBACK_RESOLVED_IN_CUSTOMER_FAVOUR",
  "CHARGEBACK_CANCELED",
  "CHARGEBACK_ALREADY_REFUNDED",
  "CHARGEBACK_EXPIRED",
  "CHARGEBACK_UNDER_REVIEW",
  "CHARGEBACK_EVIDENCE_REQUIRED",
  "UNKNOWN",
  "ORDER_PARTIAL_CHARGED",
  "TXN_CHARGED",
  "TXN_FAILED",
  "MERCHANT_CUSTOMER_COLLECT_REQUEST_RECEIVED",
  "MERCHANT_CUSTOMER_COLLECT_REQUEST_SENT",
  "MERCHANT_CUSTOMER_COMPLAINT_RESOLVED",
  "MERCHANT_CUSTOMER_CREDITED_VIA_COLLECT",
  "MERCHANT_CUSTOMER_DEBITED_VIA_COLLECT",
  "MERCHANT_CUSTOMER_DEBITED_FOR_MERCHANT_VIA_COLLECT",
  "MERCHANT_CUSTOMER_DEBITED_FOR_MERCHANT_VIA_PAY",
  "MERCHANT_CUSTOMER_DEBITED_VIA_PAY",
  "MERCHANT_CUSTOMER_INCOMING_MANDATE_CREATE_REQUEST_RECEIVED",
  "MERCHANT_CUSTOMER_INCOMING_MANDATE_CREATED",
  "MERCHANT_CUSTOMER_INCOMING_MANDATE_UPDATE_REQUEST_RECEIVED",
  "MERCHANT_CUSTOMER_INCOMING_MANDATE_UPDATED",
  "MERCHANT_CUSTOMER_INCOMING_PRE_PAYMENT_NOTIFICATION_MANDATE_RECEIVED",
  "MERCHANT_CUSTOMER_LINKED_BANK_ACCOUNT",
  "MERCHANT_CUSTOMER_MANDATE_STATUS_UPDATE",
  "MERCHANT_CUSTOMER_OUTGOING_MANDATE_CREATED",
  "MERCHANT_CUSTOMER_OUTGOING_MANDATE_PAUSED",
  "MERCHANT_CUSTOMER_OUTGOING_MANDATE_UPDATED",
  "MERCHANT_CUSTOMER_RECEIVED_MONEY",
  "ORDER_VOIDED",
  "ORDER_VOID_FAILED",
  "ORDER_CAPTURE_FAILED",
  "TOKEN_STATUS_UPDATED",
  "MERCHANT_CUSTOMER_PORTED_UPI_NUMBER",
  "MERCHANT_CUSTOMER_COMPLAINT_RAISED",
  "ORDER_COD_INITIATED",
  "MERCHANT_CUSTOMER_UPI_LITE_TOPUP",
  "MERCHANT_CUSTOMER_UPI_LITE_DEREGISTRATION",
  "ORDER_TO_BE_CHARGED",
]);

export const JuspaySupportedEvents = z.enum([
  "ORDER_UPDATED",
  "ORDER_SUCCEEDED",
  "ORDER_FAILED",
  "ORDER_AUTHORIZED",
  "ORDER_REFUNDED",
  "ORDER_REFUND_FAILED",
  "ORDER_PARTIAL_CHARGED",
  "ORDER_VOIDED",
  "ORDER_VOID_FAILED",
  "ORDER_CAPTURE_FAILED",
  "ORDER_COD_INITIATED",
  "AUTO_REFUND_SUCCEEDED",
  "AUTO_REFUND_FAILED",
  "AUTO_REFUND_INITIATED",
]);
export const JuspayRefundEvents = z.enum([
  "ORDER_REFUNDED",
  "ORDER_REFUND_FAILED",
  "AUTO_REFUND_SUCCEEDED",
  "AUTO_REFUND_FAILED",
  "REFUND_MANUAL_REVIEW_NEEDED",
  "REFUND_ARN_CAPTURED",
  "AUTO_REFUND_INITIATED",
  "REFUND_INITIATED",
]);

const txnDetails = z.object({
  status: z.string(),
  txn_id: z.string(),
  txn_amount: z.number(),
  error_message: z.string(),
});

const erroInfo = z.object({
  user_message: z.string(),
});

const WebhookObjectBodySchema = z.object({
  status: z.string(),
  order_id: z.string(),
  amount: z.number().nullable().optional(),
  txn_uuid: z.string().nullable().optional(),
  refunded: z.boolean().nullable().optional(),
  refunds: z.array(Refunds).nullable().optional(),
  udf1: z.string().nullable().optional(),
  udf2: z.string().nullable().optional(),
  udf3: CaptureMethodEnum.nullable().optional(),
  txn_detail: txnDetails.nullable().optional(),
  error_info: erroInfo.nullable().optional(),
});

const WebhookOrderSchema = z.object({
  order: WebhookObjectBodySchema,
});

const WebhookContentSchema = z.object({
  event_name: JuspayWebhookEventsEnum,
  content: WebhookOrderSchema,
});

const WebhookEventSchema = z.object({
  event_name: JuspayWebhookEventsEnum,
});

export type WebhookResponse = z.infer<typeof WebhookContentSchema>;

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export type CaptureMethod = z.infer<typeof CaptureMethodEnum>;

export type JuspayWebhookEvents = z.infer<typeof JuspayWebhookEventsEnum>;

export function intoWebhookResponse(responseData: any): WebhookResponse {
  return WebhookContentSchema.parse(responseData);
}

export function parseWebhookEvent(responseData: any): WebhookEvent {
  return WebhookEventSchema.parse(responseData);
}
