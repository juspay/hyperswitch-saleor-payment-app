import { invariant } from "@/lib/invariant";
import { obfuscateConfig } from "../app-configuration/utils";
import {
  PaymentAppConfigEntry,
  PaymentAppEncryptedConfig,
  PaymentAppUserVisibleConfigEntry,
  paymentAppUserVisibleConfigEntrySchema,
} from "./common-app-configuration/config-entry";

export const obfuscateConfigEntry = (
  entry: PaymentAppConfigEntry | PaymentAppUserVisibleConfigEntry,
): PaymentAppUserVisibleConfigEntry => {
  const { configurationName, configurationId, hyperswitchConfiguration, juspayConfiguration } =
    entry;

  if (juspayConfiguration) {
    const { apiKey, username, merchantId, password, clientId } = juspayConfiguration;
    const configValuesToObfuscate = {
      apiKey,
      password,
      merchantId,
    } satisfies PaymentAppEncryptedConfig["juspayConfiguration"];

    const UserVisibleConfigEntry = obfuscateConfig(configValuesToObfuscate);

    return paymentAppUserVisibleConfigEntrySchema.parse({
      hyperswitchConfiguration: undefined,
      juspayConfiguration: {
        username,
        clientId,
        ...obfuscateConfig(configValuesToObfuscate),
      },
      configurationName,
      configurationId,
    } satisfies PaymentAppUserVisibleConfigEntry);
  } else {
    invariant(hyperswitchConfiguration, "Missing Configuration Entry");

    const { apiKey, paymentResponseHashKey, publishableKey, profileId } = hyperswitchConfiguration;

    const configValuesToObfuscate = {
      apiKey,
      paymentResponseHashKey,
    } satisfies PaymentAppEncryptedConfig["hyperswitchConfiguration"];

    const UserVisibleConfigEntry = obfuscateConfig(configValuesToObfuscate);

    const result = paymentAppUserVisibleConfigEntrySchema.parse({
      juspayConfiguration: undefined,
      hyperswitchConfiguration: {
        publishableKey,
        profileId,
        ...obfuscateConfig(configValuesToObfuscate),
      },
      configurationName,
      configurationId,
    } satisfies PaymentAppUserVisibleConfigEntry);

    return result;
  }
};

export const normalizeValue = (entry: any | undefined | null) => {
  return entry ? entry : undefined;
};
