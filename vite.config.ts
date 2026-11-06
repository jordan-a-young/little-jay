import { defineConfig } from "vite-plus";
export default defineConfig({
  fmt: {},
  lint: {},
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.{ts,tsx}"],
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
