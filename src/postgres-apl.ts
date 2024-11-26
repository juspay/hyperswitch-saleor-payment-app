import { Pool } from "pg";
import { APL, AplConfiguredResult, AplReadyResult, AuthData } from "@saleor/app-sdk/APL";
import { createLogger } from "./lib/logger";

const logger = createLogger({ msgPrefix: "PostgresAPL" });

export type ProxyPostgresAPLConfig = {
  user?: string;
  host?: string;
  database?: string;
  password?: string;
  port?: number;
};

export class ProxyPostgresAplMisconfiguredError extends Error {
  constructor(public missingVars: string[]) {
    super(
      `Configuration values for: ${missingVars
        .map((v) => `"${v}"`)
        .join(
          ", ",
        )} not found or is empty. Ensure these values are provided in the environment or constructor.`,
    );
  }
}

export class ProxyPostgresAPL implements APL {
  private user?: string;
  private host?: string;
  private database?: string;
  private password?: string;
  private port?: number;

  private pool: Pool;

  constructor(config?: ProxyPostgresAPLConfig) {
    this.user = config?.user || process.env.PG_USER;
    this.host = config?.host || process.env.PG_HOST;
    this.database = config?.database || process.env.PG_DATABASE;
    this.password = config?.password || process.env.PG_PASSWORD;
    this.port = config?.port || Number(process.env.PG_PORT);

    this.pool = new Pool({
      user: this.user,
      host: this.host,
      database: this.database,
      password: this.password,
      port: this.port,
    });
  }
  async get(saleorApiUrl: string) {
    const client = await this.pool.connect();
    try {
      const res = await client.query("SELECT * FROM auth WHERE saleor_api_url = $1", [
        saleorApiUrl,
      ]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const authData: AuthData = {
          appId: row.app_id,
          saleorApiUrl: row.saleor_api_url,
          token: row.token,
          domain: row.domain,
          jwks: row.jwks,
        };
        return authData;
      }
      return undefined;
    } finally {
      client.release();
    }
  }

  async set(authData: AuthData) {
    const client = await this.pool.connect();
    try {
      const { appId, domain, jwks, saleorApiUrl, token } = authData;
      await client.query(
        "INSERT INTO auth (app_id, domain, jwks, saleor_api_url, token) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (saleor_api_url) DO UPDATE SET app_id = $1, domain = $2, jwks = $3, token = $5",
        [appId, domain, jwks, saleorApiUrl, token],
      );
    } finally {
      client.release();
    }
  }

  async delete(saleorApiUrl: string) {
    const client = await this.pool.connect();
    try {
      await client.query("DELETE FROM auth WHERE saleor_api_url = $1", [saleorApiUrl]);
    } finally {
      client.release();
    }
  }

  async getAll() {
    const client = await this.pool.connect();
    try {
      const res = await client.query("SELECT * FROM auth");
      return res.rows as AuthData[];
    } finally {
      client.release();
    }
  }

  async isReady(): Promise<AplReadyResult> {
    try {
      await this.pool.query("SELECT 1");
      return { ready: true };
    } catch (error) {
      logger.error("PostgresAPL is not ready: %s", error);
      return {
        ready: false,
        error: new ProxyPostgresAplMisconfiguredError([]),
      };
    }
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    try {
      await this.pool.query("SELECT 1");
      return { configured: true };
    } catch (error) {
      return {
        configured: false,
        error: new ProxyPostgresAplMisconfiguredError([
          "UpstashAPL not configured. Check if REST URL and token provided in constructor or env",
        ]),
      };
    }
  }
}
