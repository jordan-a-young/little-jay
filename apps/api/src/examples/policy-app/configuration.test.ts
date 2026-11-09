import { describe, expect, it } from "vite-plus/test";
import { parsePolicyConfiguration } from "./configuration.js";

const input = { allowedHosts: ["example.test:4221"], allowedOrigins: ["https://example.test"] };

describe("explicit policy configuration", () => {
  it("provides secure bounded cookie defaults without introducing environment ownership", () => {
    expect(parsePolicyConfiguration(input)).toEqual({
      ...input,
      csrfHeader: "x-policy-csrf",
      sessionCookie: {
        name: "policy-session",
        path: "/api/policy",
        secure: true,
        httpOnly: true,
        sameSite: "strict",
        maxAgeSeconds: 1800,
      },
    });
  });
  it.each([
    {},
    { ...input, extra: "synthetic-private-config" },
    { ...input, allowedHosts: [] },
    { ...input, allowedHosts: ["*.example.test"] },
    { ...input, allowedHosts: ["example.test/path"] },
    { ...input, allowedHosts: ["user@example.test"] },
    { ...input, allowedHosts: [" example.test"] },
    { ...input, allowedOrigins: ["null"] },
    { ...input, allowedOrigins: ["https://example.test/"] },
    { ...input, allowedOrigins: ["https://user@example.test"] },
    { ...input, allowedOrigins: ["https://*.example.test"] },
    { ...input, csrfHeader: "origin" },
    { ...input, csrfHeader: "x-forwarded-host" },
    { ...input, csrfHeader: "x-invalid\r\n" },
  ])("rejects noncanonical, wildcard or unsafe policy input: %j", (value) => {
    expect(() => parsePolicyConfiguration(value)).toThrow("Invalid example policy configuration");
  });
  it.each([
    { name: "invalid name" },
    { path: "/invalid;path" },
    { sameSite: "none", secure: false },
    { name: "__Secure-session", secure: false },
    { name: "__secure-session", secure: false },
    { name: "__sEcUrE-session", secure: false },
    { name: "__Host-session", path: "/api" },
    { name: "__host-session", path: "/api" },
    { name: "__hOsT-session", path: "/api" },
    { name: "__Http-session", httpOnly: false },
    { name: "__http-session", httpOnly: false },
    { name: "__Host-Http-session", path: "/", httpOnly: false },
    { name: "__hOsT-hTtP-session", path: "/", httpOnly: false },
    { maxAgeSeconds: 0 },
    { maxAgeSeconds: 86_401 },
    { domain: "example.test" },
    { value: "synthetic-private-cookie" },
  ])("rejects unsafe cookie options: %j", (sessionCookie) => {
    expect(() => parsePolicyConfiguration({ ...input, sessionCookie })).toThrow(
      "Invalid example policy configuration",
    );
  });
  it("allows explicit application-owned names, flags and valid prefix constraints", () => {
    expect(
      parsePolicyConfiguration({
        ...input,
        csrfHeader: "x-example-token",
        sessionCookie: {
          name: "custom-session",
          secure: false,
          httpOnly: false,
          sameSite: "lax",
          maxAgeSeconds: 60,
        },
      }).sessionCookie,
    ).toMatchObject({
      name: "custom-session",
      secure: false,
      httpOnly: false,
      sameSite: "lax",
      maxAgeSeconds: 60,
    });
    expect(
      parsePolicyConfiguration({
        ...input,
        sessionCookie: {
          name: "__Host-Http-session",
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "none",
        },
      }).sessionCookie.name,
    ).toBe("__Host-Http-session");
  });
});
