import { LogController, type FastifyBaseLogger, type FastifyServerOptions } from "fastify";

export type OperationalEvent =
  | "resources-ready"
  | "work-started"
  | "work-stopped"
  | "resources-closed"
  | "startup-failed"
  | "shutdown-failed"
  | "server-started"
  | "server-stopped"
  | "request-completed";

/**
 * Native logging policy for this example, not a sanitizer for arbitrary log fields or messages.
 * The caller owns the optional destination and its asynchronous errors, flushing and shutdown.
 * Pair these options with safeErrorsPlugin for fixed request error responses.
 */
export function createOperationalLoggingOptions(
  options: { enabled?: boolean; stream?: { write(message: string): void } } = {},
): FastifyServerOptions {
  return {
    requestIdHeader: false,
    logController: new LogController({ disableRequestLogging: true }),
    logger:
      options.enabled === false
        ? false
        : {
            level: "info",
            base: { service: "operational-example" },
            ...(options.stream ? { stream: options.stream } : {}),
            serializers: {
              req: () => ({ type: "request" }),
              res: (reply) => ({ statusCode: reply.statusCode }),
              err: () => ({ type: "Error", message: "Operation failed", stack: "" }),
            },
            redact: {
              paths: [
                "body",
                "query",
                "configuration",
                "headers.authorization",
                "headers.cookie",
                'headers["x-request-id"]',
              ],
              censor: "[REDACTED]",
            },
          },
  };
}

/**
 * Best-effort fixed-event reporting. Unknown events are ignored at runtime.
 * Synchronous logger failures never escape or produce fallback diagnostics, so reporting cannot
 * interrupt cleanup. Delivery is not guaranteed; the supplied logger owns asynchronous failures.
 */
export function createOperationalReporter(
  logger: Pick<FastifyBaseLogger, "info" | "error">,
): (event: OperationalEvent) => void {
  return (event) => {
    try {
      switch (event) {
        case "resources-ready":
        case "work-started":
        case "work-stopped":
        case "resources-closed":
        case "server-started":
        case "server-stopped":
        case "request-completed":
          logger.info({ event }, "Operational event");
          break;
        case "startup-failed":
        case "shutdown-failed":
          logger.error({ event }, "Operational failure");
          break;
      }
    } catch {
      return;
    }
  };
}
