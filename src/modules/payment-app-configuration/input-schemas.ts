import { z } from "zod";
import { hyperswitchFormConfigEntrySchema, juspayFormConfigEntrySchema } from "./config-entry";

export const mappingUpdate = z.object({
  channelId: z.string().min(1),
  configurationId: z.string().nullable(),
});

export const hyperswitchPaymentConfigEntryUpdate = z.object({
  configurationId: z.string().min(1),
  entry: hyperswitchFormConfigEntrySchema,
});

export const juspayPaymentConfigEntryUpdate = z.object({
  configurationId: z.string().min(1),
  entry: juspayFormConfigEntrySchema,
});


export const paymentConfigEntryDelete = z.object({ configurationId: z.string().min(1) });

export type MappingUpdate = z.infer<typeof mappingUpdate>;
export type HyperswitchConfigEntryUpdate = z.infer<typeof hyperswitchPaymentConfigEntryUpdate>;
export type JuspayConfigEntryUpdate = z.infer<typeof juspayPaymentConfigEntryUpdate>;
export type ConfigEntryDelete = z.infer<typeof paymentConfigEntryDelete>;
