import { SaleorApp } from "@saleor/app-sdk/saleor-app";
import { FileAPL, UpstashAPL, SaleorCloudAPL } from "@saleor/app-sdk/APL";
import { invariant } from "./lib/invariant";
import { env } from "./lib/env.mjs";
import { ProxyUpstashAPL } from "./upstash-apl";
import { ProxyPostgresAPL } from "./postgres-apl";

/**
 * By default auth data are stored in the `.auth-data.json` (FileAPL).
 * For multi-tenant applications and deployments please use UpstashAPL.
 *
 * To read more about storing auth data, read the
 * [APL documentation](https://github.com/saleor/saleor-app-sdk/blob/main/docs/apl.md)
 */
const getApl = async () => {
  /* c8 ignore start */
  switch (env.APL) {
    case "upstash":
      invariant(env.UPSTASH_URL, "Missing UPSTASH_URL env variable!");
      invariant(env.UPSTASH_TOKEN, "Missing UPSTASH_TOKEN env variable!");
      return new ProxyUpstashAPL({
        restURL: env.UPSTASH_URL,
        restToken: env.UPSTASH_TOKEN,
      });
    case "saleor-cloud": {
      invariant(env.REST_APL_ENDPOINT, "Missing REST_APL_ENDPOINT env variable!");
      invariant(env.REST_APL_TOKEN, "Missing REST_APL_TOKEN env variable!");
      return new SaleorCloudAPL({
        resourceUrl: env.REST_APL_ENDPOINT,
        token: env.REST_APL_TOKEN,
      });
    }
    case "postgres": {
      invariant(env.PG_USER, "Missing PG_USER env variable!");
      invariant(env.PG_HOST, "Missing PG_HOST env variable!");
      invariant(env.PG_DATABASE, "Missing PG_DATABASE env variable!");
      invariant(env.PG_PASSWORD, "Missing PG_PASSWORD env variable!");
      invariant(env.PG_PORT, "Missing PG_PORT env variable!");
      return new ProxyPostgresAPL({
        user: env.PG_USER,
        host: env.PG_HOST,
        database: env.PG_DATABASE,
        password: env.PG_PASSWORD,
        port: Number(env.PG_PORT),
      });
    }
    default:
      return new FileAPL();
  }
  /* c8 ignore stop */
};

const apl = await getApl();

export const saleorApp = new SaleorApp({
  apl,
});
