import { expect, it } from "vite-plus/test";
import { parseOperationalConfiguration } from "./configuration.js";

it("defaults to disabled work and bounded positive intervals", () => {
  expect(parseOperationalConfiguration({})).toEqual({
    backgroundWork: false,
    workIntervalMs: 100,
    readinessTimeoutMs: 100,
  });
  expect(
    parseOperationalConfiguration({
      backgroundWork: true,
      workIntervalMs: 60_000,
      readinessTimeoutMs: 5_000,
    }),
  ).toEqual({ backgroundWork: true, workIntervalMs: 60_000, readinessTimeoutMs: 5_000 });
});

it.each([
  undefined,
  null,
  { backgroundWork: "true" },
  { workIntervalMs: 0 },
  { workIntervalMs: 9 },
  { workIntervalMs: 60_001 },
  { workIntervalMs: 1.5 },
  { readinessTimeoutMs: 0 },
  { readinessTimeoutMs: 5_001 },
  { readinessTimeoutMs: Number.NaN },
  { unexpected: "synthetic-private-configuration" },
])("rejects invalid settings with fixed diagnostics", (input) => {
  expect(() => parseOperationalConfiguration(input)).toThrow(
    new TypeError("Invalid operational example configuration"),
  );
});
