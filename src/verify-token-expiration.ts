import { DashboardTokenPayload } from "./verify-jwt";
import { createLogger } from "./lib/logger";

const logger = createLogger({ msgPrefix: "verify-jwt" });

export const verifyTokenExpiration = (token: DashboardTokenPayload) => {
  const tokenExpiration = token.exp;
  const now = new Date();
  const nowTimestamp = now.valueOf();

  if (!tokenExpiration) {
    throw new Error('Missing "exp" field in token');
  }

  /**
   * Timestamp in token are in seconds, but timestamp from Date is in miliseconds
   */
  const tokenMsTimestamp = tokenExpiration * 1000;

  logger.debug(
    "Comparing todays date: %s and token expiration date: %s",
    now.toLocaleString(),
    new Date(tokenMsTimestamp).toLocaleString(),
  );

  if (tokenMsTimestamp <= nowTimestamp) {
    throw new Error("Token is expired");
  }
};
