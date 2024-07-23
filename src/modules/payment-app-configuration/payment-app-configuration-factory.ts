import { type Client } from "urql";
import { type MetadataEntry } from "@saleor/app-sdk/settings-manager";
import {
  createPrivateSettingsManager,
  createWebhookPrivateSettingsManager,
} from "../app-configuration/metadata-manager";
import { HyperswitchConfigurator, JuspayConfigurator } from "./payment-app-configuration";

export const getHyperswitchConfigurator = (client: Client, saleorApiUrl: string) => {
  return new HyperswitchConfigurator(createPrivateSettingsManager(client), saleorApiUrl);
};

export const getJuspayConfigurator = (client: Client, saleorApiUrl: string) => {
  return new JuspayConfigurator(createPrivateSettingsManager(client), saleorApiUrl);
};

export const getWebhookHyperswitchConfigurator = (
  data: { privateMetadata: readonly Readonly<MetadataEntry>[] },
  saleorApiUrl: string,
) => {
  return new HyperswitchConfigurator(
    createWebhookPrivateSettingsManager(data.privateMetadata as MetadataEntry[]),
    saleorApiUrl,
  );
};

export const getWebhookJuspayConfigurator = (
  data: { privateMetadata: readonly Readonly<MetadataEntry>[] },
  saleorApiUrl: string,
) => {
  return new JuspayConfigurator(
    createWebhookPrivateSettingsManager(data.privateMetadata as MetadataEntry[]),
    saleorApiUrl,
  );
};
