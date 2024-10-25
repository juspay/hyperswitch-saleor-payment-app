// We have to use process.env, otherwise pino doesn't work
import pino from "pino";
// import pinoPretty from "pino-pretty";
// import { isDevelopment, isTest } from "./isEnv";
import { isObject } from "./utils";
import { obfuscateValue } from "@/modules/app-configuration/utils";
import { BaseError, BaseTrpcError } from "@/errors";

const redactionFields = [
  "secretKey",
  "billing_address_first_name",
  "billing_address_last_name",
  "billing_address_line1",
  "billing_address_line2",
  "billing_address_postal_code",
  "shipping_address_first_name",
  "shipping_address_last_name",
  "shipping_address_line1",
  "shipping_address_line2",
  "shipping_address_country",
  "customer_email",
  "customer_phone",
  "first_name",
  "last_name",
  "udf1",
  "udf2",
  "payment_links",
  "sdk_payload",
  "billing_address_city",
  "shipping_address_city",
  "email",
  "statement_descriptor_name",
  "billing",
  "shipping",
  "client_secret",
  "payment_link",
  "txn_uuid",
  "metadata",
  "saleor_api_url",
  "hostname",
  "pid",
];

/* c8 ignore start */
export const logger = pino({
  level: process.env.APP_DEBUG ?? "info",
  redact: {
    paths: ["secretKey", "*[*].secretKey"],
    censor: (value) => redactLogValue(value),
  },
  // transport:
  //   process.env.CI || isDevelopment() || isTest()
  //     ? {
  //         target: "pino-pretty",
  //         options: {
  //           colorize: true,
  //         },
  //       }
  //     : undefined,
});
/* c8 ignore stop */

export const createLogger = logger.child.bind(logger);

export const redactLogValue = (value: unknown) => {
  if (typeof value !== "string") {
    // non-string values are fully redacted to prevent leaks
    return "[REDACTED]";
  }

  return obfuscateValue(value);
};

export const redactError = (error: unknown) => {
  if (error instanceof BaseTrpcError) {
    const { message, name, errorCode, statusCode, trpcCode } = error;
    return {
      message,
      name,
      errorCode,
      statusCode,
      trpcCode,
    };
  }
  if (error instanceof BaseError) {
    const { message, name, errorCode, statusCode } = error;
    return {
      message,
      name,
      errorCode,
      statusCode,
    };
  }
  if (error instanceof Error) {
    const { message, name } = error;
    return {
      message,
      name,
    };
  }
};

export const redactLogObject = <T extends {}>(obj: T, callCount = 1): T => {
  if (callCount > 10) {
    logger.warn("Exceeded max call count for redactLogObject");
    return { _message: "[REDACTED - MAX CALL COUNT EXCEEDED]" } as unknown as T;
  }

  const entries = Object.entries(obj).map(([key, value]) => {
    if (redactionFields.includes(key)) {
      return [key, "[REDACTED]"];
    }
    if (isObject(value)) {
      return [key, redactLogObject(value, callCount + 1)];
    }
    if (Array.isArray(value)) {
      return [key, redactLogArray(value)];
    }
    return [key, value];
  });
  return Object.fromEntries(entries) as T;
};

export const redactLogArray = <T extends unknown[]>(array: T | undefined, callCount = 1): T => {
  if (!array) return [] as unknown as T;
  if (callCount > 10) {
    logger.warn("Exceeded max call count for redactLogArray");
    return [] as unknown as T;
  }

  return array.map((item) => {
    if (isObject(item)) {
      return redactLogObject(item, callCount + 1);
    }
    if (Array.isArray(item)) {
      return redactLogArray(item, callCount + 1);
    }
    return item;
  }) as T;
};
