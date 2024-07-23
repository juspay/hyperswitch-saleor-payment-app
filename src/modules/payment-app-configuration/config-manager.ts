import { uuidv7 } from "uuidv7";
import { type HyperswitchConfigEntryUpdate, JuspayConfigEntryUpdate } from "./input-schemas";
import { obfuscateHyperswitchConfigEntry, obfuscateJuspayConfigEntry } from "./utils";
import { JuspayConfigurator, type HyperswitchConfigurator } from "./payment-app-configuration";
import {
  JuspayFormConfigEntry,
  type HyperswitchConfigEntryFullyConfigured,
  type HyperswitchFormConfigEntry,
  JuspayConfigEntryFullyConfigured,
} from "./config-entry";
import { createLogger, redactError, redactLogObject } from "@/lib/logger";
import { BaseError } from "@/errors";

export const EntryNotFoundError = BaseError.subclass("EntryNotFoundError");

export const getAllHyperswitchConfigEntriesObfuscated = async (configurator: HyperswitchConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllHyperswitchConfigEntriesObfuscated] " },
  );

  const config = await configurator.getConfigObfuscated();
  logger.debug("Got obfuscated config");

  return config.configurations;
};

export const getAllJuspayConfigEntriesObfuscated = async (configurator: JuspayConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllJuspayConfigEntriesObfuscated] " },
  );

  const config = await configurator.getConfigObfuscated();
  logger.debug("Got obfuscated config");

  return config.configurations;
};

export const getAllHyperswitchConfigEntriesDecrypted = async (configurator: HyperswitchConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllHyperswitchConfigEntriesDecrypted] " },
  );

  const config = await configurator.getConfig();
  logger.debug("Got config");

  return config.configurations;
};

export const getAllJuspayConfigEntriesDecrypted = async (configurator: JuspayConfigurator) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getAllJuspayConfigEntriesDecrypted] " },
  );

  const config = await configurator.getConfig();
  logger.debug("Got config");

  return config.configurations;
};

export const getHyperswitchConfigEntryObfuscated = async (
  configurationId: string,
  configurator: HyperswitchConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getHyperswitchConfigEntryObfuscated] " },
  );
  logger.debug("Fetching all config entries");
  const entries = await getAllHyperswitchConfigEntriesObfuscated(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const getJuspayConfigEntryObfuscated = async (
  configurationId: string,
  configurator: JuspayConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getJuspayConfigEntryObfuscated] " },
  );
  logger.debug("Fetching all config entries");
  const entries = await getAllJuspayConfigEntriesObfuscated(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const getHyperswitchConfigEntryDecrypted = async (
  configurationId: string,
  configurator: HyperswitchConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getHyperswitchConfigEntryDecrypted] " },
  );

  logger.debug("Fetching all config entries");
  const entries = await getAllHyperswitchConfigEntriesDecrypted(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const getJuspayConfigEntryDecrypted = async (
  configurationId: string,
  configurator: JuspayConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[getHyperswitchConfigEntryDecrypted] " },
  );

  logger.debug("Fetching all config entries");
  const entries = await getAllJuspayConfigEntriesDecrypted(configurator);
  const entry = entries.find((entry) => entry.configurationId === configurationId);
  if (!entry) {
    logger.warn("Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }
  logger.debug({ entryName: entry.configurationName }, "Found entry");
  return entry;
};

export const addHyperswitchConfigEntry = async (
  newConfigEntry: HyperswitchFormConfigEntry,
  configurator: HyperswitchConfigurator,
  appUrl: string,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[addHyperswitchConfigEntry] " },
  );

  logger.debug("Creating new webhook for config entry");

  const uuid = uuidv7();
  const config = {
    ...newConfigEntry,
    configurationId: uuid,
  } satisfies HyperswitchConfigEntryFullyConfigured;

  // webhookSecret,
  // webhookId,

  logger.debug({ config: redactLogObject(config) }, "Adding new config entry");
  await configurator.setConfigEntry(config);
  logger.info({ configurationId: config.configurationId }, "Config entry added");

  return obfuscateHyperswitchConfigEntry(config);
};

export const addJuspayConfigEntry = async (
  newConfigEntry: JuspayFormConfigEntry,
  configurator: JuspayConfigurator,
  appUrl: string,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[addJuspayConfigEntry] " },
  );

  logger.debug("Creating new webhook for config entry");

  const uuid = uuidv7();
  const config = {
    ...newConfigEntry,
    configurationId: uuid,
  } satisfies JuspayConfigEntryFullyConfigured;

  // webhookSecret,
  // webhookId,

  logger.debug({ config: redactLogObject(config) }, "Adding new config entry");
  await configurator.setConfigEntry(config);
  logger.info({ configurationId: config.configurationId }, "Config entry added");

  return obfuscateJuspayConfigEntry(config);
};

export const updateHyperswitchConfigEntry = async (
  input: HyperswitchConfigEntryUpdate,
  configurator: HyperswitchConfigurator,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[updateHyperswitchConfigEntry] " },
  );

  const { entry, configurationId } = input;
  logger.debug("Checking if config entry with provided ID exists");
  const existingEntry = await getHyperswitchConfigEntryDecrypted(configurationId, configurator);
  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  await configurator.setConfigEntry({
    ...entry,
    configurationId,
  });
  logger.info({ configurationId }, "Config entry updated");

  return obfuscateHyperswitchConfigEntry({
    ...existingEntry,
    ...entry,
  });
};

export const updateJuspayConfigEntry = async (
  input: JuspayConfigEntryUpdate,
  configurator: JuspayConfigurator,
) => {
  const logger = createLogger(
    { saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[updateHyperswitchConfigEntry] " },
  );

  const { entry, configurationId } = input;
  logger.debug("Checking if config entry with provided ID exists");
  const existingEntry = await getJuspayConfigEntryDecrypted(configurationId, configurator);
  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  await configurator.setConfigEntry({
    ...entry,
    configurationId,
  });
  logger.info({ configurationId }, "Config entry updated");

  return obfuscateJuspayConfigEntry({
    ...existingEntry,
    ...entry,
  });
};

export const deleteHyperswitchConfigEntry = async (
  configurationId: string,
  configurator: HyperswitchConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[deleteHyperswitchConfigEntry] " },
  );

  logger.debug("Checking if config entry with provided ID exists");
  const entries = await getAllHyperswitchConfigEntriesDecrypted(configurator);
  const existingEntry = entries.find((entry) => entry.configurationId === configurationId);

  if (!existingEntry) {
    logger.error({ configurationId }, "Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }

  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  const otherEntries = entries.filter((entry) => entry.configurationId !== configurationId);

  await configurator.deleteHyperswitchConfigEntry(configurationId);
  logger.info({ configurationId }, "Config entry deleted");
};

export const deleteJuspayConfigEntry = async (
  configurationId: string,
  configurator: JuspayConfigurator,
) => {
  const logger = createLogger(
    { configurationId, saleorApiUrl: configurator.saleorApiUrl },
    { msgPrefix: "[deleteJuspayConfigEntry] " },
  );

  logger.debug("Checking if config entry with provided ID exists");
  const entries = await getAllJuspayConfigEntriesDecrypted(configurator);
  const existingEntry = entries.find((entry) => entry.configurationId === configurationId);

  if (!existingEntry) {
    logger.error({ configurationId }, "Entry was not found");
    throw new EntryNotFoundError(`Entry with id ${configurationId} was not found`);
  }

  logger.debug({ existingEntry: redactLogObject(existingEntry) }, "Found entry");

  const otherEntries = entries.filter((entry) => entry.configurationId !== configurationId);

  await configurator.deleteHyperswitchConfigEntry(configurationId);
  logger.info({ configurationId }, "Config entry deleted");
};
