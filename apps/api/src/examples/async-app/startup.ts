import type { FastifyInstance } from "@littlejay/server";
import { createApp, syntheticDependencies, type AppDependencies } from "./app.js";
import { parseAppConfiguration, parseListenConfiguration } from "./configuration.js";

/**
 * Own local-demo listening and signals, optionally composing another ready application factory.
 * A supplied factory owns initialization rollback until it returns; dependencies apply to the default factory only.
 */
export async function startDemo(
  environment: NodeJS.ProcessEnv,
  dependencies: AppDependencies = syntheticDependencies(),
  createApplication?: () => Promise<FastifyInstance>,
) {
  const configuration = parseAppConfiguration({});
  const listener = parseListenConfiguration({ port: environment.PORT, host: environment.HOST });
  let app: FastifyInstance | undefined;
  let stopRequested = false;
  let shutdown: Promise<void> | undefined;
  let signalShutdown: Promise<void> | undefined;
  const stop = () => {
    stopRequested = true;
    shutdown ??= (async () => {
      try {
        await Promise.allSettled([startup]);
        await app?.close();
      } finally {
        process.removeListener("SIGINT", onSignal);
        process.removeListener("SIGTERM", onSignal);
      }
    })();
    return shutdown;
  };
  const onSignal = () => {
    signalShutdown ??= handleSignal();
    return signalShutdown;
  };
  async function handleSignal() {
    try {
      await stop();
    } catch {
      console.error("Local server demo shutdown failed");
      process.exitCode = 1;
    }
  }
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  const startup = initialize();
  async function initialize() {
    await Promise.resolve();
    app = await (createApplication ? createApplication() : createApp(configuration, dependencies));
    if (!stopRequested) await app.listen(listener);
    return app;
  }
  try {
    const readyApp = await startup;
    if (stopRequested) await stop();
    return { app: readyApp, stop };
  } catch (error) {
    try {
      await stop();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to start local server demo");
    }
    throw new Error("Unable to start local server demo", { cause: error });
  }
}
