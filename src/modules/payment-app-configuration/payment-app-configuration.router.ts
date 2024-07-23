import { z } from "zod";
import { protectedClientProcedure } from "../trpc/protected-client-procedure";
import { router } from "../trpc/trpc-server";
import { channelMappingSchema, hyperswitchUserVisibleConfigEntriesSchema, juspayUserVisibleConfigEntriesSchema } from "./app-config";
import { mappingUpdate, paymentConfigEntryDelete, hyperswitchPaymentConfigEntryUpdate, juspayPaymentConfigEntryUpdate } from "./input-schemas";
import { getMappingFromAppConfig, setMappingInAppConfig } from "./mapping-manager";
import { getHyperswitchConfigurator, getJuspayConfigurator } from "./payment-app-configuration-factory";
import {
  hyperswitchFormConfigEntrySchema,
  hyperswitchUserVisibleConfigEntrySchema,
  juspayFormConfigEntrySchema,
  juspayUserVisibleConfigEntrySchema
} from "./config-entry";
import {
  addHyperswitchConfigEntry,
  addJuspayConfigEntry,
  deleteHyperswitchConfigEntry,
  deleteJuspayConfigEntry,
  getAllHyperswitchConfigEntriesObfuscated,
  getAllJuspayConfigEntriesObfuscated,
  getHyperswitchConfigEntryObfuscated,
  getJuspayConfigEntryObfuscated,
  updateHyperswitchConfigEntry,
  updateJuspayConfigEntry,
} from "./config-manager";
import { redactLogValue } from "@/lib/logger";
import { invariant } from "@/lib/invariant";

export const hyperswitchConfigurationRouter = router({
  mapping: router({
    getAll: protectedClientProcedure.output(channelMappingSchema).query(async ({ ctx }) => {
      ctx.logger.info("appConfigurationRouter.mapping.getAll called");
      const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
      return getMappingFromAppConfig(ctx.apiClient, configurator);
    }),
    update: protectedClientProcedure
      .input(mappingUpdate)
      .output(channelMappingSchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationId, channelId } = input;
        ctx.logger.info(
          { configurationId, channelId },
          "appConfigurationRouter.mapping.update called",
        );

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return setMappingInAppConfig(input, configurator);
      }),
  }),
  paymentConfig: router({
    get: protectedClientProcedure
      .input(z.object({ configurationId: z.string() }))
      .output(hyperswitchUserVisibleConfigEntrySchema)
      .query(async ({ input, ctx }) => {
        const { configurationId } = input;
        ctx.logger.info({ configurationId }, "appConfigurationRouter.paymentConfig.getAll called");

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return getHyperswitchConfigEntryObfuscated(input.configurationId, configurator);
      }),
    getAll: protectedClientProcedure
      .output(hyperswitchUserVisibleConfigEntriesSchema)
      .query(async ({ ctx }) => {
        ctx.logger.info("appConfigurationRouter.paymentConfig.getAll called");
        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return getAllHyperswitchConfigEntriesObfuscated(configurator);
      }),
    add: protectedClientProcedure
      .input(hyperswitchFormConfigEntrySchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationName, apiKey, paymentResponseHashKey, publishableKey, profileId } =
          input;
        ctx.logger.info("appConfigurationRouter.paymentConfig.add called");
        ctx.logger.debug(
          {
            configurationName,
            apiKey: redactLogValue(apiKey),
            paymentResponseHashKey: redactLogValue(paymentResponseHashKey),
            publishableKey: redactLogValue(publishableKey),
            profileId: profileId,
          },
          "appConfigurationRouter.paymentConfig.add input",
        );
        invariant(ctx.appUrl, "Missing app url");

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return addHyperswitchConfigEntry(input, configurator, ctx.appUrl);
      }),
    update: protectedClientProcedure
      .input(hyperswitchPaymentConfigEntryUpdate)
      .output(hyperswitchUserVisibleConfigEntrySchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationId, entry } = input;
        const { apiKey, paymentResponseHashKey, publishableKey, profileId, configurationName } =
          entry;
        ctx.logger.info("appConfigurationRouter.paymentConfig.update called");
        ctx.logger.debug(
          {
            configurationId,
            entry: {
              apiKey,
              paymentResponseHashKey,
              publishableKey,
              profileId,
              configurationName,
            },
          },
          "appConfigurationRouter.paymentConfig.update input",
        );
        invariant(ctx.appUrl, "Missing app URL");

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return updateHyperswitchConfigEntry(input, configurator);
      }),
    delete: protectedClientProcedure
      .input(paymentConfigEntryDelete)
      .mutation(async ({ input, ctx }) => {
        const { configurationId } = input;
        ctx.logger.info({ configurationId }, "appConfigurationRouter.paymentConfig.delete called");

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return deleteHyperswitchConfigEntry(configurationId, configurator);
      }),
  }),
});

export const juspayConfigurationRouter = router({
  mapping: router({
    getAll: protectedClientProcedure.output(channelMappingSchema).query(async ({ ctx }) => {
      ctx.logger.info("appConfigurationRouter.mapping.getAll called");
      const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
      return getMappingFromAppConfig(ctx.apiClient, configurator);
    }),
    update: protectedClientProcedure
      .input(mappingUpdate)
      .output(channelMappingSchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationId, channelId } = input;
        ctx.logger.info(
          { configurationId, channelId },
          "appConfigurationRouter.mapping.update called",
        );

        const configurator = getHyperswitchConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return setMappingInAppConfig(input, configurator);
      }),
  }),
  paymentConfig: router({
    get: protectedClientProcedure
      .input(z.object({ configurationId: z.string() }))
      .output(juspayUserVisibleConfigEntrySchema)
      .query(async ({ input, ctx }) => {
        const { configurationId } = input;
        ctx.logger.info({ configurationId }, "appConfigurationRouter.paymentConfig.getAll called");

        const configurator = getJuspayConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return getJuspayConfigEntryObfuscated(input.configurationId, configurator);
      }),
    getAll: protectedClientProcedure
      .output(juspayUserVisibleConfigEntriesSchema)
      .query(async ({ ctx }) => {
        ctx.logger.info("appConfigurationRouter.paymentConfig.getAll called");
        const configurator = getJuspayConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return getAllJuspayConfigEntriesObfuscated(configurator);
      }),
    add: protectedClientProcedure
      .input(juspayFormConfigEntrySchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationName, apiKey, username, password, clientId } =
          input;
        ctx.logger.info("appConfigurationRouter.paymentConfig.add called");
        ctx.logger.debug(
          {
            configurationName,
            apiKey: redactLogValue(apiKey),
            username: redactLogValue(username),
            password: redactLogValue(password),
            clientId: clientId,
          },
          "appConfigurationRouter.paymentConfig.add input",
        );
        invariant(ctx.appUrl, "Missing app url");

        const configurator = getJuspayConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return addJuspayConfigEntry(input, configurator, ctx.appUrl);
      }),
    update: protectedClientProcedure
      .input(juspayPaymentConfigEntryUpdate)
      .output(juspayUserVisibleConfigEntrySchema)
      .mutation(async ({ input, ctx }) => {
        const { configurationId, entry } = input;
        const { apiKey, username, password, clientId, configurationName } =
          entry;
        ctx.logger.info("appConfigurationRouter.paymentConfig.update called");
        ctx.logger.debug(
          {
            configurationId,
            entry: {
              apiKey,
              username,
              password,
              clientId,
              configurationName,
            },
          },
          "appConfigurationRouter.paymentConfig.update input",
        );
        invariant(ctx.appUrl, "Missing app URL");

        const configurator = getJuspayConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return updateJuspayConfigEntry(input, configurator);
      }),
    delete: protectedClientProcedure
      .input(paymentConfigEntryDelete)
      .mutation(async ({ input, ctx }) => {
        const { configurationId } = input;
        ctx.logger.info({ configurationId }, "appConfigurationRouter.paymentConfig.delete called");

        const configurator = getJuspayConfigurator(ctx.apiClient, ctx.saleorApiUrl);
        return deleteJuspayConfigEntry(configurationId, configurator);
      }),
  }),
});
