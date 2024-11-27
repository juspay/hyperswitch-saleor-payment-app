import { invariant } from "@/lib/invariant";
import { ProxyPostgresAPL } from "@/postgres-apl";
import { ProxyUpstashAPL } from "@/upstash-apl";
import { NextApiRequest, NextApiResponse } from "next";

export function validateRequestBody(req: NextApiRequest): boolean {
  if (req.headers["content-type"] !== "application/json") {
    throw new Error("Bad Request: Expected content-type is application/json");
  }

  if (
    !(
      Array.isArray(req.body.saleor_api_urls) &&
      req.body.saleor_api_urls.every(
        (url: string) =>
          typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://")),
      )
    )
  ) {
    throw new Error("Invalid Input Type");
  }

  return true;
}

const withApiKeyCheck = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const apiKey = req.headers["authorization"];

    if (!process.env.MIGRATION_API_KEY) {
      return res.status(410).json({ message: "Migration not supported" });
    }
    const migration_token = `Bearer ${process.env.MIGRATION_API_KEY}`;

    if (!apiKey || apiKey !== migration_token) {
      return res.status(403).json({ message: "Forbidden: Invalid or missing API key" });
    }

    return handler(req, res);
  };
};

export async function upstashPostgresHandler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    validateRequestBody(req);
  } catch (error) {
    res.status(400).json(`${error}`);
  }
  let fetchErrors: string[] = [];

  try {
    invariant(process.env.PG_USER, "Missing PG_USER env variable!");
    invariant(process.env.PG_HOST, "Missing PG_HOST env variable!");
    invariant(process.env.PG_DATABASE, "Missing PG_DATABASE env variable!");
    invariant(process.env.PG_PASSWORD, "Missing PG_PASSWORD env variable!");
    invariant(process.env.PG_PORT, "Missing PG_PORT env variable!");
    invariant(process.env.UPSTASH_URL, "Missing UPSTASH_URL env variable!");
    invariant(process.env.UPSTASH_TOKEN, "Missing UPSTASH_TOKEN env variable!");
    let saleor_api_urls = req.body.saleor_api_urls;
    let dbApl = new ProxyPostgresAPL({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PASSWORD,
      port: Number(process.env.PG_PORT),
    });

    let upstashApl = new ProxyUpstashAPL({
      restURL: process.env.UPSTASH_URL,
      restToken: process.env.UPSTASH_TOKEN,
    });

    for (const saleor_api_url of saleor_api_urls) {
      let authData = await upstashApl.get(saleor_api_url);
      if (!authData) {
        fetchErrors.push(saleor_api_url);
      } else {
        dbApl.set(authData);
      }
    }
    if (fetchErrors.length != 0) {
      res.status(200).json(`Failed to migrate: ${fetchErrors.join(", ")}`);
    } else {
      res.status(200).json(`Successfully Migrated`);
    }
  } catch (err) {
    res.status(401).json("Migration Not Supported");
  }
}

export default withApiKeyCheck(upstashPostgresHandler);
