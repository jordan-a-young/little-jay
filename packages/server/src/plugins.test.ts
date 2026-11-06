import { Writable } from "node:stream";
import { LogController } from "fastify";
import { describe, expect, it } from "vite-plus/test";
import { createServer, healthRoutes, safeErrorsPlugin } from "./index.js";

describe("opt-in server plugins", () => {
  it("leaves the factory route-free and preserves default Fastify errors", async () => {
    const app = createServer();
    app.get("/failure", async () => {
      throw new Error("default diagnostic");
    });
    try {
      expect((await app.inject("/health")).statusCode).toBe(404);
      expect((await app.inject("/ready")).statusCode).toBe(404);
      expect((await app.inject("/failure")).json().message).toBe("default diagnostic");
      expect(app.server.listening).toBe(false);
    } finally {
      await app.close();
    }
  });

  it("maps errors, validation, malformed JSON, not-found URLs and body limits to canonical responses", async () => {
    const app = createServer({ bodyLimit: 64 });
    app.register(safeErrorsPlugin);
    app.get("/failure", async () => {
      throw new Error("private stack/token/body");
    });
    app.get("/forbidden", async () => {
      throw Object.assign(new Error("private reason"), { statusCode: 403 });
    });
    app.post(
      "/validate",
      {
        schema: {
          body: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
        },
      },
      async () => ({ ok: true }),
    );
    try {
      const cases = [
        [await app.inject("/failure"), 500, "INTERNAL_ERROR"],
        [await app.inject("/forbidden"), 403, "FORBIDDEN"],
        [await app.inject("/private?token=secret"), 404, "NOT_FOUND"],
        [
          await app.inject({ method: "POST", url: "/validate", payload: { secret: true } }),
          400,
          "BAD_REQUEST",
        ],
        [
          await app.inject({
            method: "POST",
            url: "/validate",
            payload: "{secret",
            headers: { "content-type": "application/json" },
          }),
          400,
          "BAD_REQUEST",
        ],
        [
          await app.inject({
            method: "POST",
            url: "/validate",
            payload: { name: "secret".repeat(100) },
          }),
          413,
          "PAYLOAD_TOO_LARGE",
        ],
      ] as const;
      for (const [response, statusCode, code] of cases) {
        expect(response.statusCode).toBe(statusCode);
        expect(response.json()).toMatchObject({ statusCode, error: { code } });
        expect(response.body).not.toMatch(/private|secret|token|stack|validation|name/);
      }
    } finally {
      await app.close();
    }
  });

  it("does not log error/request secrets when automatic request logging is disabled by the app", async () => {
    let logs = "";
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        logs += String(chunk);
        callback();
      },
    });
    const app = createServer({
      logger: { stream },
      logController: new LogController({ disableRequestLogging: true }),
    });
    app.register(safeErrorsPlugin);
    app.post("/fail", async () => {
      throw new Error("private-error-secret");
    });
    try {
      await app.inject({
        method: "POST",
        url: "/fail?token=query-secret",
        headers: { authorization: "Bearer header-secret" },
        payload: { token: "body-secret" },
      });
      expect(logs).not.toMatch(/secret|authorization|token/);
    } finally {
      await app.close();
    }
  });

  it("offers configured liveness and injected readiness without revealing check failures", async () => {
    let ready = true;
    let throws = false;
    const app = createServer();
    app.register(healthRoutes, {
      prefix: "/probe",
      healthPath: "/live",
      readinessPath: "/available",
      checks: [
        async () => {
          if (throws) throw new Error("private database URL");
          return ready;
        },
      ],
    });
    try {
      expect((await app.inject("/probe/live")).json()).toEqual({ status: "ok" });
      expect((await app.inject("/probe/available")).json()).toEqual({ status: "ready" });
      ready = false;
      for (const shouldThrow of [false, true]) {
        throws = shouldThrow;
        const response = await app.inject("/probe/available");
        expect(response.statusCode).toBe(503);
        expect(response.json()).toEqual({ status: "not_ready" });
      }
      expect((await app.inject("/health")).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("can disable either probe and treats an empty check list as ready", async () => {
    const app = createServer();
    app.register(healthRoutes, { healthPath: false });
    app.register(healthRoutes, { prefix: "/live-only", readinessPath: false });
    try {
      expect((await app.inject("/health")).statusCode).toBe(404);
      expect((await app.inject("/ready")).json()).toEqual({ status: "ready" });
      expect((await app.inject("/live-only/health")).statusCode).toBe(200);
      expect((await app.inject("/live-only/ready")).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
