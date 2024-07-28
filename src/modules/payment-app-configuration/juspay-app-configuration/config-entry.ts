import { z } from "zod";
import { paymentAppConfigEntryInternalSchema } from "../config-entry";

export const juspayConfigEntryEncryptedSchema = z.object({
    apiKey: z
      .string({ required_error: "API Key is required" })
      .min(1, { message: "API Key is required" }),
    password: z
      .string({ required_error: "Passowrd is required for webhook verification." })
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

  export const juspayConfigEntrySchema = juspayConfigEntryPublicSchema
  .merge(juspayConfigEntryEncryptedSchema);

  export const juspayFullyConfiguredEntrySchema = z
  .object({
    apiKey: juspayConfigEntryEncryptedSchema.shape.apiKey,
    username: juspayConfigEntryPublicSchema.shape.username,
    password: juspayConfigEntryEncryptedSchema.shape.password,
    clientId: juspayConfigEntryPublicSchema.shape.clientId
  })
  .required();

  export const juspayUserVisibleConfigEntrySchema = juspayConfigEntryPublicSchema
  .merge(juspayConfigEntryEncryptedSchema)
  .strict();

  // Schema used as input validation for saving config entires of juspay
export const juspayFormConfigEntrySchema = z
.object({
  apiKey: juspayConfigEntryEncryptedSchema.shape.apiKey,
  password: juspayConfigEntryEncryptedSchema.shape.password,
  username: juspayConfigEntryPublicSchema.shape.username,
  clientId: juspayConfigEntryPublicSchema.shape.clientId,
  configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
})
.strict()
.default({
  apiKey: "",
  password: "",
  username: "",
  clientId: "",
  configurationName: "",
});

export type PaymentAppEncryptedConfig = z.infer<typeof paymentAppConfigEntryEncryptedSchema>;
export type PaymentAppPublicConfig = z.infer<typeof paymentAppConfigEntryPublicSchema>;

export type PaymentAppConfigEntry = z.infer<typeof paymentAppConfigEntrySchema>;
export type PaymentAppConfigEntryFullyConfigured = z.infer<
  typeof paymentAppFullyConfiguredEntrySchema
>;
export type PaymentAppUserVisibleConfigEntry = z.infer<
  typeof paymentAppUserVisibleConfigEntrySchema
>;
export type PaymentAppFormConfigEntry = z.infer<typeof paymentAppFormConfigEntrySchema>;
export type PaymentAppConfigEntryUpdate = Partial<PaymentAppConfigEntry> & {
  configurationId: PaymentAppConfigEntry["configurationId"];
};