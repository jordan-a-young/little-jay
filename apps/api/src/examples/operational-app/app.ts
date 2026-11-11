import {
  createServer,
  healthRoutes,
  safeErrorsPlugin,
  type FastifyServerOptions,
} from "@littlejay/server";
import { textPreviewRoutes } from "../../routes/text-preview.js";
import { parseOperationalConfiguration, type OperationalConfiguration } from "./configuration.js";
import {
  startOperationalLifecycle,
  type LifecycleOptions,
  type OperationalLifecycle,
} from "./lifecycle.js";
import { createOperationalLoggingOptions, createOperationalReporter } from "./logging.js";

export interface OperationalDependencies {
  acquire: LifecycleOptions["acquire"];
  runWork?: (signal: AbortSignal) => Promise<void>;
  operation?: () => Promise<boolean>;
}

/** Compose native logging and application-owned resources without environment, signal, or listener ownership. */
export async function createOperationalApp(
  configuration: OperationalConfiguration,
  dependencies: OperationalDependencies,
  logging: FastifyServerOptions = createOperationalLoggingOptions({ enabled: false }),
) {
  const settings = parseOperationalConfiguration(configuration);
  const app = createServer({
    ...logging,
    bodyLimit: 16_384,
    requestTimeout: 15_000,
    trustProxy: false,
  });
  const report = createOperationalReporter(app.log);
  let lifecycle: OperationalLifecycle | undefined;
  let initialization: Promise<OperationalLifecycle> | undefined;
  let closing = false;
  app.addHook("onReady", async () => {
    if (closing) return;
    initialization = startOperationalLifecycle({
      acquire: dependencies.acquire,
      backgroundWork: settings.backgroundWork,
      operationTimeoutMs: settings.readinessTimeoutMs,
      ...(dependencies.runWork && {
        work: { intervalMs: settings.workIntervalMs, run: dependencies.runWork },
      }),
      report,
    });
    lifecycle = await initialization;
  });
  app.addHook("onClose", async () => {
    closing = true;
    let initialized: OperationalLifecycle | undefined;
    try {
      initialized = await initialization;
    } catch {
      return;
    }
    await initialized?.close();
  });
  app.addHook("onResponse", async () => {
    report("request-completed");
  });
  app.register(safeErrorsPlugin);
  app.register(healthRoutes, {
    prefix: "/api",
    checks: [async () => (await lifecycle?.isReady()) === true],
  });
  app.register(textPreviewRoutes, { prefix: "/api" });
  app.get("/api/operation", async () => {
    const completed = dependencies.operation ? await dependencies.operation() : true;
    if (typeof completed !== "boolean") throw new Error("Invalid operational result");
    return { completed };
  });
  try {
    await app.ready();
    return app;
  } catch {
    report("startup-failed");
    try {
      await app.close();
    } catch {
      throw new AggregateError(
        [new Error("Operational initialization failed"), new Error("Operational cleanup failed")],
        "Operational example startup failed",
      );
    }
    throw new Error("Operational example startup failed");
  }
}
