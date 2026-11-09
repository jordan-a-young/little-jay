import cookie from "@fastify/cookie";
import { z } from "zod";
import { buildApp } from "../../app.js";
import { parsePolicyConfiguration, type PolicyConfiguration } from "./configuration.js";
import { ApplicationError, installApplicationErrors } from "./errors.js";
import {
  authenticatedSession,
  installAuthentication,
  installAuthorization,
  installBoundary,
  policyTime,
  type PolicyDependencies,
} from "./security.js";

const previewInput = z.strictObject({ text: z.string().min(1).max(80) });
const previewOutput = z.object({ characters: z.number().int().min(0).max(80) });
const auditOutput = z.object({ entries: z.number().int().min(0).max(100) });

/** Service-level validation and explicit projection remain separate from authentication. */
async function projectPreview(input: unknown, subject: string, dependencies: PolicyDependencies) {
  const value = previewInput.parse(input);
  const output = previewOutput.safeParse(await dependencies.preview(value.text, subject));
  if (!output.success) throw new Error("Invalid example service result");
  return { characters: output.data.characters };
}

/** Compose a ready synthetic policy example without changing existing API routes or owning a process. */
export async function createPolicyApp(
  configuration: PolicyConfiguration,
  dependencies: PolicyDependencies,
) {
  const settings = parsePolicyConfiguration(configuration);
  const app = buildApp({
    logger: false,
    bodyLimit: 16_384,
    requestTimeout: 15_000,
    trustProxy: false,
  });
  app.register(
    async (scope) => {
      await scope.register(cookie, { hook: "onRequest" });
      installApplicationErrors(scope);
      installBoundary(scope, settings, dependencies);
      scope.get("/public", async () => ({ access: "public" }));
      scope.post("/validate", async (request) => ({
        characters: previewInput.parse(request.body).text.length,
      }));
      scope.register(
        async (protectedScope) => {
          installApplicationErrors(protectedScope);
          installAuthentication(protectedScope, settings, dependencies);
          installAuthorization(protectedScope, dependencies);
          protectedScope.get("/profile", async (request) => {
            const current = authenticatedSession(request).session;
            return { subject: current.subject, role: current.role };
          });
          protectedScope.post("/preview", async (request) => {
            dependencies.observe?.("service", request.id);
            const output = await projectPreview(
              request.body,
              authenticatedSession(request).session.subject,
              dependencies,
            );
            dependencies.observe?.("projection", request.id);
            return output;
          });
          protectedScope.post("/session", async (request, reply) => {
            const current = authenticatedSession(request);
            const now = policyTime(dependencies);
            const maxAge = Math.min(
              settings.sessionCookie.maxAgeSeconds,
              Math.floor((current.session.expiresAt - now) / 1000),
            );
            if (maxAge < 1) throw new ApplicationError(401, "Authentication required");
            const output = { refreshed: true };
            dependencies.observe?.("projection", request.id);
            const { name, maxAgeSeconds: _maxAgeSeconds, ...options } = settings.sessionCookie;
            reply.setCookie(name, current.identifier, {
              ...options,
              maxAge,
              expires: new Date(now + maxAge * 1000),
            });
            return output;
          });
          protectedScope.register(
            async (adminScope) => {
              installApplicationErrors(adminScope);
              installAuthorization(adminScope, dependencies, "admin");
              adminScope.get("/audit", async (request) => {
                dependencies.observe?.("service", request.id);
                const output = auditOutput.safeParse(
                  await dependencies.readAudit(authenticatedSession(request).session.subject),
                );
                if (!output.success) throw new Error("Invalid example audit result");
                dependencies.observe?.("projection", request.id);
                return { entries: output.data.entries };
              });
            },
            { prefix: "/admin" },
          );
        },
        { prefix: "/private" },
      );
    },
    { prefix: "/api/policy" },
  );
  try {
    await app.ready();
    return app;
  } catch (error) {
    try {
      await app.close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Example policy startup failed");
    }
    throw error;
  }
}
