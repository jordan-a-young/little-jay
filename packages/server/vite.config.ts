import { defineConfig } from "vite-plus";
export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    format: ["esm"],
    sourcemap: true,
    dts: true,
    clean: true,
    outExtensions: () => ({ js: ".js" }),
  },
});
