<div align="center">
</div>

<div align="center">
  <h1>Hyperswitch Saleor Payments App</h1>
</div>

<div align="center">
  <p>Saleor Payments via Hyperswitch</p>
</div>

<img alt="saleor-app-template" src="./public/switch.png">

## Hyperswitch

Hyperswitch is a community-led, open payments switch that provides access to the best payments infrastructure for every digital business. By using Hyperswitch, you can reduce dependency on a single processor, decrease development effort by 90% for adding and maintaining integrations, lower processing fees with smart routing, improve success rates with seamless failover and auto-retries, and expand business reach with local and alternate payment methods.

## Saleor

Saleor is an open-source e-commerce platform designed to meet the needs of modern digital businesses. With Saleor, you can easily create and customize your online store, leveraging a flexible architecture and a robust set of features. It allows for seamless integration with various services, provides scalable solutions to accommodate growth, and supports multiple sales channels to reach a wider audience. Saleor's API-first approach ensures efficient development workflows and a superior shopping experience for customers

With this plugin, you can integrate Hyperswitch as a payment app to handle payment processing for your Saleor storefront.

> **IMPORTANT:** To configure the Hyperswitch Saleor App, you must have an account with [Hyperswitch](https://app.hyperswitch.io/).

The Hyperswitch Saleor App supports integrations with the [Hyperswitch SDK](https://docs.hyperswitch.io/learn-more/sdk-reference) and [Hyperswitch Payment Links](https://docs.hyperswitch.io/features/payment-flows-and-management/payment-links)

## Capabilities

The Hyperswitch Saleor App implements the following [Saleor synchronous events related to transactions](https://docs.saleor.io/docs/3.x/developer/extending/webhooks/synchronous-events/transaction):

- [`PAYMENT_GATEWAY_INITIALIZE_SESSION`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumpayment_gateway_initialize_session)
- [`TRANSACTION_INITIALIZE_SESSION`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumtransaction_initialize_session)
- [`TRANSACTION_PROCESS_SESSION`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumtransaction_process_session)
- [`TRANSACTION_CHARGE_REQUESTED`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumtransaction_charge_requested)
- [`TRANSACTION_CANCEL_REQUESTED`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumtransaction_cancel_requested)
- [`TRANSACTION_REFUND_REQUESTED`](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#webhookeventtypesyncenumtransaction_refund_requested)

Furthermore, it's also prepared to handle [Hyperswitch incoming webhooks](https://docs.hyperswitch.io/hyperswitch-cloud/webhooks).

Hyperswitch Saleor App follows the flow described in detail in the [Saleor Payment App documentation](https://docs.saleor.io/docs/3.x/developer/payments#payment-app).

### Requirements

Before you start, make sure you have installed:

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/)

### Setup

1. Create an `.env` file

2. Install dependency

```
pnpm install
```

2. Start the local server with:

```
pnpm dev
```

3. Expose local environment using tunnel:
   Use tunneling tools like [localtunnel](https://github.com/localtunnel/localtunnel) or [ngrok](https://ngrok.com/).

4. Install the application in your dashboard:

If you use Saleor Cloud or your local server is exposed, you can install your app by following this link:

```
[YOUR_SALEOR_DASHBOARD_URL]/apps/install?manifestUrl=[YOUR_APP_TUNNEL_MANIFEST_URL]
```

`YOUR_APP_TUNNEL_MANIFEST_URL = TUNNEL_URL/api/manifest`

### Generated schema and typings

Commands `build` and `dev` would generate required schema and typed functions for Saleor's GraphQL endpoint and Hyperswitch's Rest API. Commit the `generated` folder to your repo as they are necessary for queries and keeping track of the schema changes.
