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

export const hyperswitchConfigEntryEncryptedSchema = z.object({
  apiKey: z
    .string({ required_error: "Secret Key is required" })
    .min(1, { message: "Secret Key is required" }),
  paymentResponseHashKey: z
    .string({ required_error: "Payment Response Hash Key is required" })
    .min(1, { message: "Payment Response Hash Key  is required" }),
});

export const hyperswitchConfigEntryPublicSchema = z.object({
  publishableKey: z
    .string({ required_error: "Publishable Key is required" })
    .min(1, { message: "Publishable Key is required" }),
  profileId: z
    .string({ required_error: "Profile ID is required" })
    .min(1, { message: "Profile ID is required" }),
});

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

export const hyperswitchConfigEntrySchema = hyperswitchConfigEntryEncryptedSchema
  .merge(hyperswitchConfigEntryPublicSchema)
  .merge(paymentAppConfigEntryInternalSchema);

// Entire config available to user
export const hyperswitchUserVisibleConfigEntrySchema = hyperswitchConfigEntryPublicSchema
  .merge(hyperswitchConfigEntryEncryptedSchema)
  .merge(paymentAppConfigEntryInternalSchema)
  .strict();

export const juspayConfigEntrySchema = juspayConfigEntryPublicSchema
  .merge(juspayConfigEntryEncryptedSchema)
  .merge(paymentAppConfigEntryInternalSchema);

export const juspayUserVisibleConfigEntrySchema = juspayConfigEntryPublicSchema
  .merge(juspayConfigEntryEncryptedSchema)
  .merge(paymentAppConfigEntryInternalSchema)
  .strict();

// Fully configured app - all fields are required
// Zod doesn't have a utility for marking fields as non-nullable, we need to use unwrap
export const hyperswitchFullyConfiguredEntrySchema = z
  .object({
    configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
    configurationId: paymentAppConfigEntryInternalSchema.shape.configurationId,
    apiKey: hyperswitchConfigEntryEncryptedSchema.shape.apiKey,
    paymentResponseHashKey: hyperswitchConfigEntryEncryptedSchema.shape.paymentResponseHashKey,
    publishableKey: hyperswitchConfigEntryPublicSchema.shape.publishableKey,
    profileId: hyperswitchConfigEntryPublicSchema.shape.profileId,
    // webhookSecret: DANGEROUS_paymentAppConfigHiddenSchema.shape.webhookSecret,
    // webhookId: paymentAppConfigEntryInternalSchema.shape.webhookId,
  })
  .required();

export const juspayFullyConfiguredEntrySchema = z
  .object({
    configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
    configurationId: paymentAppConfigEntryInternalSchema.shape.configurationId,
    apiKey: juspayConfigEntryEncryptedSchema.shape.apiKey,
    username: juspayConfigEntryPublicSchema.shape.username,
    password: juspayConfigEntryEncryptedSchema.shape.password,
    clientId: juspayConfigEntryPublicSchema.shape.clientId
  })
  .required();

// Schema used as input validation for saving config entires of hyperswitch
export const hyperswitchFormConfigEntrySchema = z
  .object({
    apiKey: hyperswitchConfigEntryEncryptedSchema.shape.apiKey,
    paymentResponseHashKey: hyperswitchConfigEntryEncryptedSchema.shape.paymentResponseHashKey,
    publishableKey: hyperswitchConfigEntryPublicSchema.shape.publishableKey.startsWith(
      "pk_",
      "This isn't publishable key, it must start with pk_",
    ),
    profileId: hyperswitchConfigEntryPublicSchema.shape.profileId.startsWith(
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

/** Schema used in front-end forms
 * Replaces obfuscated values with null */
export const hyperswitchEncryptedFormSchema = hyperswitchConfigEntryEncryptedSchema.transform(
  (values) => deobfuscateValues(values),
);

// Schema used for front-end forms
export const hyperswitchCombinedFormSchema = z.intersection(
  hyperswitchEncryptedFormSchema,
  hyperswitchConfigEntryPublicSchema,
);

export type PaymentAppInternalConfig = z.infer<typeof paymentAppConfigEntryInternalSchema>;
export type HyperswitchEncryptedConfig = z.infer<typeof hyperswitchConfigEntryEncryptedSchema>;
export type JuspayEncryptedConfig = z.infer<typeof juspayConfigEntryEncryptedSchema>;
export type HyperswitchPublicConfig = z.infer<typeof hyperswitchConfigEntryPublicSchema>;

export type HyperswitchConfigEntry = z.infer<typeof hyperswitchConfigEntrySchema>;
export type JuspayConfigEntry = z.infer<typeof juspayConfigEntrySchema>;
export type HyperswitchConfigEntryFullyConfigured = z.infer<
  typeof hyperswitchFullyConfiguredEntrySchema >;
export type JuspayConfigEntryFullyConfigured = z.infer<
  typeof juspayFullyConfiguredEntrySchema >;
export type HyperswitchUserVisibleConfigEntry = z.infer<
  typeof hyperswitchUserVisibleConfigEntrySchema >;
export type JuspayUserVisibleConfigEntry = z.infer<
  typeof juspayUserVisibleConfigEntrySchema >;
export type HyperswitchFormConfigEntry = z.infer<typeof hyperswitchFormConfigEntrySchema >;
export type JuspayFormConfigEntry = z.infer<typeof juspayFormConfigEntrySchema >;
export type HyperswitchConfigEntryUpdate = Partial<HyperswitchConfigEntry> & {
  configurationId: HyperswitchConfigEntry["configurationId"];
};
export type JuspayConfigEntryUpdate = Partial<JuspayConfigEntry> & {
  configurationId: JuspayConfigEntry["configurationId"];
};