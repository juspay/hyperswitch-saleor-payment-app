import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { trace, Tracer } from "@opentelemetry/api";
import pkg from "@saleor/app-sdk/package.json";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { env } from "./lib/env.mjs";
import { getOtelTracer, OTEL_CORE_SERVICE_NAME } from "./open-telemetry";

export const getJwksUrlFromSaleorApiUrl = (saleorApiUrl: string): string =>
  `${new URL(saleorApiUrl).origin}/.well-known/jwks.json`;


export const fetchRemoteJwks = async (saleorApiUrl: string) => {
  const tracer = getOtelTracer();

  return tracer.startActiveSpan(
    "fetchRemoteJwks",
    {
      kind: SpanKind.CLIENT,
      attributes: { saleorApiUrl, [SemanticAttributes.PEER_SERVICE]: OTEL_CORE_SERVICE_NAME },
    },
    async (span) => {
    const agent = env.PROXY_URL ? new HttpsProxyAgent(env.PROXY_URL) : undefined;
      try {
        const jwksResponse = await fetch(getJwksUrlFromSaleorApiUrl(saleorApiUrl), {...(agent && { agent })});

        const jwksText = await jwksResponse.text();

        span.setStatus({ code: SpanStatusCode.OK });

        return jwksText;
      } catch (err) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });

        throw err;
      } finally {
        span.end();
      }
    }
  );
};
