import { encrypt, type MetadataEntry } from "@saleor/app-sdk/settings-manager";
import {
  type GenericAppConfigurator,
  PrivateMetadataAppConfigurator,
} from "../app-configuration/app-configuration";
import { type BrandedEncryptedMetadataManager } from "../app-configuration/metadata-manager";
import { type HyperswitchConfig, hyperswitchConfigSchema, type ChannelMapping, JuspayConfig, juspayConfigSchema } from "./app-config";
import {
  type HyperswitchConfigEntryUpdate,
  type HyperswitchConfigEntry,
  hyperswitchConfigEntrySchema,
  JuspayConfigEntry,
  JuspayConfigEntryUpdate,
  juspayConfigEntrySchema,
} from "./config-entry";
import { obfuscateHyperswitchConfigEntry, obfuscateJuspayConfigEntry } from "./utils";
import { env } from "@/lib/env.mjs";
import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";

export const privateMetadataKey = "payment-app-config-private";
export const hiddenMetadataKey = "payment-app-config-hidden";
export const publicMetadataKey = "payment-app-config-public";

export const AppNotConfiguredError = BaseError.subclass("AppNotConfiguredError");

export class HyperswitchConfigurator implements GenericAppConfigurator<HyperswitchConfig> {
  private configurator: PrivateMetadataAppConfigurator<HyperswitchConfig>;
  public saleorApiUrl: string;

  constructor(privateMetadataManager: BrandedEncryptedMetadataManager, saleorApiUrl: string) {
    this.configurator = new PrivateMetadataAppConfigurator(
      privateMetadataManager,
      saleorApiUrl,
      privateMetadataKey,
    );
    this.saleorApiUrl = saleorApiUrl;
  }

  async getConfig(): Promise<HyperswitchConfig> {
    const config = await this.configurator.getConfig();
    return hyperswitchConfigSchema.parse(config);
  }

  async getConfigObfuscated() {
    const { configurations, channelToConfigurationId } = await this.getConfig();

    return {
      configurations: configurations.map((entry) => obfuscateHyperswitchConfigEntry(entry)),
      channelToConfigurationId,
    };
  }

  async getRawConfig(): Promise<MetadataEntry[]> {
    const encryptFn = (data: string) => encrypt(data, env.SECRET_KEY);

    return this.configurator.getRawConfig(encryptFn);
  }

  async getConfigEntry(configurationId: string): Promise<HyperswitchConfigEntry | null | undefined> {
    const config = await this.configurator.getConfig();
    return config?.configurations.find((entry) => entry.configurationId === configurationId);
  }

  /** Adds new config entry or updates existing one */
  async setConfigEntry(newConfiguration: HyperswitchConfigEntryUpdate) {
    const { configurations } = await this.getConfig();

    const existingEntryIndex = configurations.findIndex(
      (entry) => entry.configurationId === newConfiguration.configurationId,
    );

    // Old entry = allow missing fields (they are already saved)
    if (existingEntryIndex !== -1) {
      const existingEntry = configurations[existingEntryIndex];
      const mergedEntry = {
        ...existingEntry,
        ...newConfiguration,
      };

      const newConfigurations = configurations.slice(0);
      newConfigurations[existingEntryIndex] = mergedEntry;
      return this.setConfig({ configurations: newConfigurations });
    }

    // New entry = check if valid
    const parsedConfig = hyperswitchConfigEntrySchema.parse(newConfiguration);

    return this.setConfig({
      configurations: [...configurations, parsedConfig],
    });
  }

  async deleteHyperswitchConfigEntry(configurationId: string) {
    const oldConfig = await this.getConfig();
    const newConfigurations = oldConfig.configurations.filter(
      (entry) => entry.configurationId !== configurationId,
    );
    const newMappings = Object.fromEntries(
      Object.entries(oldConfig.channelToConfigurationId).filter(
        ([, configId]) => configId !== configurationId,
      ),
    );
    await this.setConfig(
      { ...oldConfig, configurations: newConfigurations, channelToConfigurationId: newMappings },
      true,
    );
  }

  /** Adds new mappings or updates exsting ones */
  async setMapping(newMapping: ChannelMapping) {
    const { channelToConfigurationId } = await this.getConfig();
    return this.setConfig({
      channelToConfigurationId: { ...channelToConfigurationId, ...newMapping },
    });
  }

  async deleteMapping(channelId: string) {
    const { channelToConfigurationId } = await this.getConfig();
    const newMapping = { ...channelToConfigurationId };
    delete newMapping[channelId];
    return this.setConfig({ channelToConfigurationId: newMapping });
  }

  /** Method that directly updates the config in MetadataConfigurator.
   *  You should probably use setConfigEntry or setMapping instead */
  async setConfig(newConfig: Partial<HyperswitchConfig>, replace = false) {
    return this.configurator.setConfig(newConfig, replace);
  }

  async clearConfig() {
    const defaultConfig = hyperswitchConfigSchema.parse(undefined);
    return this.setConfig(defaultConfig, true);
  }
}

export class JuspayConfigurator implements GenericAppConfigurator<JuspayConfig> {
  private configurator: PrivateMetadataAppConfigurator<JuspayConfig>;
  public saleorApiUrl: string;

  constructor(privateMetadataManager: BrandedEncryptedMetadataManager, saleorApiUrl: string) {
    this.configurator = new PrivateMetadataAppConfigurator(
      privateMetadataManager,
      saleorApiUrl,
      privateMetadataKey,
    );
    this.saleorApiUrl = saleorApiUrl;
  }

  async getConfig(): Promise<JuspayConfig> {
    const config = await this.configurator.getConfig();
    return juspayConfigSchema.parse(config);
  }

  async getConfigObfuscated() {
    const { configurations, channelToConfigurationId } = await this.getConfig();

    return {
      configurations: configurations.map((entry) => obfuscateJuspayConfigEntry(entry)),
      channelToConfigurationId,
    };
  }

  async getRawConfig(): Promise<MetadataEntry[]> {
    const encryptFn = (data: string) => encrypt(data, env.SECRET_KEY);

    return this.configurator.getRawConfig(encryptFn);
  }

  async getConfigEntry(configurationId: string): Promise<JuspayConfigEntry | null | undefined> {
    const config = await this.configurator.getConfig();
    return config?.configurations.find((entry) => entry.configurationId === configurationId);
  }

  /** Adds new config entry or updates existing one */
  async setConfigEntry(newConfiguration: JuspayConfigEntryUpdate) {
    const { configurations } = await this.getConfig();

    const existingEntryIndex = configurations.findIndex(
      (entry) => entry.configurationId === newConfiguration.configurationId,
    );

    // Old entry = allow missing fields (they are already saved)
    if (existingEntryIndex !== -1) {
      const existingEntry = configurations[existingEntryIndex];
      const mergedEntry = {
        ...existingEntry,
        ...newConfiguration,
      };

      const newConfigurations = configurations.slice(0);
      newConfigurations[existingEntryIndex] = mergedEntry;
      return this.setConfig({ configurations: newConfigurations });
    }

    // New entry = check if valid
    const parsedConfig = juspayConfigEntrySchema.parse(newConfiguration);

    return this.setConfig({
      configurations: [...configurations, parsedConfig],
    });
  }

  async deleteHyperswitchConfigEntry(configurationId: string) {
    const oldConfig = await this.getConfig();
    const newConfigurations = oldConfig.configurations.filter(
      (entry) => entry.configurationId !== configurationId,
    );
    const newMappings = Object.fromEntries(
      Object.entries(oldConfig.channelToConfigurationId).filter(
        ([, configId]) => configId !== configurationId,
      ),
    );
    await this.setConfig(
      { ...oldConfig, configurations: newConfigurations, channelToConfigurationId: newMappings },
      true,
    );
  }

  /** Adds new mappings or updates exsting ones */
  async setMapping(newMapping: ChannelMapping) {
    const { channelToConfigurationId } = await this.getConfig();
    return this.setConfig({
      channelToConfigurationId: { ...channelToConfigurationId, ...newMapping },
    });
  }

  async deleteMapping(channelId: string) {
    const { channelToConfigurationId } = await this.getConfig();
    const newMapping = { ...channelToConfigurationId };
    delete newMapping[channelId];
    return this.setConfig({ channelToConfigurationId: newMapping });
  }

  /** Method that directly updates the config in MetadataConfigurator.
   *  You should probably use setConfigEntry or setMapping instead */
  async setConfig(newConfig: Partial<JuspayConfig>, replace = false) {
    return this.configurator.setConfig(newConfig, replace);
  }

  async clearConfig() {
    const defaultConfig = juspayConfigSchema.parse(undefined);
    return this.setConfig(defaultConfig, true);
  }
}

export const getConfigurationForHyperswitchChannel = (
  appConfig: HyperswitchConfig,
  channelId?: string | undefined | null,
) => {
  const logger = createLogger({ channelId }, { msgPrefix: "[getConfigurationForHyperswitchChannel] " });
  if (!channelId) {
    logger.warn("Missing channelId");
    return null;
  }
  const configurationId = appConfig.channelToConfigurationId[channelId];
  if (!configurationId) {
    logger.warn(`Missing mapping for channelId ${channelId}`);
    return null;
  }
  const perChannelConfig = appConfig.configurations.find(
    (config) => config.configurationId === configurationId,
  );
  if (!perChannelConfig) {
    logger.warn({ configurationId }, "Missing configuration for configurationId");
    return null;
  }
  return perChannelConfig;
};

export const getConfigurationForJuspayChannel = (
  appConfig: JuspayConfig,
  channelId?: string | undefined | null,
) => {
  const logger = createLogger({ channelId }, { msgPrefix: "[getConfigurationForJuspayChannel] " });
  if (!channelId) {
    logger.warn("Missing channelId");
    return null;
  }
  const configurationId = appConfig.channelToConfigurationId[channelId];
  if (!configurationId) {
    logger.warn(`Missing mapping for channelId ${channelId}`);
    return null;
  }
  const perChannelConfig = appConfig.configurations.find(
    (config) => config.configurationId === configurationId,
  );
  if (!perChannelConfig) {
    logger.warn({ configurationId }, "Missing configuration for configurationId");
    return null;
  }
  return perChannelConfig;
};
