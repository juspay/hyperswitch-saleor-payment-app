import { z } from "zod";
import { paymentAppConfigEntryInternalSchema } from "../common-app-configuration/config-entry";

export const juspayConfigEntryEncryptedSchema = z.object({
  apiKey: z
    .string({ required_error: "API Key is required" })
    .min(1, { message: "API Key is required" }),
  password: z
    .string({ required_error: "Password is required for webhook verification." })
    .min(1, { message: "Password is required" }),
});

export const juspayConfigEntryPublicSchema = z.object({
  username: z
    .string({ required_error: "Username is required for webhook verification." })
    .min(1, { message: "Username is required" }),
  clientId: z
    .string({ required_error: "Client ID is required" })
    .min(1, { message: "Client ID is required" }),
});

export const juspayConfigEntrySchema = juspayConfigEntryPublicSchema.merge(
  juspayConfigEntryEncryptedSchema,
);

export const juspayFullyConfiguredEntrySchema = z
  .object({
    apiKey: juspayConfigEntryEncryptedSchema.shape.apiKey,
    username: juspayConfigEntryPublicSchema.shape.username,
    password: juspayConfigEntryEncryptedSchema.shape.password,
    clientId: juspayConfigEntryPublicSchema.shape.clientId,
  })
  .required();

export const juspayUserVisibleConfigEntrySchema = juspayConfigEntryPublicSchema
  .merge(juspayConfigEntryEncryptedSchema)
  .strict();

// Schema used as input validation for saving config entries of juspay
export const juspayFormConfigEntrySchema = z
  .object({
    apiKey: juspayConfigEntryEncryptedSchema.shape.apiKey,
    password: juspayConfigEntryEncryptedSchema.shape.password,
    username: juspayConfigEntryPublicSchema.shape.username,
    clientId: juspayConfigEntryPublicSchema.shape.clientId,
  })
  .strict()
  .default({
    apiKey: "",
    password: "",
    username: "",
    clientId: "",
  });

export type JuspayUserVisibleConfigEntry = z.infer<typeof juspayUserVisibleConfigEntrySchema>;
