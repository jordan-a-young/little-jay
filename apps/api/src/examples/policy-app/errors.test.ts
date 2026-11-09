import { createServer, safeErrorsPlugin } from "@littlejay/server";
import { z } from "zod";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ApplicationError, installApplicationErrors } from "./errors.js";

const applications: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function example(failure?: unknown) {
  const app = createServer({ logger: false, bodyLimit: 128 });
  applications.push(app);
  app.register(safeErrorsPlugin);
  app.get("/canonical", async () => {
    throw new Error("synthetic-private-diagnostic");
  });
  app.register(
    async (scope) => {
      installApplicationErrors(scope);
      scope.post("/preview", async (request) => {
        const value = z.strictObject({ text: z.string().min(1).max(20) }).parse(request.body);
        return { characters: value.text.length };
      });
      scope.get("/failure", async () => {
        throw failure;
      });
      scope.register(
        async (nested) => {
          nested.get("/service", async () => z.string().parse(5));
        },
        { prefix: "/nested" },
      );
    },
    { prefix: "/application" },
  );
  await app.ready();
  return app;
}

describe("application-owned error contract", () => {
  it("retains successful application responses and validates in handlers/services without schema conversion", async () => {
    const app = await example();
    const success = await app.inject({
      method: "POST",
      url: "/application/preview",
      payload: { text: "local" },
    });
    expect(success.statusCode).toBe(200);
    expect(success.json()).toEqual({ characters: 5 });
    for (const payload of [{ text: "" }, { text: 5 }, { secret: "synthetic-private-input" }]) {
      const invalid = await app.inject({ method: "POST", url: "/application/preview", payload });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual({ error: "Invalid request" });
    }
    const serviceFailure = await app.inject("/application/nested/service");
    expect(serviceFailure.statusCode).toBe(400);
    expect(serviceFailure.json()).toEqual({ error: "Invalid request" });
  });

  it.each([400, 401, 403, 404, 409, 422, 429, 499])(
    "preserves explicitly constructed application status %s and safe copy",
    async (status) => {
      const app = await example(new ApplicationError(status, "Example request rejected"));
      const response = await app.inject("/application/failure");
      expect(response.statusCode).toBe(status);
      expect(response.json()).toEqual({ error: "Example request rejected" });
    },
  );

  it.each([500, 503, 599])(
    "sanitizes application status %s without exposing its message",
    async (status) => {
      const app = await example(new ApplicationError(status, "synthetic-private-diagnostic"));
      const response = await app.inject("/application/failure");
      expect(response.statusCode).toBe(status);
      expect(response.json()).toEqual({ error: "Internal server error" });
    },
  );

  it.each([429, 503])("preserves a validated Retry-After header for status %s", async (status) => {
    const app = await example(new ApplicationError(status, "Try again later", 30));
    const response = await app.inject("/application/failure");
    expect(response.statusCode).toBe(status);
    expect(response.headers["retry-after"]).toBe("30");
    expect(response.json()).toEqual({
      error: status >= 500 ? "Internal server error" : "Try again later",
    });
  });

  it.each([
    new Error("synthetic-private-diagnostic"),
    { statusCode: 418, message: "synthetic-private-diagnostic" },
    { code: "constructor", message: "synthetic-private-diagnostic" },
    "synthetic-private-diagnostic",
    null,
  ])("never trusts arbitrary thrown values or their statuses", async (failure) => {
    const app = await example(failure);
    const response = await app.inject("/application/failure");
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal server error" });
  });

  it("maps parser failures, body limits and not-found responses without leaking input", async () => {
    const app = await example();
    for (const payload of ["{", ""]) {
      const invalid = await app.inject({
        method: "POST",
        url: "/application/preview",
        headers: { "content-type": "application/json" },
        payload,
      });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual({ error: "Invalid request" });
    }
    const large = await app.inject({
      method: "POST",
      url: "/application/preview",
      payload: { text: "x".repeat(200) },
    });
    expect(large.statusCode).toBe(413);
    expect(large.json()).toEqual({ error: "Request body too large" });
    const unsupported = await app.inject({
      method: "POST",
      url: "/application/preview",
      headers: { "content-type": "application/octet-stream" },
      payload: "synthetic-private-input",
    });
    expect(unsupported.statusCode).toBe(415);
    expect(unsupported.json()).toEqual({ error: "Unsupported media type" });
    const missing = await app.inject("/application/missing?private=synthetic-private-input");
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: "Not found" });
  });

  it("keeps the canonical plugin and sibling/parent scopes unchanged", async () => {
    const app = await example();
    const canonical = await app.inject("/canonical");
    expect(canonical.statusCode).toBe(500);
    expect(canonical.json()).toEqual({
      statusCode: 500,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect((await app.inject("/missing")).json()).toEqual({
      statusCode: 404,
      error: { code: "NOT_FOUND", message: "Not found" },
    });
  });

  it("rejects invalid application error construction and fails closed for mutated fields", async () => {
    for (const status of [200, 399, 600, 400.5, NaN])
      expect(() => new ApplicationError(status, "Example rejection")).toThrow(TypeError);
    for (const message of [
      "",
      " ",
      "invalid\nheader",
      "invalid\u0000message",
      "invalid\u007fmessage",
      "x".repeat(161),
    ])
      expect(() => new ApplicationError(400, message)).toThrow(TypeError);
    for (const retry of [-1, 0.5, 86_401, NaN])
      expect(() => new ApplicationError(429, "Try again", retry)).toThrow(TypeError);
    const failure = new ApplicationError(400, "Example rejection");
    Object.assign(failure, { statusCode: 200 });
    const app = await example(failure);
    const response = await app.inject("/application/failure");
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "Internal server error" });
  });
});
