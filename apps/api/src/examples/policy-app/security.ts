import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { PolicyConfiguration } from "./configuration.js";
import { ApplicationError } from "./errors.js";

export type PolicyStage =
  | "cookies"
  | "boundary"
  | "session"
  | "csrf"
  | "authorization"
  | "service"
  | "projection";

const csrfToken = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const session = z.object({
  subject: z.string().min(1).max(80),
  role: z.enum(["member", "admin"]),
  csrfToken,
  expiresAt: z.number().int().min(0).max(8_640_000_000_000_000),
});
export type PolicySession = z.infer<typeof session>;
export type AuthenticatedSession = { identifier: string; session: PolicySession };
export interface PolicyDependencies {
  clock: () => number;
  findSession: (identifier: string) => Promise<unknown>;
  preview: (text: string, subject: string) => Promise<unknown>;
  readAudit: (subject: string) => Promise<unknown>;
  observe?: (stage: PolicyStage, requestId: string) => void;
}

/** Require one raw header occurrence rather than trusting forwarded or combined header values. */
function singleHeader(request: FastifyRequest, name: string) {
  let occurrences = 0;
  for (let index = 0; index < request.raw.rawHeaders.length; index += 2)
    if (request.raw.rawHeaders[index]?.toLowerCase() === name) occurrences += 1;
  const value = request.headers[name];
  return occurrences === 1 && typeof value === "string" ? value : undefined;
}

function safeMethod(method: string) {
  return method === "GET" || method === "HEAD";
}

/** Validate the injected clock before comparing session expiry or serializing a cookie date. */
export function policyTime(dependencies: PolicyDependencies) {
  const now = dependencies.clock();
  if (!Number.isSafeInteger(now) || now < 0 || now > 8_640_000_000_000_000)
    throw new TypeError("Invalid example clock");
  return now;
}

/** Authentication state is request-local and available only inside the protected native scope. */
export function authenticatedSession(request: FastifyRequest) {
  const current = request.getDecorator<AuthenticatedSession | null>("policySession");
  if (!current) throw new ApplicationError(401, "Authentication required");
  return current;
}

/** Cookie parsing is registered first; boundary denials never invoke session lookup. */
export function installBoundary(
  app: FastifyInstance,
  settings: PolicyConfiguration,
  dependencies: PolicyDependencies,
) {
  app.addHook("onRequest", async (request, reply) => {
    dependencies.observe?.("cookies", request.id);
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    reply.header("Cache-Control", "no-store");
    dependencies.observe?.("boundary", request.id);
    const host = singleHeader(request, "host");
    if (!host || !settings.allowedHosts.includes(host))
      throw new ApplicationError(403, "Request forbidden");
    const origin = singleHeader(request, "origin");
    const originPresent =
      request.headers.origin !== undefined ||
      request.raw.rawHeaders.some(
        (name, index) => index % 2 === 0 && name.toLowerCase() === "origin",
      );
    if (
      originPresent
        ? !origin || !settings.allowedOrigins.includes(origin)
        : !safeMethod(request.method)
    )
      throw new ApplicationError(403, "Request forbidden");
  });
}

/** Native protected scopes authenticate before parsing, then check CSRF before authorization. */
export function installAuthentication(
  app: FastifyInstance,
  settings: PolicyConfiguration,
  dependencies: PolicyDependencies,
) {
  app.decorateRequest("policySession", null);
  app.addHook("onRequest", async (request) => {
    dependencies.observe?.("session", request.id);
    const rawCookie = singleHeader(request, "cookie");
    const identifiers = rawCookie
      ?.split(";")
      .filter((part) => part.slice(0, part.indexOf("=")).trim() === settings.sessionCookie.name);
    const identifier = request.cookies[settings.sessionCookie.name];
    if (
      identifiers?.length !== 1 ||
      typeof identifier !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(identifier)
    )
      throw new ApplicationError(401, "Authentication required");
    const result = session.safeParse(await dependencies.findSession(identifier));
    if (!result.success || result.data.expiresAt <= policyTime(dependencies))
      throw new ApplicationError(401, "Authentication required");
    request.setDecorator("policySession", {
      identifier,
      session: result.data,
    } satisfies AuthenticatedSession);
  });
  app.addHook("preValidation", async (request) => {
    dependencies.observe?.("csrf", request.id);
    if (safeMethod(request.method)) return;
    const token = singleHeader(request, settings.csrfHeader);
    const expected = authenticatedSession(request).session.csrfToken;
    if (!csrfToken.safeParse(token).success) throw new ApplicationError(403, "Request forbidden");
    const receivedBytes = Buffer.from(token!);
    const expectedBytes = Buffer.from(expected);
    if (
      receivedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(receivedBytes, expectedBytes)
    )
      throw new ApplicationError(403, "Request forbidden");
  });
}

/** Authorization is independent of response projection and runs after inherited CSRF checks. */
export function installAuthorization(
  app: FastifyInstance,
  dependencies: PolicyDependencies,
  role?: PolicySession["role"],
) {
  app.addHook("preHandler", async (request) => {
    dependencies.observe?.("authorization", request.id);
    const current = authenticatedSession(request).session;
    if (role && current.role !== role) throw new ApplicationError(403, "Request forbidden");
  });
}
