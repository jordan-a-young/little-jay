import Fastify, { LogController } from "fastify";
import { describe, expect, it } from "vite-plus/test";
import { createServer, safeErrorsPlugin } from "./index.js";

function createLogCapture() {
  const messages: string[] = [];
  return {
    stream: {
      write(message: string) {
        messages.push(message);
      },
    },
    output: () => messages.join(""),
    records: () => messages.map((message) => JSON.parse(message) as Record<string, unknown>),
  };
}

describe("native Fastify logging compatibility", () => {
  it("accepts explicitly disabled logging with ordinary plugins and requests", async () => {
    const server = createServer({ logger: false });
    try {
      server.register(safeErrorsPlugin);
      server.get("/success", async () => ({ accepted: true }));
      expect(() => server.log.info("Disabled operation")).not.toThrow();
      expect((await server.inject("/success")).json()).toEqual({ accepted: true });
      expect((await server.inject("/missing")).json()).toEqual({
        statusCode: 404,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
      expect(server.server.listening).toBe(false);
    } finally {
      await server.close();
    }
  });

  it.each(["configured", "injected"] as const)(
    "preserves %s logging levels, serializers, redaction and native request children",
    async (mode) => {
      const marker = "synthetic-native-logging-marker";
      const capture = createLogCapture();
      const loggerOptions = {
        level: "warn",
        stream: capture.stream,
        redact: { paths: ["secret"], censor: "[REDACTED]" },
        serializers: {
          req: () => ({ type: "request" }),
          res: (reply: { statusCode: number }) => ({ statusCode: reply.statusCode }),
          err: () => ({ type: "Error", message: "Operation failed", stack: "" }),
        },
      };
      const loggerOwner = mode === "injected" ? Fastify({ logger: loggerOptions }) : undefined;
      const server = createServer({
        ...(loggerOwner ? { loggerInstance: loggerOwner.log } : { logger: loggerOptions }),
        logController: new LogController({ disableRequestLogging: true }),
      });
      try {
        server.register(safeErrorsPlugin);
        server.addHook("onResponse", async (request, reply) => {
          expect(request.log).not.toBe(server.log);
          request.log.info("Below configured level");
          request.log.warn(
            { req: request, res: reply, err: new Error(marker), secret: marker },
            "Native request completed",
          );
        });
        server.post("/success", async () => ({ accepted: true }));
        server.post("/rejected", async () => {
          throw Object.assign(new Error(marker), { statusCode: 403 });
        });
        server.post(
          "/validate",
          {
            schema: {
              body: {
                type: "object",
                required: ["count"],
                properties: { count: { type: "integer" } },
              },
            },
          },
          async () => ({ accepted: true }),
        );
        server.post("/unexpected", async () => {
          throw new Error(marker);
        });

        const statuses = [200, 403, 404, 400, 500];
        const paths = ["/success", "/rejected", "/missing", "/validate", "/unexpected"];
        for (const [index, path] of paths.entries()) {
          const response = await server.inject({
            method: "POST",
            url: `${path}?code=${marker}`,
            headers: { cookie: `session=${marker}`, authorization: `Bearer ${marker}` },
            payload: { count: marker },
          });
          expect(response.statusCode).toBe(statuses[index]);
          expect(response.body).not.toContain(marker);
        }
        expect(server.log.level).toBe("warn");
        expect(server.server.listening).toBe(false);
        expect(capture.records()).toHaveLength(5);
        expect(capture.records().map((record) => record.res)).toEqual(
          statuses.map((statusCode) => ({ statusCode })),
        );
        for (const record of capture.records()) {
          expect(record).toMatchObject({
            level: 40,
            msg: "Native request completed",
            reqId: expect.any(String),
            req: { type: "request" },
            err: { type: "Error", message: "Operation failed", stack: "" },
            secret: "[REDACTED]",
          });
        }
        expect(new Set(capture.records().map((record) => record.reqId)).size).toBe(5);
        expect(capture.output()).not.toContain(marker);
        expect(capture.output()).not.toContain("Below configured level");
      } finally {
        await server.close();
        await loggerOwner?.close();
      }
    },
  );
});
