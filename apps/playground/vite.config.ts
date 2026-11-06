import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { branding } from "./branding.js";
import { fileURLToPath } from "node:url";
export default defineConfig(({ command }) => ({
  plugins: [branding(), react(), tailwindcss()],
  resolve: {
    alias:
      command === "serve"
        ? [
            {
              find: "@littlejay/ui/styles.css",
              replacement: fileURLToPath(
                new URL("../../packages/ui/src/styles.css", import.meta.url),
              ),
            },
          ]
        : [],
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://127.0.0.1:5050" },
  },
}));
