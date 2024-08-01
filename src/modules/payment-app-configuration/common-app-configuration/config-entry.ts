import { z } from "zod";
import {
  juspayConfigEntryEncryptedSchema,
  juspayConfigEntryPublicSchema,
  juspayConfigEntrySchema,
  juspayFullyConfiguredEntrySchema,
  juspayUserVisibleConfigEntrySchema,
  juspayFormConfigEntrySchema,
} from "../juspay-app-configuration/config-entry";
import {
  hyperswitchConfigEntryEncryptedSchema,
  hyperswitchConfigEntryPublicSchema,
  hyperswitchConfigEntrySchema,
  hyperswitchFormConfigEntrySchema,
  hyperswitchFullyConfiguredEntrySchema,
  hyperswitchUserVisibleConfigEntrySchema,
} from "../hyperswitch-app-configuration/config-entry";

export const paymentAppConfigEntryInternalSchema = z.object({
  configurationId: z.string().min(1),
  configurationName: z.string().min(1),
});

export const paymentAppConfigEntryEncryptedSchema = z.object({
  hyperswitchConfiguration: hyperswitchConfigEntryEncryptedSchema.nullable().optional(),
  juspayConfiguration: juspayConfigEntryEncryptedSchema.nullable().optional(),
});

export const paymentAppConfigEntryPublicSchema = z.object({
  hyperswitchConfiguration: hyperswitchConfigEntryPublicSchema.nullable().optional(),
  juspayConfiguration: juspayConfigEntryPublicSchema.nullable().optional(),
});

export const paymentAppConfigEntrySchema = z
  .object({
    hyperswitchConfiguration: hyperswitchConfigEntrySchema.nullable().optional(),
    juspayConfiguration: juspayConfigEntrySchema.nullable().optional(),
  })
  .merge(paymentAppConfigEntryInternalSchema);

export const paymentAppFullyConfiguredEntrySchema = z
  .object({
    hyperswitchConfiguration: hyperswitchFullyConfiguredEntrySchema.nullable().optional(),
    juspayConfiguration: juspayFullyConfiguredEntrySchema.nullable().optional(),
  })
  .merge(paymentAppConfigEntryInternalSchema);

export const paymentAppUserVisibleConfigEntrySchema = z
  .object({
    hyperswitchConfiguration: hyperswitchUserVisibleConfigEntrySchema.nullable().optional(),
    juspayConfiguration: juspayUserVisibleConfigEntrySchema.nullable().optional(),
  })
  .merge(paymentAppConfigEntryInternalSchema)
  .strict();

export const paymentAppFormConfigEntrySchema = z
  .object({
    hyperswitchConfiguration: hyperswitchFormConfigEntrySchema.nullable().optional(),
    juspayConfiguration: juspayFormConfigEntrySchema.nullable().optional(),
    configurationName: paymentAppConfigEntryInternalSchema.shape.configurationName,
  })
  .strict();

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
