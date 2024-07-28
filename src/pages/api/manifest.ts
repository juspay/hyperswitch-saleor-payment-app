import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/saleor/payment-gateway-initialize-session";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/saleor/transaction-initialize-session";
import { transactionChargeRequestedSyncWebhook } from "./webhooks/saleor/transaction-charge-requested";
import { transactionRefundRequestedSyncWebhook } from "./webhooks/saleor/transaction-refund-requested";
import { transactionCancelationRequestedSyncWebhook } from "./webhooks/saleor/transaction-cancelation-requested";
import { transactionProcessSessionSyncWebhook } from "./webhooks/saleor/transaction-process-session";

export default createManifestHandler({
  async manifestFactory(context) {
    const manifest: AppManifest = {
      id: "app.saleor.hyperswitch14",
      name: "Hyperswitch14",
      about: packageJson.description,
      tokenTargetUrl: `${context.appBaseUrl}/api/register`,
      appUrl: `${context.appBaseUrl}`,
      permissions: ["HANDLE_PAYMENTS"],
      version: packageJson.version,
      requiredSaleorVersion: ">=3.14.0",
      homepageUrl: "https://github.com/juspay/hyperswitch-saleor-payment-app",
      supportUrl: "https://github.com/juspay/hyperswitch-saleor-payment-app/issues",
      brand: {
        logo: {
          default: `${context.appBaseUrl}/logo.png`,
        },
      },
      webhooks: [
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionChargeRequestedSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionCancelationRequestedSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionRefundRequestedSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionProcessSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
      ],
      extensions: [],
    };

    return manifest;
  },
});
