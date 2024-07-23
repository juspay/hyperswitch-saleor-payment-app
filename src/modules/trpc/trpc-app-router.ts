import { hyperswitchConfigurationRouter, juspayConfigurationRouter } from "../payment-app-configuration/payment-app-configuration.router";
import { router } from "./trpc-server";

export const appRouter = router({
  hyperswitchConfigurationRouter,
  juspayConfigurationRouter
  // CHANGEME: Add additioal routers here
});

export type AppRouter = typeof appRouter;
