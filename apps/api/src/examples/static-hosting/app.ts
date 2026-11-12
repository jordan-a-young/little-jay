import { buildApp } from "../../app.js";
import { parseStaticHostingConfiguration, parseStaticResponsePolicy } from "./configuration.js";
import { registerStaticHosting } from "./hosting.js";

/** Returns a ready non-listening synthetic application; the caller owns its listener and close. */
export async function createStaticHostingApp(hosting: unknown = {}, responsePolicy: unknown = {}) {
  const configuration = parseStaticHostingConfiguration(hosting);
  const policy = parseStaticResponsePolicy(responsePolicy);
  const app = buildApp({
    logger: false,
    requestIdHeader: false,
    bodyLimit: 16_384,
    requestTimeout: 15_000,
    trustProxy: false,
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("content-security-policy", policy.contentSecurityPolicy);
    reply.header("cache-control", policy.cacheControl);
    reply.header("x-content-type-options", "nosniff");
    return payload;
  });
  registerStaticHosting(app, configuration);
  try {
    await app.ready();
    return app;
  } catch {
    try {
      await app.close();
    } catch {
      throw new Error("Unable to initialize or close static hosting application");
    }
    throw new Error("Unable to initialize static hosting application");
  }
}
