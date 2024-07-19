import { z, ZodError } from "zod";
import { JsonSchemaError } from "@/errors";

export const SaleorMetadataSchema = z.object({
  transaction_id: z.string(),
  saleor_api_url: z.string(),
});

export const PaymentResponseSchema = z.object({
  payment_id: z.string(),
  status: z.string(),
  amount: z.number(),
  amount_received: z.number().nullable(),
  currency: z.string(),
  connector: z.string().nullable(),
  client_secret: z.string(),
  metadata: SaleorMetadataSchema,
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
});

export type PaymentCreateResponse = z.infer<typeof PaymentResponseSchema>;

export function intoPaymentResponse(responseData: any): PaymentCreateResponse {
  try {
    return PaymentResponseSchema.parse(responseData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse payment create response`);
    } else {
      throw error;
    }
  }
}

// Define the schema for the ErrorResponse
const ErrorDataSchema = z.object({
  type: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
});

export const ErrorSchema = z.object({
  error: ErrorDataSchema.nullable().optional(),
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
  refund_id: z.string(),
  payment_id: z.string(),
  amount: z.number(),
  status: z.string(),
  currency: z.string(),
  connector: z.string().nullable(),
  reason: z.string().nullable(),
  metadata: SaleorMetadataSchema,
  error_code: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
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

const WebhookObjectBodySchema = z.object({
  status: z.string(),
  payment_id: z.string(),
  refund_id: z.string().nullable().optional(),
  metadata: SaleorMetadataSchema,
  capture_method: CaptureMethodEnum.nullable().optional(),
  error_message: z.string().nullable().optional(),
});

const WebhookContentSchema = z.object({
  type: z.string(),
  object: WebhookObjectBodySchema,
});

const WebhookBodySchema = z.object({
  content: WebhookContentSchema,
});

export type WebhookResponse = z.infer<typeof WebhookBodySchema>;

export type CaptureMethod = z.infer<typeof CaptureMethodEnum>;

export function intoWebhookResponse(responseData: any): WebhookResponse {
  return WebhookBodySchema.parse(responseData);
}
