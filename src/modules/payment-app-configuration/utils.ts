import { obfuscateConfig } from "../app-configuration/utils";
import {
  type HyperswitchConfigEntry,
  type HyperswitchEncryptedConfig,
  type HyperswitchUserVisibleConfigEntry,
  hyperswitchUserVisibleConfigEntrySchema,
  JuspayConfigEntry,
  JuspayUserVisibleConfigEntry,
  JuspayEncryptedConfig,
  juspayUserVisibleConfigEntrySchema,
} from "./config-entry";

export const obfuscateHyperswitchConfigEntry = (
  entry: HyperswitchConfigEntry | HyperswitchUserVisibleConfigEntry,
): HyperswitchUserVisibleConfigEntry => {
  const {
    apiKey,
    paymentResponseHashKey,
    publishableKey,
    profileId,
    configurationName,
    configurationId,
  } = entry;

  const configValuesToObfuscate = {
    apiKey,
    paymentResponseHashKey,
  } satisfies HyperswitchEncryptedConfig;

  return hyperswitchUserVisibleConfigEntrySchema.parse({
    publishableKey,
    profileId,
    configurationId,
    configurationName,
    ...obfuscateConfig(configValuesToObfuscate),
  } satisfies HyperswitchUserVisibleConfigEntry);
};

export const obfuscateJuspayConfigEntry = (
  entry: JuspayConfigEntry | JuspayUserVisibleConfigEntry,
): JuspayUserVisibleConfigEntry => {
  const {
    apiKey,
    username,
    password,
    clientId,
    configurationName,
    configurationId,
  } = entry;

  const configValuesToObfuscate = {
    apiKey,
    password,
  } satisfies JuspayEncryptedConfig;

  return juspayUserVisibleConfigEntrySchema.parse({
    username,
    clientId,
    configurationId,
    configurationName,
    ...obfuscateConfig(configValuesToObfuscate),
  } satisfies JuspayUserVisibleConfigEntry);
};

export const normalizeValue = (entry: any | undefined | null) => {
  return entry ? entry : undefined;
};
