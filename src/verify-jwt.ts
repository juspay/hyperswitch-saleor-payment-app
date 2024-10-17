import * as jose from "jose";

import { hasPermissionsInJwtToken } from "./has-permissions-in-jwt-token";
import { Permission } from "@saleor/app-sdk/types";
import { getJwksUrlFromSaleorApiUrl } from "./urls";
import { verifyTokenExpiration } from "./verify-token-expiration";
import { createLogger } from "./lib/logger";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "@/lib/env.mjs";

const logger = createLogger({ msgPrefix: "verify-jwt" });

export interface DashboardTokenPayload extends jose.JWTPayload {
  app: string;
  user_permissions: Permission[];
}

export interface verifyJWTArguments {
  appId: string;
  saleorApiUrl: string;
  token: string;
  requiredPermissions?: Permission[];
}

export const verifyJWT = async ({
  saleorApiUrl,
  token,
  appId,
  requiredPermissions,
}: verifyJWTArguments) => {
  let tokenClaims: DashboardTokenPayload;
  const ERROR_MESSAGE = "JWT verification failed:";

  try {
    tokenClaims = jose.decodeJwt(token as string) as DashboardTokenPayload;
    logger.debug("Token Claims decoded from jwt");
  } catch (e) {
    logger.debug("Token Claims could not be decoded from JWT, will respond with Bad Request");
    throw new Error(`${ERROR_MESSAGE} Could not decode authorization token.`);
  }

  try {
    verifyTokenExpiration(tokenClaims);
  } catch (e) {
    throw new Error(`${ERROR_MESSAGE} ${(e as Error).message}`);
  }

  if (tokenClaims.app !== appId) {
    logger.debug(
      "Resolved App ID value from token to be different than in request, will respond with Bad Request",
    );

    throw new Error(`${ERROR_MESSAGE} Token's app property is different than app ID.`);
  }

  if (!hasPermissionsInJwtToken(tokenClaims, requiredPermissions)) {
    logger.debug("Token did not meet requirements for permissions: %s", requiredPermissions);
    throw new Error(`${ERROR_MESSAGE} Token's permissions are not sufficient.`);
  }

  try {
    logger.debug("Trying to create JWKS");
    const proxyAgent = env.PROXY_URL ? new HttpsProxyAgent(env.PROXY_URL) : undefined;
    const JWKS = jose.createRemoteJWKSet(new URL(getJwksUrlFromSaleorApiUrl(saleorApiUrl)), {
      agent: proxyAgent, // Pass the proxy agent
    });
    logger.debug("Trying to compare JWKS with token");
    await jose.jwtVerify(token, JWKS);
  } catch (e) {
    logger.debug("Failure: %s", e);
    logger.debug("Will return with Bad Request");

    console.error(e);

    throw new Error(`${ERROR_MESSAGE} JWT signature verification failed.`);
  }
};
