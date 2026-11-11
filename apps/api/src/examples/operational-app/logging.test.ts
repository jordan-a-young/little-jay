import { createServer, safeErrorsPlugin } from "@littlejay/server";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  createOperationalLoggingOptions,
  createOperationalReporter,
  type OperationalEvent,
} from "./logging.js";

const markers = {
  body: "synthetic-body-marker",
  cookie: "synthetic-cookie-marker",
  authorization: "synthetic-authorization-marker",
  oauthCode: "synthetic-oauth-code-marker",
  oauthState: "synthetic-oauth-state-marker",
  configuration: "synthetic-configuration-marker",
  exception: "synthetic-exception-marker",
  requestId: "synthetic-request-id-marker",
};

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

const requestHeaders = {
  cookie: `session=${markers.cookie}`,
  authorization: `Bearer ${markers.authorization}`,
  "x-request-id": markers.requestId,
};
const oauthQuery = `?code=${markers.oauthCode}&state=${markers.oauthState}`;

describe("operational logging", () => {
  it("emits safe events for successful, rejected, missing, invalid and failed requests", async () => {
    const capture = createLogCapture();
    const app = createServer(createOperationalLoggingOptions({ stream: capture.stream }));
    const report = createOperationalReporter(app.log);
    const configuration = { privateSetting: markers.configuration };
    try {
      app.register(safeErrorsPlugin);
      app.addHook("onResponse", async () => {
        report("request-completed");
      });
      app.post("/success", async () => ({ accepted: true }));
      app.post("/rejected", async () => {
        throw Object.assign(new Error(markers.exception), { statusCode: 403 });
      });
      app.post(
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
      app.post("/unexpected", async () => {
        throw new Error(`${markers.exception}: ${configuration.privateSetting}`);
      });
      await app.ready();
      report("resources-ready");

      for (const scenario of [
        { path: "/success", status: 200, body: { accepted: true } },
        {
          path: "/rejected",
          status: 403,
          body: { statusCode: 403, error: { code: "FORBIDDEN", message: "Request forbidden" } },
        },
        {
          path: "/missing",
          status: 404,
          body: { statusCode: 404, error: { code: "NOT_FOUND", message: "Not found" } },
        },
        {
          path: "/validate",
          status: 400,
          body: { statusCode: 400, error: { code: "BAD_REQUEST", message: "Invalid request" } },
        },
        {
          path: "/unexpected",
          status: 500,
          body: {
            statusCode: 500,
            error: { code: "INTERNAL_ERROR", message: "Internal server error" },
          },
        },
      ]) {
        const response = await app.inject({
          method: "POST",
          url: scenario.path + oauthQuery,
          headers: requestHeaders,
          payload: { count: markers.body },
        });
        expect(response.statusCode).toBe(scenario.status);
        expect(response.json()).toEqual(scenario.body);
        for (const marker of Object.values(markers)) {
          expect(response.body).not.toContain(marker);
        }
      }

      expect(capture.records().map((record) => record.event)).toEqual([
        "resources-ready",
        ...Array.from({ length: 5 }, () => "request-completed"),
      ]);
      expect(capture.records()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            level: 30,
            event: "resources-ready",
            msg: "Operational event",
          }),
        ]),
      );
      for (const marker of Object.values(markers)) {
        expect(capture.output()).not.toContain(marker);
      }
    } finally {
      await app.close();
    }
  });

  it("actually redacts configured fields and projects native request, reply and error serializers", async () => {
    const rawCapture = createLogCapture();
    const safeCapture = createLogCapture();

    for (const protectedLogging of [false, true]) {
      const capture = protectedLogging ? safeCapture : rawCapture;
      const app = createServer(
        protectedLogging
          ? createOperationalLoggingOptions({ stream: capture.stream })
          : { logger: { stream: capture.stream } },
      );
      try {
        app.post("/diagnostic", async (request, reply) => {
          request.log.info(
            {
              req: request,
              res: reply,
              err: new Error(markers.exception),
              body: request.body,
              headers: request.headers,
              query: request.query,
              configuration: { privateSetting: markers.configuration },
            },
            "Synthetic diagnostic",
          );
          return { accepted: true };
        });
        const response = await app.inject({
          method: "POST",
          url: "/diagnostic" + oauthQuery,
          headers: requestHeaders,
          payload: { text: markers.body },
        });
        expect(response.statusCode).toBe(200);
      } finally {
        await app.close();
      }
    }

    for (const marker of Object.values(markers)) {
      expect(rawCapture.output()).toContain(marker);
      expect(safeCapture.output()).not.toContain(marker);
    }
    expect(safeCapture.records()).toHaveLength(1);
    expect(safeCapture.records()[0]).toMatchObject({
      level: 30,
      msg: "Synthetic diagnostic",
      reqId: "req-1",
      req: { type: "request" },
      res: { statusCode: 200 },
      err: { type: "Error", message: "Operation failed", stack: "" },
      body: "[REDACTED]",
      headers: {
        authorization: "[REDACTED]",
        cookie: "[REDACTED]",
        "x-request-id": "[REDACTED]",
      },
      query: "[REDACTED]",
      configuration: "[REDACTED]",
    });
    expect(safeCapture.records()[0]?.req).toEqual({ type: "request" });
    expect(safeCapture.records()[0]?.err).toEqual({
      type: "Error",
      message: "Operation failed",
      stack: "",
    });
  });

  it("enables configured logging by default and permits explicitly disabling it", async () => {
    expect(createOperationalLoggingOptions().logger).toMatchObject({ level: "info" });
    const capture = createLogCapture();
    const app = createServer(
      createOperationalLoggingOptions({ enabled: false, stream: capture.stream }),
    );
    try {
      const report = createOperationalReporter(app.log);
      report("resources-ready");
      report("startup-failed");
      app.get("/disabled", async () => ({ accepted: true }));
      expect((await app.inject("/disabled")).json()).toEqual({ accepted: true });
      expect(capture.output()).toBe("");
    } finally {
      await app.close();
    }
  });

  it("reports only the allowlisted events with fixed messages and levels", async () => {
    const capture = createLogCapture();
    const app = createServer(createOperationalLoggingOptions({ stream: capture.stream }));
    try {
      const report = createOperationalReporter(app.log);
      const events: OperationalEvent[] = [
        "resources-ready",
        "work-started",
        "work-stopped",
        "resources-closed",
        "server-started",
        "server-stopped",
        "request-completed",
        "startup-failed",
        "shutdown-failed",
      ];
      for (const event of events) report(event);
      for (const invalid of [
        markers.exception,
        "__proto__",
        "toString",
        null,
        { private: markers.body },
      ]) {
        report(invalid as OperationalEvent);
      }
      expect(capture.records().map(({ event, level, msg }) => ({ event, level, msg }))).toEqual(
        events.map((event) => ({
          event,
          level: event.endsWith("failed") ? 50 : 30,
          msg: event.endsWith("failed") ? "Operational failure" : "Operational event",
        })),
      );
      expect(capture.output()).not.toContain(markers.exception);
      expect(capture.output()).not.toContain(markers.body);
    } finally {
      await app.close();
    }
  });

  it("does not let synchronous logger failures interrupt cleanup or fall back to console diagnostics", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const write = vi.fn(() => {
      throw new Error(markers.exception);
    });
    const cleanup = vi.fn();
    const app = createServer(createOperationalLoggingOptions({ stream: { write } }));
    try {
      const report = createOperationalReporter(app.log);
      app.addHook("onClose", async () => {
        report("work-stopped");
        cleanup();
        report("resources-closed");
      });
      await app.ready();
      expect(() => report("resources-ready")).not.toThrow();
      expect(() => report("startup-failed")).not.toThrow();
      expect(() => report("shutdown-failed")).not.toThrow();
      await expect(app.close()).resolves.toBeUndefined();
      expect(cleanup).toHaveBeenCalledOnce();
      expect(write).toHaveBeenCalledTimes(5);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleLog).not.toHaveBeenCalled();
    } finally {
      await app.close();
      consoleError.mockRestore();
      consoleWarn.mockRestore();
      consoleLog.mockRestore();
    }
  });

  it("keeps configured destinations isolated between application instances", async () => {
    const firstCapture = createLogCapture();
    const secondCapture = createLogCapture();
    const first = createServer(createOperationalLoggingOptions({ stream: firstCapture.stream }));
    const second = createServer(createOperationalLoggingOptions({ stream: secondCapture.stream }));
    try {
      createOperationalReporter(first.log)("work-started");
      createOperationalReporter(second.log)("shutdown-failed");
      expect(firstCapture.records().map((record) => record.event)).toEqual(["work-started"]);
      expect(secondCapture.records().map((record) => record.event)).toEqual(["shutdown-failed"]);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });
});
