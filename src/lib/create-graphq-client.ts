import { AuthConfig, authExchange } from "@urql/exchange-auth";
import {
  cacheExchange,
  createClient as urqlCreateClient,
  dedupExchange,
  fetchExchange,
} from "urql";
import { RequestInfo as NodeRequestInfo, RequestInit as NodeRequestInit } from "node-fetch";
import { default as nodeFetch, Headers as NodeHeaders } from "node-fetch";

interface IAuthState {
  token: string;
}

const customFetch = async (input: URL | RequestInfo, init?: RequestInit | undefined) => {
  const proxy = process.env.PROXY_URL;

  if (proxy && typeof window === "undefined") {
    let nodeInput = input as NodeRequestInfo;
    let nodeInit = init as NodeRequestInit;
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    const agent = new HttpsProxyAgent(proxy);
    const requestHeaders = new NodeHeaders(nodeInit?.headers);
    requestHeaders.set("Accept-Encoding", "identity");
    nodeInit = {
      ...nodeInit,
      headers: requestHeaders,
      agent, // Attach the proxy agent here
      // The Saleor API URL is caller-supplied: don't let node-fetch decompress (br/gzip bombs) and cap body size
      compress: false,
      size: 10 * 1024 * 1024,
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

export const createClient = (url: string, getAuth: AuthConfig<IAuthState>["getAuth"]) =>
  urqlCreateClient({
    url,
    fetch: customFetch,
    exchanges: [
      dedupExchange,
      cacheExchange,
      authExchange<IAuthState>({
        addAuthToOperation: ({ authState, operation }) => {
          if (!authState || !authState?.token) {
            return operation;
          }

          const fetchOptions =
            typeof operation.context.fetchOptions === "function"
              ? operation.context.fetchOptions()
              : operation.context.fetchOptions || {};

          return {
            ...operation,
            context: {
              ...operation.context,
              fetchOptions: {
                ...fetchOptions,
                headers: {
                  ...fetchOptions.headers,
                  "Authorization-Bearer": authState.token,
                },
              },
            },
          };
        },
        getAuth,
      }),
      fetchExchange,
    ],
  });
