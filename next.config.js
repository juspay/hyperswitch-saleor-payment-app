// @ts-check
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";
const withVanillaExtract = createVanillaExtractPlugin();
import { withSentryConfig } from "@sentry/nextjs";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// !process.env.SKIP_ENV_VALIDATION && (await import("./src/lib/env.mjs"));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  basePath: "/saleor",
  /** @param { import("webpack").Configuration } config */
  webpack(config) {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    // Ensure `plugins` is initialized
    config.plugins = config.plugins || [];

    // Now safely push the plugin
    config.plugins.push(new NodePolyfillPlugin());
    return config;
  },
};

const isSentryEnabled = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

const vanillaExtractConfig = withVanillaExtract(config);

export default isSentryEnabled
  ? withSentryConfig(vanillaExtractConfig, { silent: true }, { hideSourceMaps: true })
  : vanillaExtractConfig;
