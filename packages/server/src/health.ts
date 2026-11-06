import type { FastifyPluginAsync } from "fastify";

export type HealthRoutesOptions = {
  healthPath?: string | false;
  readinessPath?: string | false;
  checks?: readonly (() => boolean | Promise<boolean>)[];
};

/** Explicitly registered liveness/readiness routes. Checks own their deadlines and resources. */
export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (app, options) => {
  const { healthPath = "/health", readinessPath = "/ready", checks = [] } = options;
  if (healthPath !== false) {
    app.get(healthPath, async () => ({ status: "ok" as const }));
  }
  if (readinessPath !== false) {
    app.get(readinessPath, async (_request, reply) => {
      try {
        for (const check of checks) {
          if ((await check()) !== true) return reply.code(503).send({ status: "not_ready" });
        }
        return { status: "ready" };
      } catch {
        return reply.code(503).send({ status: "not_ready" });
      }
    });
  }
};
