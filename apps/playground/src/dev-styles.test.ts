import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vite-plus/test";
import configuration from "../vite.config.js";

describe("playground UI styles", () => {
  it("uses live workspace CSS in development and packaged CSS for production", async () => {
    if (typeof configuration !== "function")
      throw new Error("Expected command-aware configuration");
    const development = await configuration({ command: "serve", mode: "development" });
    expect(development.resolve?.alias).toEqual([
      {
        find: "@ljay/ui/styles.css",
        replacement: fileURLToPath(new URL("../../../packages/ui/src/styles.css", import.meta.url)),
      },
    ]);
    const production = await configuration({ command: "build", mode: "production" });
    expect(production.resolve?.alias).toEqual([]);
  });
});
