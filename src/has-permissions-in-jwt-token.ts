import { createLogger } from "./lib/logger";
import { Permission } from "@saleor/app-sdk/types";
import { DashboardTokenPayload } from "./verify-jwt";

const logger = createLogger({ msgPrefix: "HaspermissionInJWTtoken" });

export const hasPermissionsInJwtToken = (
  tokenData?: Pick<DashboardTokenPayload, "user_permissions">,
  permissionsToCheckAgainst?: Permission[]
) => {
  logger.debug(`Permissions required ${permissionsToCheckAgainst}`);

  if (!permissionsToCheckAgainst?.length) {
    logger.debug("No permissions specified, check passed");
    return true;
  }

  const userPermissions = tokenData?.user_permissions || undefined;

  if (!userPermissions?.length) {
    logger.debug("User has no permissions assigned. Rejected");
    return false;
  }

  const arePermissionsSatisfied = permissionsToCheckAgainst.every((permission) =>
    userPermissions.includes(permission)
  );

  if (!arePermissionsSatisfied) {
    logger.debug("Permissions check not passed");
    return false;
  }

  logger.debug("Permissions check successful");
  return true;
};
