/* eslint-disable class-methods-use-this */
// eslint-disable-next-line max-classes-per-file
import { APL, AplConfiguredResult, AplReadyResult, AuthData } from "@saleor/app-sdk/APL";
import { createLogger } from "./lib/logger";
import fetch, { Response } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "./lib/env.mjs";

const logger = createLogger({ msgPrefix: "createAppRegisterHandler" });

type SuccessResponse = { result: string };
type ErrorResponse = { error: string };
type UpstashResponse = SuccessResponse | ErrorResponse;

export const ProxyUpstashAPLVariables = {
  UPSTASH_TOKEN: "UPSTASH_TOKEN",
  UPSTASH_URL: "UPSTASH_URL",
};

export class ProxyUpstashAplMisconfiguredError extends Error {
  constructor(public missingVars: string[]) {
    super(
      `Configuration values for: ${missingVars
        .map((v) => `"${v}"`)
        .join(", ")} not found or is empty. Pass values to constructor of use env variables.`,
    );
  }
}

export class ProxyUpstashAplNotConfiguredError extends Error {}

export type ProxyUpstashAPLConfig = {
  restURL: string;
  restToken: string;
};

/**
 * Upstash APL
 *
 * Use [Upstash](https://upstash.com) which is SaaS Redis provider, to store auth data.
 * You can create free developer account and use it to develop multi-tenant apps.
 *
 * Configuration require 2 elements: URL to the REST service and auth token. Both can be
 * found in the Upstash dashboard. You can choose to store them using environment variables
 * (`UPSTASH_URL` and `UPSTASH_TOKEN`) or pass directly to APL's constructor.
 */
export class ProxyUpstashAPL implements APL {
  private restURL?: string;

  private restToken?: string;

  constructor(config?: ProxyUpstashAPLConfig) {
    const restURL = config?.restURL || process.env[ProxyUpstashAPLVariables.UPSTASH_URL];
    const restToken = config?.restToken || process.env[ProxyUpstashAPLVariables.UPSTASH_TOKEN];

    this.restURL = restURL;
    this.restToken = restToken;
  }

  private async upstashRequest(request: string[]) {
    logger.debug("Sending request to Upstash");
    if (!this.restURL || !this.restToken) {
      throw new Error(
        "ProxyUpstashAPL is not configured. See https://docs.saleor.io/docs/3.x/developer/extending/apps/developing-apps/app-sdk/apl",
      );
    }
    const agent = env.PROXY_URL ? new HttpsProxyAgent(env.PROXY_URL) : undefined;
    let response: Response;
    try {
      response = await fetch(this.restURL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.restToken}` },
        body: JSON.stringify(request),
        ...(agent && { agent }),
      });
    } catch (error) {
      logger.debug("Error during sending the data:", error);
      throw new Error(`ProxyUpstashAPL was unable to perform a request ${error}`);
    }

    const parsedResponse = (await response.json()) as UpstashResponse;
    if (!response.ok || "error" in parsedResponse) {
      logger.debug(
        `Operation unsuccessful. Upstash API has responded with ${response.status} code`,
      );
      if ("error" in parsedResponse) {
        logger.debug("Error message: %s", parsedResponse.error);
        throw new Error(
          `Upstash APL was not able to perform operation. Status code: ${response.status}. Error: ${parsedResponse.error}`,
        );
      }
      throw new Error(
        `Upstash APL was not able to perform operation. Status code: ${response.status}`,
      );
    }
    logger.debug("Upstash service responded successfully");
    return parsedResponse.result;
  }

  private async saveDataToUpstash(authData: AuthData) {
    logger.debug("saveDataToUpstash() called with: %j", {
      saleorApiUrl: authData.saleorApiUrl,
      token: authData.token.substring(0, 4),
    });

    const data = JSON.stringify(authData);
    await this.upstashRequest(["SET", authData.saleorApiUrl, data]);
  }

  private async deleteDataFromUpstash(saleorApiUrl: string) {
    await this.upstashRequest(["DEL", saleorApiUrl]);
  }

  private async fetchDataFromUpstash(saleorApiUrl: string) {
    const result = await this.upstashRequest(["GET", saleorApiUrl]);
    if (result) {
      const authData = JSON.parse(result) as AuthData;
      return authData;
    }
    return undefined;
  }

  async get(saleorApiUrl: string) {
    return this.fetchDataFromUpstash(saleorApiUrl);
  }

  async set(authData: AuthData) {
    await this.saveDataToUpstash(authData);
  }

  async delete(saleorApiUrl: string) {
    await this.deleteDataFromUpstash(saleorApiUrl);
  }

  async getAll() {
    throw new Error("ProxyUpstashAPL does not support getAll method");
    return [];
  }

  // eslint-disable-next-line class-methods-use-this
  async isReady(): Promise<AplReadyResult> {
    const missingConf: string[] = [];
    if (!this.restToken) {
      missingConf.push("restToken");
    }
    if (!this.restURL) {
      missingConf.push("restURL");
    }

    if (missingConf.length > 0) {
      return {
        ready: false,
        error: new ProxyUpstashAplMisconfiguredError(missingConf),
      };
    }

    return {
      ready: true,
    };
  }

  async isConfigured(): Promise<AplConfiguredResult> {
    return this.restToken && this.restURL
      ? {
          configured: true,
        }
      : {
          configured: false,
          error: new ProxyUpstashAplNotConfiguredError(
            "UpstashAPL not configured. Check if REST URL and token provided in constructor or env",
          ),
        };
  }
}
