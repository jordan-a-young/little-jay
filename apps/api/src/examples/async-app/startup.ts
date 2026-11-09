import { createApp, syntheticDependencies, type AppDependencies } from "./app.js";
import { parseAppConfiguration, parseListenConfiguration } from "./configuration.js";

/** Start only the local demo; factories and imports remain free of process ownership. */
export async function startDemo(
  environment: NodeJS.ProcessEnv,
  dependencies: AppDependencies = syntheticDependencies(),
) {
  const configuration = parseAppConfiguration({});
  const listener = parseListenConfiguration({ port: environment.PORT, host: environment.HOST });
  const app = await createApp(configuration, dependencies);
  let shutdown: Promise<void> | undefined;
  const stop = () => {
    shutdown ??= (async () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      await app.close();
    })();
    return shutdown;
  };
  const onSignal = async () => {
    try {
      await stop();
    } catch {
      console.error("Local server demo shutdown failed");
      process.exitCode = 1;
    }
  };
  try {
    await app.listen(listener);
  } catch (error) {
    try {
      await stop();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Unable to start local server demo");
    }
    throw new Error("Unable to start local server demo", { cause: error });
  }
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  return { app, stop };
}
