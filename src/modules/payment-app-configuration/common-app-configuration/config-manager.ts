import { uuidv7 } from "uuidv7";
import { type ConfigEntryUpdate } from "../input-schemas";
import { obfuscateConfigEntry } from "../utils";
import { type PaymentAppConfigurator } from "../payment-app-configuration";
import { createLogger, redactError, redactLogObject } from "@/lib/logger";
import { BaseError } from "@/errors";
import { PaymentAppConfigEntryFullyConfigured, PaymentAppFormConfigEntry } from "./config-entry";
import { invariant } from "@/lib/invariant";

export const EntryNotFoundError = BaseError.subclass("EntryNotFoundError");

export const getAllConfigEntriesObfuscated = async (configurator: PaymentAppConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllConfigEntriesObfuscated] " },
  );

  const config = await configurator.getConfigObfuscated();
  logger.debug("Got obfuscated config");

  return config.configurations;
};

export const getAllConfigEntriesDecrypted = async (configurator: PaymentAppConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllConfigEntriesDecrypted] " },
  );

  const config = await configurator.getConfig();
  logger.debug("Got config");

  return config.configurations;
};

export const getConfigEntryObfuscated = async (
  configurationId: string,
  configurator: PaymentAppConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getConfigEntryObfuscated] " },
  );
  logger.debug("Fetching all config entries");
  const entries = await getAllConfigEntriesObfuscated(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const getConfigEntryDecrypted = async (
  configurationId: string,
  configurator: PaymentAppConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getConfigEntryDecrypted] " },
  );

  logger.debug("Fetching all config entries");
  const entries = await getAllConfigEntriesDecrypted(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const addConfigEntry = async (
  newConfigEntry: PaymentAppFormConfigEntry,
  configurator: PaymentAppConfigurator,
  _appUrl: string,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[addConfigEntry] " },
  );

  const uuid = uuidv7();

  if (newConfigEntry.hyperswitchConfiguration) {
    const config = {
      hyperswitchConfiguration: {
        apiKey: newConfigEntry.hyperswitchConfiguration.apiKey,
        paymentResponseHashKey: newConfigEntry.hyperswitchConfiguration.paymentResponseHashKey,
        publishableKey: newConfigEntry.hyperswitchConfiguration.publishableKey,
        profileId: newConfigEntry.hyperswitchConfiguration.profileId,
      },
      juspayConfiguration: undefined,
      configurationName: newConfigEntry.configurationName,
      configurationId: uuid,
    } satisfies PaymentAppConfigEntryFullyConfigured;
    await configurator.setConfigEntry(config);
    const result = obfuscateConfigEntry(config);
    return result;
  } else {
    invariant(newConfigEntry.juspayConfiguration, "Missing Configuration Entry");
    const config = {
      hyperswitchConfiguration: undefined,
      juspayConfiguration: {
        apiKey: newConfigEntry.juspayConfiguration.apiKey,
        clientId: newConfigEntry.juspayConfiguration.clientId,
        username: newConfigEntry.juspayConfiguration.username,
        password: newConfigEntry.juspayConfiguration.password,
      },
      configurationName: newConfigEntry.configurationName,
      configurationId: uuid,
    } satisfies PaymentAppConfigEntryFullyConfigured;
    await configurator.setConfigEntry(config);
    return obfuscateConfigEntry(config);
  }
};

export const updateConfigEntry = async (
  input: ConfigEntryUpdate,
  configurator: PaymentAppConfigurator,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[updateConfigEntry] " },
  );

  const { entry, configurationId } = input;
  logger.debug("Checking if config entry with provided ID exists");
  const existingEntry = await getConfigEntryDecrypted(configurationId, configurator);
  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  await configurator.setConfigEntry({
    ...entry,
    configurationId,
  });
  logger.info({ configurationId }, "Config entry updated");

  return obfuscateConfigEntry({
    ...existingEntry,
    ...entry,
  });
};

export const deleteConfigEntry = async (
  configurationId: string,
  configurator: PaymentAppConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[deleteConfigEntry] " },
  );

  logger.debug("Checking if config entry with provided ID exists");
  const entries = await getAllConfigEntriesDecrypted(configurator);
  const existingEntry = entries.find((entry) => entry.configurationId === configurationId);

  if (!existingEntry) {
    logger.error({ configurationId }, "Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }

  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  const otherEntries = entries.filter((entry) => entry.configurationId !== configurationId);

  await configurator.deleteConfigEntry(configurationId);
  logger.info({ configurationId }, "Config entry deleted");
};
