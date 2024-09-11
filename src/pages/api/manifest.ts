import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/saleor/payment-gateway-initialize-session";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/saleor/transaction-initialize-session";
import { transactionChargeRequestedSyncWebhook } from "./webhooks/saleor/transaction-charge-requested";
import { transactionRefundRequestedSyncWebhook } from "./webhooks/saleor/transaction-refund-requested";
import { transactionCancelationRequestedSyncWebhook } from "./webhooks/saleor/transaction-cancelation-requested";
import { transactionProcessSessionSyncWebhook } from "./webhooks/saleor/transaction-process-session";
import { env } from "@/lib/env.mjs";

export default createManifestHandler({
  async manifestFactory(context) {
    const manifest: AppManifest = {
      id: "app.saleor.juspay",
      name: "Juspay",
      about: packageJson.description,
      tokenTargetUrl: `${env.NEXT_PUBLIC_BASE_URL}/api/register`,
      appUrl: `${env.NEXT_PUBLIC_BASE_URL}`,
      permissions: ["HANDLE_PAYMENTS"],
      version: packageJson.version,
      requiredSaleorVersion: ">=3.14.0",
      homepageUrl: "https://github.com/juspay/hyperswitch-saleor-payment-app",
      supportUrl: "https://github.com/juspay/hyperswitch-saleor-payment-app/issues",
      brand: {
        logo: {
          default: `${env.NEXT_PUBLIC_BASE_URL}/logo.png`,
        },
      },
      webhooks: [
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
        transactionInitializeSessionSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
        transactionChargeRequestedSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
        transactionCancelationRequestedSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
        transactionRefundRequestedSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
        transactionProcessSessionSyncWebhook.getWebhookManifest(env.NEXT_PUBLIC_BASE_URL),
      ],
      extensions: [],
    };

    return manifest;
  },
});
