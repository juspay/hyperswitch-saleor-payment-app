import { CheckoutPaymentAlreadyProcessed, JsonSchemaError } from "@/errors";
import { TransactionInitializeSessionAddressFragment } from "generated/graphql";
import { z, ZodError } from "zod";
import { type components as paymentsComponents } from "generated/hyperswitch-payments";
import { normalizeValue } from "./payment-app-configuration/utils";
import { env } from "@/lib/env.mjs";
import { randomBytes } from "crypto";

export const getEnvironmentFromKey = (): string => {
  return env.NEXT_PUBLIC_ENV;
};

export function generate16DigitId(): string {
  return randomBytes(8).toString("hex");
}

const AuthenticationTypeEnum = z.enum(["three_ds", "no_three_ds"]);

// Define the schema for PaymentCreateRequest
const PaymentCreateRequestSchema = z.object({
  customerId: z.string().nullable().optional(),
  authenticationType: AuthenticationTypeEnum.nullable().optional(),
  billingEmail: z.string().email().nullable().optional(),
  shippingEmail: z.string().email().nullable().optional(),
  statementDescriptorName: z.string().email().nullable().optional(),
  statementDescriptorSuffix: z.string().email().nullable().optional(),
  description: z.string().nullable().optional(),
  returnUrl: z.string().nullable().optional(),
  manualRetryAllowed: z.boolean().nullable().optional(),
  gatewayReferenceId: z.string().nullable().optional(),
  allowedPaymentMethods: z
    .union([z.record(z.any()).nullable(), z.array(z.string()).nullable()])
    .nullable()
    .optional(),
});

// Type definition for PaymentCreateRequest
export type PaymentCreateRequest = z.infer<typeof PaymentCreateRequestSchema>;

// Function to validate the event data
export function validatePaymentCreateRequest(eventData: unknown): PaymentCreateRequest {
  try {
    // Try to parse the event data against the schema
    return PaymentCreateRequestSchema.parse(eventData);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new JsonSchemaError(`Failed to parse payment create data: ${error.message}`);
    } else {
      throw error;
    }
  }
}

const buildAddress = (address?: TransactionInitializeSessionAddressFragment) => {
  if (!address) {
    return undefined;
  }
  return {
    line1: address.streetAddress1,
    line2: address.streetAddress2,
    city: address.city,
    state: address.countryArea,
    zip: address.postalCode,
    country: address.country.code as paymentsComponents["schemas"]["CountryAlpha2"],
    first_name: address.firstName,
    last_name: address.lastName,
  };
};

const buildContact = (phoneNumber?: string | null | undefined) => {
  return {
    number: normalizeValue(phoneNumber),
  };
};

export const buildAddressDetails = (
  billingAddress?: TransactionInitializeSessionAddressFragment | null,
  billingEmail?: string | null,
) => {
  if (!billingAddress) {
    return undefined;
  }
  return {
    address: buildAddress(billingAddress),
    phone: buildContact(billingAddress.phone),
    email: normalizeValue(billingEmail),
  };
};

export function validateTransactionAmount(amount: number) {
  if (amount == 0) {
    throw new CheckoutPaymentAlreadyProcessed(
      "Checkout corresponding to this transaction is already captured! Please create a new checkout and try again.",
    );
  }
}
