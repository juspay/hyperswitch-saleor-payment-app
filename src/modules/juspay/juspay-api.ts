import { ConfigObject } from "@/backend-lib/api-route-utils";
import { type paths as JuspayPaymentPaths } from "generated/juspay-payments";
import { ApiError, Fetcher } from "openapi-typescript-fetch";
import { env } from "../../lib/env.mjs";
import { intoErrorResponse } from "../hyperswitch/hyperswitch-api-response";
import { JuspayHttpClientError } from "@/errors";

const JUSPAY_SANDBOX_BASE_URL: string = "https://sandbox.juspay.in";
const JUSPAY_PROD_BASE_URL: string ="https://api.juspay.in";

const getJuspayBaseUrl = () => {
    if (env.ENV == "production") {
      return JUSPAY_PROD_BASE_URL;
    } else {
      return JUSPAY_SANDBOX_BASE_URL;
    }
  };

export const createJuspayClient = async ({ configData }: { configData: ConfigObject }) => {
    const fetcher = Fetcher.for<JuspayPaymentPaths>();
    fetcher.configure({
      baseUrl: getJuspayBaseUrl(),
      init: {
        headers: {
          "authorization": "Basic MjNBQ0I5NTlFQzI0RDUxOTg2N0JBOThCMjM5RTJBOg==",
          "content-type": "application/json",
          "x-merchantid": "resellerkol"
        },
      },
      use: [
        (url, init, next) =>
          next(url, init).catch((err) => {
            if (err instanceof ApiError) {
              console.log("***getError", err.data)
              const errorData = intoErrorResponse(err.data);
              const errorMessage = errorData.error?.message
                ? errorData.error?.message
                : "NO ERROR MESSAGE";
              throw new JuspayHttpClientError(errorMessage);
            } else {
              throw err;
            }
          }),
      ],
    });
    return fetcher;
  };