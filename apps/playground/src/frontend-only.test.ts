import { readFile } from "node:fs/promises";
import { expect, it } from "vite-plus/test";
import configuration from "../vite.config.js";

it("starts the catalog independently and exposes a separate server demo command", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
  );
  expect(manifest.scripts.dev).toContain("@littlejay/playground dev");
  expect(manifest.scripts.dev).toContain('pnpm --filter "@littlejay/ui..." build');
  expect(manifest.scripts.dev).not.toMatch(/@littlejay\/(api|server|http)/);
  expect(manifest.scripts["dev:server"]).toContain("@littlejay/api dev:demo");
});

it("has no API proxy or unused runtime data-query dependencies", async () => {
  if (typeof configuration !== "function") throw new Error("Expected command-aware configuration");
  const development = await configuration({ command: "serve", mode: "development" });
  expect(development.server?.proxy).toBeUndefined();
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  expect(manifest.dependencies["@littlejay/http"]).toBeUndefined();
  expect(manifest.dependencies["@tanstack/react-query"]).toBeUndefined();
});
