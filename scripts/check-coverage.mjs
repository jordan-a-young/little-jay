import assert from "node:assert/strict";
import { glob, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const report = JSON.parse(
  await readFile(new URL("../coverage/coverage-final.json", import.meta.url), "utf8"),
);
const expectedFiles = new Set();
for await (const filename of glob(
  ["apps/*/src/**/*.{ts,tsx,js,jsx}", "packages/*/src/**/*.{ts,tsx,js,jsx}"],
  { cwd: workspace },
)) {
  if (!/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename) && !filename.endsWith(".d.ts")) {
    expectedFiles.add(path.resolve(workspace, filename));
  }
}
assert.ok(expectedFiles.size > 0, "Coverage source inventory must not be empty");
const reportedFiles = new Set(Object.keys(report).map((filename) => path.resolve(filename)));
assert.deepEqual(
  [...reportedFiles].sort(),
  [...expectedFiles].sort(),
  "Coverage must contain every authored source file exactly once, with no tests or built output",
);
console.log(`Coverage inventory verified: ${expectedFiles.size} source files`);
