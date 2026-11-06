import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

export type SafeErrorResponse = {
  statusCode: number;
  error: { code: string; message: string };
};

const clientErrors: Record<number, { code: string; message: string }> = {
  400: { code: "BAD_REQUEST", message: "Invalid request" },
  401: { code: "UNAUTHORIZED", message: "Authentication required" },
  403: { code: "FORBIDDEN", message: "Request forbidden" },
  404: { code: "NOT_FOUND", message: "Not found" },
  413: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported media type" },
  429: { code: "RATE_LIMITED", message: "Too many requests" },
};

function safeResponse(statusCode: number): SafeErrorResponse {
  return {
    statusCode,
    error:
      statusCode >= 500
        ? { code: "INTERNAL_ERROR", message: "Internal server error" }
        : (clientErrors[statusCode] ?? { code: "REQUEST_FAILED", message: "Request failed" }),
  };
}

const plugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    const candidate =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;
    const statusCode =
      typeof candidate === "number" &&
      Number.isInteger(candidate) &&
      candidate >= 400 &&
      candidate <= 599
        ? candidate
        : 500;
    reply.code(statusCode).send(safeResponse(statusCode));
  });
  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send(safeResponse(404));
  });
};

/** Opt-in canonical error responses in the registering scope. Does not log raw errors or requests. */
export const safeErrorsPlugin: FastifyPluginAsync = fp(plugin, {
  name: "ljay-safe-errors",
  fastify: "5.x",
});
