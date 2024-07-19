import { z } from "zod";
import { deobfuscateValues } from "../app-configuration/utils";

// export const DANGEROUS_paymentAppConfigHiddenSchema = z.object({
//   // webhookSecret: z.string().min(1),
// });

export const paymentAppConfigEntryInternalSchema = z.object({
  configurationName: z.string().min(1),
  configurationId: z.string().min(1),
  // webhookId: z.string().min(1),
});

export const paymentAppConfigEntryEncryptedSchema = z.object({
  apiKey: z
    .string({ required_error: "Secret Key is required" })
    .min(1, { message: "Secret Key is required" }),
  paymentResponseHashKey: z
    .string({ required_error: "Payment Response Hash Key is required" })
    .min(1, { message: "Payment Response Hash Key  is required" }),
});

export const paymentAppConfigEntryPublicSchema = z.object({
  publishableKey: z
    .string({ required_error: "Publishable Key is required" })
    .min(1, { message: "Publishable Key is required" }),
  profileId: z
    .string({ required_error: "Profile ID is required" })
    .min(1, { message: "Profile ID is required" }),
});

export const paymentAppConfigEntrySchema = paymentAppConfigEntryEncryptedSchema
  .merge(paymentAppConfigEntryPublicSchema)
  .merge(paymentAppConfigEntryInternalSchema);

// Entire config available to user
export const paymentAppUserVisibleConfigEntrySchema = paymentAppConfigEntryPublicSchema
  .merge(paymentAppConfigEntryEncryptedSchema)
  .merge(paymentAppConfigEntryInternalSchema)
  .strict();

// Fully configured app - all fields are required
// Zod doesn't have a utility for marking fields as non-nullable, we need to use unwrap
export const paymentAppFullyConfiguredEntrySchema = z
  .object({
    configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
    configurationId: paymentAppConfigEntryInternalSchema.shape.configurationId,
    apiKey: paymentAppConfigEntryEncryptedSchema.shape.apiKey,
    paymentResponseHashKey: paymentAppConfigEntryEncryptedSchema.shape.paymentResponseHashKey,
    publishableKey: paymentAppConfigEntryPublicSchema.shape.publishableKey,
    profileId: paymentAppConfigEntryPublicSchema.shape.profileId,
    // webhookSecret: DANGEROUS_paymentAppConfigHiddenSchema.shape.webhookSecret,
    // webhookId: paymentAppConfigEntryInternalSchema.shape.webhookId,
  })
  .required();

// Schema used as input validation for saving config entires
export const paymentAppFormConfigEntrySchema = z
  .object({
    apiKey: paymentAppConfigEntryEncryptedSchema.shape.apiKey,
    paymentResponseHashKey: paymentAppConfigEntryEncryptedSchema.shape.paymentResponseHashKey,
    publishableKey: paymentAppConfigEntryPublicSchema.shape.publishableKey.startsWith(
      "pk_",
      "This isn't publishable key, it must start with pk_",
    ),
    profileId: paymentAppConfigEntryPublicSchema.shape.profileId.startsWith(
      "pro_",
      "This isn't publishable key, it must start with pro_",
    ),
    configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
  })
  .strict()
  .default({
    apiKey: "",
    paymentResponseHashKey: "",
    publishableKey: "",
    profileId: "",
    configurationName: "",
  });

/** Schema used in front-end forms
 * Replaces obfuscated values with null */
export const paymentAppEncryptedFormSchema = paymentAppConfigEntryEncryptedSchema.transform(
  (values) => deobfuscateValues(values),
);

// Schema used for front-end forms
export const paymentAppCombinedFormSchema = z.intersection(
  paymentAppEncryptedFormSchema,
  paymentAppConfigEntryPublicSchema,
);

export type PaymentAppInternalConfig = z.infer<typeof paymentAppConfigEntryInternalSchema>;
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
