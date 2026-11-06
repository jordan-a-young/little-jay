import { createServer, safeErrorsPlugin, type FastifyServerOptions } from "@littlejay/server";
import { healthRoutes } from "./routes/health.js";
import { textPreviewRoutes } from "./routes/text-preview.js";
import { LogController } from "fastify";

export function buildApp(options: FastifyServerOptions = {}) {
  const app = createServer({
    logController: new LogController({ disableRequestLogging: true }),
    ...options,
  });
  app.register(safeErrorsPlugin);
  app.register(healthRoutes, { prefix: "/api" });
  app.register(textPreviewRoutes, { prefix: "/api" });
  return app;
}
