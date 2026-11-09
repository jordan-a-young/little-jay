import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

function validStatus(value: number) {
  return Number.isInteger(value) && value >= 400 && value <= 599;
}

function validMessage(value: string) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 160 &&
    [...value].every((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
  );
}

function validRetryAfter(value: number | undefined) {
  return value === undefined || (Number.isInteger(value) && value >= 0 && value <= 86_400);
}

/** Explicit application errors carry trusted public copy, never arbitrary exception diagnostics. */
export class ApplicationError extends Error {
  readonly statusCode: number;
  readonly retryAfterSeconds: number | undefined;

  constructor(statusCode: number, publicMessage: string, retryAfterSeconds?: number) {
    if (
      !validStatus(statusCode) ||
      !validMessage(publicMessage) ||
      !validRetryAfter(retryAfterSeconds)
    )
      throw new TypeError("Invalid application error configuration");
    super(publicMessage);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const parserResponses: Record<string, { status: number; message: string }> = {
  FST_ERR_CTP_INVALID_JSON_BODY: { status: 400, message: "Invalid request" },
  FST_ERR_CTP_EMPTY_JSON_BODY: { status: 400, message: "Invalid request" },
  FST_ERR_CTP_BODY_TOO_LARGE: { status: 413, message: "Request body too large" },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: { status: 415, message: "Unsupported media type" },
};

/** Install the example's native handlers only in its application scope and descendants. */
export function installApplicationErrors(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "Invalid request" });
    if (
      error instanceof ApplicationError &&
      validStatus(error.statusCode) &&
      validMessage(error.message) &&
      validRetryAfter(error.retryAfterSeconds)
    ) {
      if (error.retryAfterSeconds !== undefined)
        reply.header("Retry-After", String(error.retryAfterSeconds));
      return reply.code(error.statusCode).send({
        error: error.statusCode >= 500 ? "Internal server error" : error.message,
      });
    }
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const parser =
      typeof code === "string" && Object.hasOwn(parserResponses, code)
        ? parserResponses[code]
        : undefined;
    if (parser) return reply.code(parser.status).send({ error: parser.message });
    return reply.code(500).send({ error: "Internal server error" });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: "Not found" }));
}
