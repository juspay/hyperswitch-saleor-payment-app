import { z } from "zod";
import { paymentAppConfigEntryInternalSchema } from "../common-app-configuration/config-entry";

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

export const hyperswitchConfigEntrySchema = hyperswitchConfigEntryEncryptedSchema.merge(
  hyperswitchConfigEntryPublicSchema,
);

export const hyperswitchFullyConfiguredEntrySchema = z
  .object({
    apiKey: hyperswitchConfigEntryEncryptedSchema.shape.apiKey,
    paymentResponseHashKey: hyperswitchConfigEntryEncryptedSchema.shape.paymentResponseHashKey,
    publishableKey: hyperswitchConfigEntryPublicSchema.shape.publishableKey,
    profileId: hyperswitchConfigEntryPublicSchema.shape.profileId,
  })
  .required();

export const hyperswitchUserVisibleConfigEntrySchema = hyperswitchConfigEntryPublicSchema
  .merge(hyperswitchConfigEntryEncryptedSchema)
  .strict();

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
      "This isn't profile Id, it must start with pro_",
    ),
  })
  .strict()
  .default({
    apiKey: "",
    paymentResponseHashKey: "",
    publishableKey: "",
    profileId: "",
  });

export type HyperswitchUserVisibleConfigEntry = z.infer<
  typeof hyperswitchUserVisibleConfigEntrySchema
>;
export type HyperswitchFullyConfiguredEntry = z.infer<typeof hyperswitchFullyConfiguredEntrySchema>;
