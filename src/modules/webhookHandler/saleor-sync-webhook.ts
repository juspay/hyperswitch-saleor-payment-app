import { NextApiHandler } from "next";

import { SyncWebhookEventType } from "@saleor/app-sdk/types";
import { NextWebhookApiHandler } from "@saleor/app-sdk/handlers/next/index";
import { SaleorWebhook, WebhookConfig } from "./saleor-webhook";
import { buildSyncWebhookResponsePayload } from "./sync-webhook-response-builder";

type InjectedContext<TEvent extends SyncWebhookEventType> = {
  buildResponse: typeof buildSyncWebhookResponsePayload<TEvent>;
};

export class SaleorSyncWebhook<
  TPayload = unknown,
  TEvent extends SyncWebhookEventType = SyncWebhookEventType,
> extends SaleorWebhook<TPayload, InjectedContext<TEvent>> {
  readonly event: TEvent;

  protected readonly eventType = "sync" as const;

  protected extraContext = {
    buildResponse: buildSyncWebhookResponsePayload,
  };

  constructor(configuration: WebhookConfig<TEvent>) {
    super(configuration);

    this.event = configuration.event;
  }

  createHandler(
    handlerFn: NextWebhookApiHandler<
      TPayload,
      {
        buildResponse: typeof buildSyncWebhookResponsePayload<TEvent>;
      }
    >,
  ): NextApiHandler {
    return super.createHandler(handlerFn);
  }
}
