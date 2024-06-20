import { obfuscateConfig } from "../app-configuration/utils";
import {
  type PaymentAppConfigEntry,
  type PaymentAppEncryptedConfig,
  type PaymentAppUserVisibleConfigEntry,
  paymentAppUserVisibleConfigEntrySchema,
} from "./config-entry";

export const obfuscateConfigEntry = (
  entry: PaymentAppConfigEntry | PaymentAppUserVisibleConfigEntry,
): PaymentAppUserVisibleConfigEntry => {
  const { apiKey, publishableKey, profileId, configurationName, configurationId} = entry;

  const configValuesToObfuscate = {
    apiKey,
  } satisfies PaymentAppEncryptedConfig;

  return paymentAppUserVisibleConfigEntrySchema.parse({
    publishableKey,
    profileId,
    configurationId,
    configurationName,
    // webhookId,
    ...obfuscateConfig(configValuesToObfuscate),
  } satisfies PaymentAppUserVisibleConfigEntry);
};
