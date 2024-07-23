import { z } from "zod";
import {
  hyperswitchConfigEntrySchema,
  hyperswitchUserVisibleConfigEntrySchema,
  juspayConfigEntrySchema,
  juspayUserVisibleConfigEntrySchema,
} from "./config-entry";

export const hyperswitchConfigEntriesSchema = hyperswitchConfigEntrySchema.array();
export const juspayConfigEntriesSchema = juspayConfigEntrySchema.array();
export const hyperswitchUserVisibleConfigEntriesSchema = hyperswitchUserVisibleConfigEntrySchema.array();
export const juspayUserVisibleConfigEntriesSchema = juspayUserVisibleConfigEntrySchema.array();

// Record<ChannelID, AppConfigEntryId>
export const channelMappingSchema = z
  .record(z.string().min(1), z.string().min(1).nullable())
  .default({});

export type ChannelMapping = z.infer<typeof channelMappingSchema>;

export const hyperswitchConfigSchema = z
  .object({
    configurations: hyperswitchConfigEntriesSchema,
    channelToConfigurationId: channelMappingSchema,
    lastMigration: z.number().nullish(),
  })
  .default({
    configurations: [],
    channelToConfigurationId: {},
    lastMigration: null,
  });

export const juspayConfigSchema = z
  .object({
    configurations: juspayConfigEntriesSchema,
    channelToConfigurationId: channelMappingSchema,
    lastMigration: z.number().nullish(),
  })
  .default({
    configurations: [],
    channelToConfigurationId: {},
    lastMigration: null,
  });

export const hyperswitchUserVisibleConfigSchema = z
  .object({
    configurations: hyperswitchUserVisibleConfigEntriesSchema,
    channelToConfigurationId: channelMappingSchema,
  })
  .default({
    configurations: [],
    channelToConfigurationId: {},
  });

export const juspayUserVisibleConfigSchema = z
  .object({
    configurations: juspayUserVisibleConfigEntriesSchema,
    channelToConfigurationId: channelMappingSchema,
  })
  .default({
    configurations: [],
    channelToConfigurationId: {},
  });

export const defaultHyperswitchConfig: HyperswitchConfig = {
  configurations: [],
  channelToConfigurationId: {},
};

export const defaultJuspayConfig: JuspayConfig = {
  configurations: [],
  channelToConfigurationId: {},
};

export type HyperswitchConfigEntries = z.infer<typeof hyperswitchConfigEntriesSchema>;
export type JuspayConfigEntries = z.infer<typeof juspayConfigEntriesSchema>;
export type HyperswitchUserVisibleEntries = z.infer<typeof hyperswitchUserVisibleConfigEntriesSchema>;
export type JuspayUserVisibleEntries = z.infer<typeof juspayUserVisibleConfigEntriesSchema>;
export type HyperswitchConfig = z.infer<typeof hyperswitchConfigSchema>;
export type JuspayConfig = z.infer<typeof juspayConfigSchema>;
export type HyperswitchConfigUserVisible = z.infer<typeof hyperswitchUserVisibleConfigSchema>;
export type JuspayConfigUserVisible = z.infer<typeof juspayUserVisibleConfigSchema>;
