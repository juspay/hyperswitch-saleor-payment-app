import { HttpRequestError, HyperswitchHttpClientError } from "@/errors";
import {
  type paths as PaymentPaths,
} from "generated/hyperswitch-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { intoErrorResponse } from "./hyperswitch-api-response";
import { SyncWebhookAppError } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";


const SANDBOX_BASE_URL: string = "https://sandbox.hyperswitch.io";
const PROD_BASE_URL: string = "https://api.hyperswitch.io";

export const getEnvironmentFromKey = (apiKey: string) => {
  return !(apiKey.startsWith("snd_") || apiKey.startsWith("dev_"))
    ? "live"
    : "test";
};


const getHyperswitchBaseUrl = (apiKey: string) => {
  if (getEnvironmentFromKey(apiKey) == "live") { 
    return PROD_BASE_URL
  } else {
    return SANDBOX_BASE_URL
  }
};

export const createHyperswitchClient = ({
  apiKey
}: {
  apiKey: string;
}) => {
  const fetcher = Fetcher.for<PaymentPaths>();
  fetcher.configure({
    baseUrl: getHyperswitchBaseUrl(apiKey),
    init: {
      headers: {
        'api-key': apiKey,
        'content-type': "application/json"
      },
    },
    use: [
      (url, init, next) =>
      next(url, init).catch((err) => {
        if (err instanceof ApiError) {
         const errorData =  intoErrorResponse(err.data);
         const errorMessage = errorData.error?.message ? errorData.error?.message: "NO ERROR MESSAGE";
          throw new HyperswitchHttpClientError(errorMessage);
        } else {
          throw err;
        }
      }),
    ],
  });
  return fetcher;
};
