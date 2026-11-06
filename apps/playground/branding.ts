import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite-plus";
import { themeSettings } from "./src/theme-settings.js";
import stateIllustrations from "@littlejay/brand/states/manifest.json" with { type: "json" };

const brandRoot = path.dirname(
  fileURLToPath(import.meta.resolve("@littlejay/brand/site.webmanifest")),
);
const themeSource = fileURLToPath(new URL("./src/theme-store.js", import.meta.url));
const publicFiles = [
  "icons/favicon.svg",
  "icons/favicon.ico",
  "icons/apple-touch-icon.png",
  "icons/icon-32.png",
  "icons/app-192.png",
  "icons/app-512.png",
  "site.webmanifest",
  "FONT-NOTICES.txt",
  "states/manifest.json",
  ...Object.values(stateIllustrations).map((illustration) => `states/${illustration.file}`),
];

export function branding(): Plugin {
  let config: ResolvedConfig;
  let bootstrap = "";
  let pending = Promise.resolve();

  async function synchronize() {
    if (!config.publicDir) throw new Error("Little Jay browser assets require a public directory");
    for (const file of publicFiles) {
      const target = path.join(config.publicDir, "branding", file);
      await mkdir(path.dirname(target), { recursive: true });
      try {
        await copyFile(path.join(brandRoot, file), target);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT")
          await rm(target, { force: true });
        throw error;
      }
    }
  }

  return {
    name: "little-jay-branding",
    async configResolved(resolvedConfig) {
      config = resolvedConfig;
      await synchronize();
      const source = await readFile(themeSource, "utf8");
      const settings = JSON.stringify(themeSettings).replaceAll("<", "\\u003c");
      bootstrap = `${source.replace(/^export /gm, "")}\nwindow.__littleJayTheme = createThemeStore(${settings}, window);`;
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return {
          html: html.replace("%LJ_THEME_COLOR%", themeSettings.colors.light),
          tags: [
            {
              tag: "script",
              attrs: { "data-ljay-theme": "" },
              children: bootstrap,
              injectTo: "head",
            },
          ],
        };
      },
    },
    configureServer(server) {
      const reportError = (error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Brand asset synchronization failed";
        config.logger.error(message);
        server.ws.send({
          type: "error",
          err: { message, stack: "", plugin: "little-jay-branding" },
        });
      };
      const sources = new Set(publicFiles.map((file) => path.join(brandRoot, file)));
      server.watcher.add([brandRoot, themeSource]);
      const restartServer = async () => {
        try {
          await server.restart();
        } catch (error) {
          reportError(error);
        }
      };
      const changed = (file: string) => {
        if (file === themeSource) {
          void restartServer();
          return;
        }
        if (!sources.has(file)) return;
        pending = pending.catch(() => {}).then(synchronize);
        void pending.then(() => server.ws.send({ type: "full-reload" })).catch(reportError);
      };
      server.watcher.on("add", changed).on("change", changed).on("unlink", changed);
      server.httpServer?.once("close", () => {
        server.watcher.off("add", changed).off("change", changed).off("unlink", changed);
      });
    },
  };
}
