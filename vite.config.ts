import { defineConfig } from "vite-plus";
export default defineConfig({
  fmt: {},
  lint: {},
  test: {
    coverage: {
      provider: "v8",
      include: [
        "apps/*/src/**/*.{ts,tsx,js,jsx}",
        "packages/*/src/**/*.{ts,tsx,js,jsx}",
        "packages/*/dist/**/*.js",
      ],
      exclude: ["**/*.{test,spec}.{ts,tsx,js,jsx}", "**/*.d.ts", "packages/ui/dist/index.js"],
      reporter: ["text", "html", "json", "json-summary", "lcovonly"],
      reportsDirectory: "coverage",
      clean: true,
      excludeAfterRemap: true,
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: [
            "apps/*/src/**/*.test.ts",
            "packages/*/src/**/*.test.{ts,tsx}",
            "scripts/check-coverage.test.ts",
          ],
          exclude: ["**/*.component.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: [
            "packages/ui/src/**/*.component.test.tsx",
            "apps/playground/src/**/*.component.test.tsx",
          ],
        },
      },
    ],
  },
});
