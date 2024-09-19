import { createLogger } from "./lib/logger";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "./lib/env.mjs";

const logger = createLogger({ msgPrefix: "GetAppId" });

type GetIdResponseType = {
  data?: {
    app?: {
      id: string;
    };
  };
};

export interface GetAppIdProperties {
  saleorApiUrl: string;
  token: string;
}

export const getAppId = async ({
  saleorApiUrl,
  token,
}: GetAppIdProperties): Promise<string | undefined> => {
  const agent = env.PROXY_URL ? new HttpsProxyAgent(env.PROXY_URL) : undefined;

  try {
    const response = await fetch(saleorApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          {
            app{
              id
            }
          }
          `,
      }),
      ...(agent && { agent }),
    });
    if (response.status !== 200) {
      logger.debug(`Could not get the app ID: Saleor API has response code ${response.status}`);
      return undefined;
    }
    const body = (await response.json()) as GetIdResponseType;
    const appId = body.data?.app?.id;
    return appId;
  } catch (e) {
    logger.debug("Could not get the app ID: %O", e);
    return undefined;
  }
};
