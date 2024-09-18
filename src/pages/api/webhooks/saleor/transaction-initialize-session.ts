import { SaleorSyncWebhook } from "../../../../modules/webhookHandler/saleor-sync-webhook";
import { type PageConfig } from "next";
import { uuidv7 } from "uuidv7";
import { saleorApp } from "@/saleor-app";
import {
  UntypedTransactionInitializeSessionDocument,
  type TransactionInitializeSessionEventFragment,
  TransactionFlowStrategyEnum,
  TransactionEventTypeEnum,
} from "generated/graphql";
import { TransactionInitializeSessionHyperswitchWebhookHandler } from "@/modules/webhooks/hyperswitch/transaction-initialize-session";
import { getSyncWebhookHandler } from "@/backend-lib/api-route-utils";
import { TransactionInitializeSessionJuspayWebhookHandler } from "@/modules/webhooks/juspay/transaction-initialize-session";
import { TransactionInitializeSessionConfigHandler } from "@/modules/webhooks/utils/config-handlers";
import ValidateTransactionInitializeSessionResponse from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

export const transactionInitializeSessionSyncWebhook =
  new SaleorSyncWebhook<TransactionInitializeSessionEventFragment>({
    name: "TransactionInitializeSession",
    apl: saleorApp.apl,
    event: "TRANSACTION_INITIALIZE_SESSION",
    query: UntypedTransactionInitializeSessionDocument,
    webhookPath: "/saleor/api/webhooks/saleor/transaction-initialize-session",
  });

export default transactionInitializeSessionSyncWebhook.createHandler(
  getSyncWebhookHandler(
    "transactionInitializeSessionSyncWebhook",
    TransactionInitializeSessionConfigHandler,
    TransactionInitializeSessionHyperswitchWebhookHandler,
    TransactionInitializeSessionJuspayWebhookHandler,
    ValidateTransactionInitializeSessionResponse,
    (payload, errorResponse) => {
      return {
        amount: payload.action.amount,
        result:
          payload.action.actionType === TransactionFlowStrategyEnum.Authorization
            ? TransactionEventTypeEnum.AuthorizationFailure
            : TransactionEventTypeEnum.ChargeFailure,
        message: errorResponse.message,
        pspReference: "NO_PSP_REFERNCE",
        data: { errors: errorResponse.errors },
      } as const;
    },
  ),
);
