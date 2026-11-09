import { once } from "node:events";
import { request } from "node:http";
import { createServer } from "node:net";
import { expect, it, vi } from "vite-plus/test";
import { createPolicyApp } from "./app.js";
import { parsePolicyConfiguration } from "./configuration.js";

function exchange(
  port: number,
  headers: string[],
  method = "POST",
  path = "/api/policy/private/preview",
) {
  return new Promise<{
    status: number | undefined;
    headers: Record<string, unknown>;
    body: string;
  }>((resolve, reject) => {
    const operation = request(
      { hostname: "127.0.0.1", port, method, path, headers },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
          if (Buffer.byteLength(body) > 4096)
            operation.destroy(new Error("Example response limit exceeded"));
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({ status: response.statusCode, headers: response.headers, body }),
        );
      },
    );
    operation.setTimeout(2000, () =>
      operation.destroy(new Error("Example loopback deadline exceeded")),
    );
    operation.on("error", reject);
    operation.end(method === "POST" ? JSON.stringify({ text: "local" }) : undefined);
  });
}

it("exercises real loopback requests, raw duplicate header denials and listener release", async () => {
  const host = "example.test:4221";
  const origin = "https://example.test";
  const token = "synthetic_csrf_network_token";
  const preview = vi.fn(async (text: string) => ({ characters: text.length }));
  const findSession = vi.fn(async () => ({
    subject: "example-member",
    role: "member",
    csrfToken: token,
    expiresAt: Date.parse("2026-01-01T00:01:00Z"),
  }));
  const app = await createPolicyApp(
    parsePolicyConfiguration({ allowedHosts: [host], allowedOrigins: [origin] }),
    {
      clock: () => Date.parse("2026-01-01T00:00:00Z"),
      findSession,
      preview,
      readAudit: async () => ({ entries: 0 }),
    },
  );
  const baseHeaders = [
    "Host",
    host,
    "Origin",
    origin,
    "Cookie",
    "policy-session=synthetic_member",
    "x-policy-csrf",
    token,
    "Content-Type",
    "application/json",
    "Connection",
    "close",
  ];
  let port: number;
  try {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected loopback TCP listener");
    port = address.port;
    expect(address.address).toBe("127.0.0.1");
    expect(app.server.listening).toBe(true);
    const success = await exchange(port, baseHeaders);
    expect(success.status).toBe(200);
    expect(JSON.parse(success.body)).toEqual({ characters: 5 });
    expect(success.headers["cache-control"]).toBe("no-store");
    expect(preview).toHaveBeenCalledExactlyOnceWith("local", "example-member");
    for (const [name, value, status] of [
      ["Host", host, 403],
      ["Origin", origin, 403],
      ["Cookie", "policy-session=synthetic_member", 401],
      ["x-policy-csrf", token, 403],
    ] as const) {
      preview.mockClear();
      findSession.mockClear();
      const failure = await exchange(port, [...baseHeaders, name, value]);
      expect(failure.status, name).toBe(status);
      expect(JSON.parse(failure.body)).toEqual({
        error: status === 401 ? "Authentication required" : "Request forbidden",
      });
      expect(failure.headers["content-security-policy"]).toBe(
        "default-src 'none'; frame-ancestors 'none'",
      );
      expect(preview).not.toHaveBeenCalled();
      if (name === "Host" || name === "Origin") expect(findSession).not.toHaveBeenCalled();
    }
    const missingHost = await exchange(port, ["Connection", "close"], "GET", "/api/policy/public");
    expect([400, 403]).toContain(missingHost.status);
  } finally {
    await app.close();
  }
  expect(app.server.listening).toBe(false);
  const probe = createServer();
  try {
    probe.listen({ host: "127.0.0.1", port: port! });
    await once(probe, "listening");
    expect(probe.listening).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
  }
  expect(probe.listening).toBe(false);
});
