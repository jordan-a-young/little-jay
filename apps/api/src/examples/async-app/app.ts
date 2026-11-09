import { buildApp } from "../../app.js";
import { parseAppConfiguration, type AppConfiguration } from "./configuration.js";

export interface AppDependencies {
  clock: () => Date;
  transport: () => Promise<boolean>;
  readLocal: (limit: number) => Promise<readonly unknown[]>;
  startBackground?: () => Promise<() => Promise<void>>;
}

/** Construct a ready native app; the caller owns configuration, dependencies and listening. */
export async function createApp(configuration: AppConfiguration, dependencies: AppDependencies) {
  const settings = parseAppConfiguration(configuration);
  if (settings.backgroundWork && !dependencies.startBackground)
    throw new TypeError("Enabled demo background work requires an explicit starter");
  const app = buildApp({
    bodyLimit: 16_384,
    requestTimeout: 15_000,
    trustProxy: false,
    logger: false,
  });
  let stopBackground: (() => Promise<void>) | undefined;
  app.addHook("onClose", async () => {
    await stopBackground?.();
  });
  app.addHook("onReady", async () => {
    if (settings.backgroundWork) stopBackground = await dependencies.startBackground!();
  });
  app.get("/api/example", async () => {
    const sampledAt = dependencies.clock().toISOString();
    const [transportAvailable, entries] = await Promise.all([
      dependencies.transport(),
      dependencies.readLocal(settings.sampleLimit),
    ]);
    return {
      sampledAt,
      transportAvailable,
      localEntries: Math.min(entries.length, settings.sampleLimit),
    };
  });
  try {
    await app.ready();
    return app;
  } catch (error) {
    try {
      await app.close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Demo application startup failed");
    }
    throw error;
  }
}

/** Synthetic defaults perform no network or file access and start no background work. */
export function syntheticDependencies(): AppDependencies {
  return {
    clock: () => new Date(),
    transport: async () => true,
    readLocal: async (limit) => Array.from({ length: Math.min(limit, 2) }, () => null),
  };
}
