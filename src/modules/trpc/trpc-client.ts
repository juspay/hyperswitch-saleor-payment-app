import { TRPCClientError, httpBatchLink, loggerLink, type TRPCClientErrorLike } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";

import { SALEOR_API_URL_HEADER, SALEOR_AUTHORIZATION_BEARER_HEADER } from "@saleor/app-sdk/const";
import { useErrorModalStore } from "../ui/organisms/GlobalErrorModal/state";
import { type AppRouter } from "./trpc-app-router";
import { getErrorHandler } from "./utils";
import { BaseTrpcError, JwtInvalidError, JwtTokenExpiredError } from "@/errors";
import { appBridgeInstance } from "@/app-bridge-instance";
import { RequestInfo as NodeRequestInfo, RequestInit as NodeRequestInit } from "node-fetch";
import { default as nodeFetch } from "node-fetch";

const genericErrorHandler = (err: unknown) => {
  getErrorHandler({
    actionId: "generic-error",
    appBridge: appBridgeInstance,
  })(err as TRPCClientErrorLike<AppRouter>);
};


const customFetch = async (input: URL | RequestInfo, init?: RequestInit | undefined) => {
  const proxy = process.env.PROXY_URL;

  if (proxy && typeof window === "undefined") {
    let nodeInput = input as NodeRequestInfo;
    let nodeInit = init as NodeRequestInit;
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    const agent = new HttpsProxyAgent(proxy);
    nodeInit = {
      ...nodeInit,
      agent,
    };
    let nodeResponse = await nodeFetch(nodeInput, nodeInit);
    const headers = new Headers();
    Object.entries(nodeResponse.headers.raw()).forEach(([key, value]) => {
      headers.set(key, value.join(", "));
    });
    const responseBody = await nodeResponse.text();

    const responseWithUrqlHeaders = new Response(responseBody, {
      status: nodeResponse.status,
      statusText: nodeResponse.statusText,
      headers: headers,
    });
    return responseWithUrqlHeaders;
  } else {
    return await fetch(input, init);
  }
};

export const trpcClient = createTRPCNext<AppRouter>({
  config() {
    return {
      abortOnUnmount: true,
      links: [
        loggerLink({
          logger: (data) => {
            if (data.direction === "down" && data.result instanceof TRPCClientError) {
              const serialized = data.result.data?.serialized;
              const error = BaseTrpcError.parse(serialized);

              if (error instanceof JwtTokenExpiredError) {
                useErrorModalStore.setState({
                  isOpen: true,
                  message: "JWT Token expired. Please refresh the page.",
                });
              }

              if (error instanceof JwtInvalidError) {
                useErrorModalStore.setState({
                  isOpen: true,
                  message: "JWT Token is invalid. Please refresh the page.",
                });
              }
            }
          },
        }),
        httpBatchLink({
          url: "/saleor/api/trpc",
          headers() {
            return {
              /**
               * Attach headers from app to client requests, so tRPC can add them to context
               */
              [SALEOR_AUTHORIZATION_BEARER_HEADER]: appBridgeInstance?.getState().token,
              [SALEOR_API_URL_HEADER]: appBridgeInstance?.getState().saleorApiUrl,
            };
          },
          fetch: customFetch,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          mutations: {
            onError: genericErrorHandler,
            retry: false,
          },
          queries: {
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            onError: genericErrorHandler,
            retry: false,
          },
        },
      },
    };
  },
  ssr: false,
});
