import { uuidv7 } from "uuidv7";

import { SaleorSyncWebhook } from "../../../../modules/webhookHandler/saleor-sync-webhook";
import { type PageConfig } from "next";
import { saleorApp } from "@/saleor-app";
import {
  UntypedTransactionCancelationRequestedDocument,
  type TransactionCancelationRequestedEventFragment,
  TransactionEventTypeEnum,
} from "generated/graphql";
import { getSyncWebhookHandler } from "@/backend-lib/api-route-utils";
import { TransactionCancelationRequestedHyperswitchWebhookHandler } from "@/modules/webhooks/hyperswitch/transaction-cancelation-requested";
import { TransactionCancelationRequestedJuspayWebhookHandler } from "@/modules/webhooks/juspay/transaction-cancelation-requested";
import { TransactionCancelationRequestedConfigHandler } from "@/modules/webhooks/utils/config-handlers";
import ValidateTransactionCancelationRequestedResponse from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

export const transactionCancelationRequestedSyncWebhook =
  new SaleorSyncWebhook<TransactionCancelationRequestedEventFragment>({
    name: "TransactionCancelationRequested",
    apl: saleorApp.apl,
    event: "TRANSACTION_CANCELATION_REQUESTED",
    query: UntypedTransactionCancelationRequestedDocument,
    webhookPath: "/saleor/api/webhooks/saleor/transaction-cancelation-requested",
  });

export default transactionCancelationRequestedSyncWebhook.createHandler(
  getSyncWebhookHandler(
    "transactionCancelationRequestedSyncWebhook",
    TransactionCancelationRequestedConfigHandler,
    TransactionCancelationRequestedHyperswitchWebhookHandler,
    TransactionCancelationRequestedJuspayWebhookHandler,
    ValidateTransactionCancelationRequestedResponse,
    (payload, errorResponse) => {
      return {
        message: errorResponse.message,
        result: TransactionEventTypeEnum.CancelFailure,
        pspReference: payload.transaction?.pspReference,
      } as const;
    },
  ),
);
