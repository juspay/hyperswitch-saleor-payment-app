<div align="center">
<img width="150" alt="saleor-app-template" src="./public/switch.png">
</div>

<div align="center">
  <h1>Hyperswitch Saleor Payments App</h1>
</div>

<div align="center">
  <p>Do saleor payments through hyperswitch</p>
</div>

### What is Hyperswitch

Hyperswitch is a community-led, open payments switch to enable access to the best payments infrastructure for every digital business.

Using Hyperswitch, you can:

  - ⬇️ Reduce dependency on a single processor like Stripe or Braintree
  - 🧑‍💻 Reduce Dev effort by 90% to add & maintain integrations
  - 🚀 Improve success rates with seamless failover and auto-retries
  - 💸 Reduce processing fees with smart routing
  - 🎨 Customize payment flows with full visibility and control
  - 🌐 Increase business reach with local/alternate payment methods

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


You can also install application using GQL or command line. Follow the guide [how to install your app](https://docs.saleor.io/docs/3.x/developer/extending/apps/installing-apps#installation-using-graphql-api) to learn more.

### Generated schema and typings

Commands `build` and `dev` would generate schema and typed functions using Saleor's GraphQL endpoint. Commit the `generated` folder to your repo as they are necessary for queries and keeping track of the schema changes.
