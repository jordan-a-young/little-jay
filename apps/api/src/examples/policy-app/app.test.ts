import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as originalApplication from "../../app.js";
import { createPolicyApp } from "./app.js";
import { parsePolicyConfiguration } from "./configuration.js";
import type { PolicyDependencies } from "./security.js";

const now = Date.parse("2026-01-01T00:00:00Z");
const token = "synthetic_csrf_member_token";
const headers = {
  host: "example.test:4221",
  origin: "https://example.test",
  cookie: "policy-session=synthetic_member",
  "x-policy-csrf": token,
};
const configuration = parsePolicyConfiguration({
  allowedHosts: [headers.host],
  allowedOrigins: [headers.origin],
});
const applications: Awaited<ReturnType<typeof createPolicyApp>>[] = [];
afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
  vi.restoreAllMocks();
});

function dependencies(): PolicyDependencies {
  return {
    clock: vi.fn(() => now),
    findSession: vi.fn(async (identifier) =>
      identifier === "synthetic_member"
        ? {
            subject: "example-member",
            role: "member",
            csrfToken: token,
            expiresAt: now + 60_000,
            private: "synthetic-private-session",
          }
        : identifier === "synthetic_admin"
          ? {
              subject: "example-admin",
              role: "admin",
              csrfToken: "synthetic_csrf_admin_token",
              expiresAt: now + 60_000,
            }
          : null,
    ),
    preview: vi.fn(async (text) => ({
      characters: text.length,
      private: "synthetic-private-service",
    })),
    readAudit: vi.fn(async () => ({ entries: 2, private: "synthetic-private-audit" })),
    observe: vi.fn(),
  };
}

async function example(supplied = dependencies(), settings = configuration) {
  const app = await createPolicyApp(settings, supplied);
  applications.push(app);
  return { app, supplied };
}

function expectHeaders(response: { headers: Record<string, unknown> }) {
  expect(response.headers["content-security-policy"]).toBe(
    "default-src 'none'; frame-ancestors 'none'",
  );
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.headers["access-control-allow-origin"]).toBeUndefined();
}

describe("native policy boundaries and encapsulation", () => {
  it("returns a ready non-listening app, keeps public routes deliberate and retains original contracts", async () => {
    const signals = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
    const { app, supplied } = await example();
    expect(app.server.listening).toBe(false);
    expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(signals);
    const publicResponse = await app.inject({
      url: "/api/policy/public",
      headers: { host: headers.host },
    });
    expect(publicResponse.json()).toEqual({ access: "public" });
    expectHeaders(publicResponse);
    expect(supplied.findSession).not.toHaveBeenCalled();
    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
    expect((await app.inject("/api/ready")).json()).toEqual({ status: "ready" });
    const invalid = await app.inject({ method: "POST", url: "/api/text-preview", payload: {} });
    expect(invalid.json()).toEqual({
      statusCode: 400,
      error: { code: "BAD_REQUEST", message: "Invalid request" },
    });
    expect((await app.inject("/api/policy-adjacent/missing")).json()).toEqual({
      statusCode: 404,
      error: { code: "NOT_FOUND", message: "Not found" },
    });
  });

  it("proves cookie/boundary/session/CSRF/authorization/service/projection ordering and typed authentication", async () => {
    const { app, supplied } = await example();
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers,
      payload: { text: "local" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ characters: 5 });
    expectHeaders(response);
    expect(supplied.findSession).toHaveBeenCalledWith("synthetic_member");
    expect(supplied.preview).toHaveBeenCalledWith("local", "example-member");
    expect(vi.mocked(supplied.observe!).mock.calls.map(([stage]) => stage)).toEqual([
      "cookies",
      "boundary",
      "session",
      "csrf",
      "authorization",
      "service",
      "projection",
    ]);
    expect((await app.inject({ url: "/api/policy/private/profile", headers })).json()).toEqual({
      subject: "example-member",
      role: "member",
    });
    expect(response.body).not.toContain("synthetic-private");
  });

  it.each([
    { ...headers, host: "other.test:4221" },
    { ...headers, host: "example.test:4222" },
    { ...headers, host: "other.test:4221", "x-forwarded-host": headers.host },
    { ...headers, origin: "https://other.test" },
    { ...headers, origin: "null" },
    { ...headers, origin: "https://example.test/" },
    { ...headers, origin: "https://example.test.evil.invalid" },
  ])("rejects mismatched exact Host/Origin before lookup: %j", async (requestHeaders) => {
    const { app, supplied } = await example();
    const response = await app.inject({
      url: "/api/policy/private/profile",
      headers: requestHeaders,
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Request forbidden" });
    expectHeaders(response);
    expect(supplied.findSession).not.toHaveBeenCalled();
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it("requires Origin for unsafe requests without trusting forwarded headers", async () => {
    const { app, supplied } = await example();
    const { origin: _origin, ...requestHeaders } = headers;
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers: requestHeaders,
      payload: { text: "local" },
    });
    expect(response.statusCode).toBe(403);
    expect(supplied.findSession).not.toHaveBeenCalled();
    expect(
      (await app.inject({ url: "/api/policy/private/profile", headers: requestHeaders }))
        .statusCode,
    ).toBe(200);
  });

  it.each([
    "",
    "policy-session=unknown",
    "policy-session=invalid.value",
    "policy-session=synthetic_member; policy-session=synthetic_admin",
  ])("rejects absent, malformed or ambiguous session cookies: %s", async (cookie) => {
    const { app, supplied } = await example();
    const response = await app.inject({
      url: "/api/policy/private/profile",
      headers: { ...headers, cookie },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Authentication required" });
    expectHeaders(response);
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { subject: "member", role: "owner", csrfToken: token, expiresAt: now + 60_000 },
    { subject: "member", role: "member", csrfToken: token, expiresAt: now },
    { subject: "member", role: "member", csrfToken: token, expiresAt: Infinity },
    { subject: "member", role: "member", csrfToken: "short", expiresAt: now + 60_000 },
  ])("validates runtime session records and rejects expiry at equality: %j", async (session) => {
    const supplied = dependencies();
    supplied.findSession = vi.fn(async () => session);
    const { app } = await example(supplied);
    const response = await app.inject({ url: "/api/policy/private/profile", headers });
    expect(response.statusCode).toBe(401);
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "short",
    "x".repeat(129),
    "wrong_session_csrf_token",
    "é".repeat(token.length),
    "synthetic_csrf_member_token,synthetic_csrf_member_token",
  ])("rejects missing, malformed and wrong-session CSRF tokens: %s", async (csrf) => {
    const { app, supplied } = await example();
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers: { ...headers, "x-policy-csrf": csrf },
      payload: { text: "local" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "Request forbidden" });
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it("inherits protection on nested admin routes while allowing deliberate public scope", async () => {
    const { app, supplied } = await example();
    const member = await app.inject({ url: "/api/policy/private/admin/audit", headers });
    expect(member.statusCode).toBe(403);
    expect(member.json()).toEqual({ error: "Request forbidden" });
    expect(supplied.readAudit).not.toHaveBeenCalled();
    const admin = await app.inject({
      url: "/api/policy/private/admin/audit",
      headers: { ...headers, cookie: "policy-session=synthetic_admin" },
    });
    expect(admin.json()).toEqual({ entries: 2 });
    expect(supplied.readAudit).toHaveBeenCalledExactlyOnceWith("example-admin");
    const { cookie: _cookie, ...publicHeaders } = headers;
    expect(
      (await app.inject({ url: "/api/policy/private/admin/audit", headers: publicHeaders }))
        .statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ url: "/api/policy/public", headers: publicHeaders })).statusCode,
    ).toBe(200);
    expect(supplied.readAudit).toHaveBeenCalledOnce();
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it.each([
    "/api/policy",
    "/api/policy/missing",
    "/api/policy/private/missing",
    "/api/policy/private/admin/missing",
  ])(
    "handles scoped unknown routes without falling back to unrelated handlers: %s",
    async (url) => {
      const { app, supplied } = await example();
      const adminHeaders = { ...headers, cookie: "policy-session=synthetic_admin" };
      const response = await app.inject({ url, headers: adminHeaders });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "Not found" });
      expectHeaders(response);
      if (url.includes("/private")) {
        const unauthenticated = await app.inject({ url, headers: { host: headers.host } });
        expect(unauthenticated.statusCode).toBe(401);
        if (url.includes("/admin"))
          expect((await app.inject({ url, headers })).statusCode).toBe(403);
      }
      expect(supplied.preview).not.toHaveBeenCalled();
    },
  );

  it("keeps authentication request-local across interleaved member/admin requests", async () => {
    const supplied = dependencies();
    const lookup = supplied.findSession;
    let release: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    supplied.findSession = async (identifier) => {
      if (identifier === "synthetic_member") {
        markStarted!();
        await waiting;
      }
      return lookup(identifier);
    };
    const { app } = await example(supplied);
    const member = (async () =>
      await app.inject({ url: "/api/policy/private/profile", headers }))();
    await started;
    const admin = await app.inject({
      url: "/api/policy/private/profile",
      headers: { ...headers, cookie: "policy-session=synthetic_admin" },
    });
    release!();
    expect(admin.json()).toEqual({ subject: "example-admin", role: "admin" });
    expect((await member).json()).toEqual({ subject: "example-member", role: "member" });
  });
});

describe("combined application contracts and cookies", () => {
  it("validates in handlers and services, preserving parser/body-limit negatives before CSRF", async () => {
    const { app, supplied } = await example();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/policy/validate",
          headers,
          payload: { text: "local" },
        })
      ).json(),
    ).toEqual({ characters: 5 });
    for (const url of ["/api/policy/validate", "/api/policy/private/preview"]) {
      const invalid = await app.inject({ method: "POST", url, headers, payload: { text: "" } });
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual({ error: "Invalid request" });
    }
    const malformed = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers: { ...headers, "content-type": "application/json", "x-policy-csrf": "missing" },
      payload: "{",
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ error: "Invalid request" });
    const large = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers,
      payload: { text: "x".repeat(17_000) },
    });
    expect(large.statusCode).toBe(413);
    expect(large.json()).toEqual({ error: "Request body too large" });
    const unsupported = await app.inject({
      method: "POST",
      url: "/api/policy/private/preview",
      headers: { ...headers, "content-type": "application/octet-stream" },
      payload: "local",
    });
    expect(unsupported.statusCode).toBe(415);
    expect(unsupported.json()).toEqual({ error: "Unsupported media type" });
    for (const response of [malformed, large, unsupported]) expectHeaders(response);
    expect(supplied.preview).not.toHaveBeenCalled();
  });

  it.each(["lookup", "service", "clock", "projection"])(
    "sanitizes %s failures without leaking diagnostics or setting cookies",
    async (phase) => {
      const supplied = dependencies();
      if (phase === "lookup")
        supplied.findSession = async () => {
          throw new Error("synthetic-private-lookup");
        };
      if (phase === "service")
        supplied.preview = async () => {
          throw new Error("synthetic-private-service");
        };
      if (phase === "clock") supplied.clock = () => NaN;
      if (phase === "projection")
        supplied.preview = async () => ({ characters: "synthetic-private-output" });
      const { app } = await example(supplied);
      const response = await app.inject({
        method: "POST",
        url: "/api/policy/private/preview",
        headers,
        payload: { text: "local" },
      });
      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Internal server error" });
      expect(response.headers["set-cookie"]).toBeUndefined();
      expectHeaders(response);
    },
  );

  it("refreshes only the authenticated cookie, caps lifetime and emits explicit application flags", async () => {
    const settings = parsePolicyConfiguration({
      ...configuration,
      csrfHeader: "x-example-token",
      sessionCookie: {
        name: "custom-session",
        secure: false,
        httpOnly: false,
        sameSite: "lax",
        path: "/api/policy/private",
        maxAgeSeconds: 1800,
      },
    });
    const { app } = await example(dependencies(), settings);
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/session",
      headers: { ...headers, cookie: "custom-session=synthetic_member", "x-example-token": token },
      payload: { identifier: "synthetic_admin" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ refreshed: true });
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("custom-session=synthetic_member");
    expect(cookie).not.toContain("synthetic_admin");
    expect(cookie).toContain("Max-Age=60");
    expect(cookie).toContain("Expires=Thu, 01 Jan 2026 00:01:00 GMT");
    expect(cookie).toContain("Path=/api/policy/private");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("HttpOnly");
  });

  it("retains secure cookie defaults and never sets cookies after a failed projection", async () => {
    const { app } = await example();
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/session",
      headers,
    });
    expect(response.statusCode).toBe(200);
    expect(String(response.headers["set-cookie"])).toContain("HttpOnly; Secure; SameSite=Strict");
    const supplied = dependencies();
    supplied.observe = (stage) => {
      if (stage === "projection") throw new Error("synthetic-private-projection");
    };
    const failing = await example(supplied);
    const failure = await failing.app.inject({
      method: "POST",
      url: "/api/policy/private/session",
      headers,
    });
    expect(failure.statusCode).toBe(500);
    expect(failure.headers["set-cookie"]).toBeUndefined();
  });

  it("preserves mixed-case cookie spelling after case-insensitive prefix validation", async () => {
    const settings = parsePolicyConfiguration({
      ...configuration,
      sessionCookie: { name: "__hOsT-session", path: "/" },
    });
    const { app } = await example(dependencies(), settings);
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/session",
      headers: { ...headers, cookie: "__hOsT-session=synthetic_member" },
    });
    expect(response.statusCode).toBe(200);
    expect(String(response.headers["set-cookie"])).toContain("__hOsT-session=synthetic_member");
    expect(String(response.headers["set-cookie"])).toContain("Path=/");
    expect(String(response.headers["set-cookie"])).toContain("HttpOnly; Secure; SameSite=Strict");
  });

  it("rejects expiry during refresh without extending the session", async () => {
    const supplied = dependencies();
    supplied.clock = vi
      .fn()
      .mockReturnValueOnce(now)
      .mockReturnValue(now + 60_000);
    const { app } = await example(supplied);
    const response = await app.inject({
      method: "POST",
      url: "/api/policy/private/session",
      headers,
    });
    expect(response.statusCode).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("validates configuration before dependencies run and imports contain no environment/signal ownership", async () => {
    const supplied = dependencies();
    const construction = vi.spyOn(originalApplication, "buildApp");
    await expect(createPolicyApp({ ...configuration, allowedHosts: [] }, supplied)).rejects.toThrow(
      "Invalid example policy configuration",
    );
    expect(construction).not.toHaveBeenCalled();
    expect(supplied.clock).not.toHaveBeenCalled();
    expect(supplied.findSession).not.toHaveBeenCalled();
    for (const file of ["app.ts", "security.ts", "configuration.ts", "errors.ts"]) {
      const source = await readFile(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/process\.(env|on|once|addListener)/);
    }
  });

  it("closes a failed readiness attempt without acquiring process ownership", async () => {
    const buildApp = originalApplication.buildApp;
    const cleanup = vi.fn();
    vi.spyOn(originalApplication, "buildApp").mockImplementation((options) => {
      const app = buildApp(options);
      app.addHook("onReady", async () => {
        throw new Error("synthetic-private-startup");
      });
      app.addHook("onClose", async () => {
        cleanup();
      });
      return app;
    });
    await expect(createPolicyApp(configuration, dependencies())).rejects.toThrow(
      "synthetic-private-startup",
    );
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
