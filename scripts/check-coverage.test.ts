import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";

let fixtureDirectory: string;

beforeEach(async () => {
  fixtureDirectory = await mkdtemp(path.join(tmpdir(), "little-jay-coverage-"));
  for (const directory of ["scripts", "coverage", "apps/example/src", "packages/example/src"]) {
    await mkdir(path.join(fixtureDirectory, directory), { recursive: true });
  }
  await copyFile(
    new URL("./check-coverage.mjs", import.meta.url),
    path.join(fixtureDirectory, "scripts/check-coverage.mjs"),
  );
  await writeFile(
    path.join(fixtureDirectory, "apps/example/src/main.ts"),
    "export const value = 1;",
  );
  await writeFile(
    path.join(fixtureDirectory, "packages/example/src/index.js"),
    "export const x = 1;",
  );
});

afterEach(async () => {
  await rm(fixtureDirectory, { recursive: true, force: true });
});

async function checkReport(filenames: string[]) {
  const report = Object.fromEntries(
    filenames.map((filename) => [path.join(fixtureDirectory, filename), {}]),
  );
  await writeFile(
    path.join(fixtureDirectory, "coverage/coverage-final.json"),
    JSON.stringify(report),
  );
  return spawnSync(process.execPath, [path.join(fixtureDirectory, "scripts/check-coverage.mjs")], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
}

it("accepts the full source inventory while excluding tests and declarations", async () => {
  await writeFile(path.join(fixtureDirectory, "apps/example/src/main.test.ts"), "");
  await writeFile(path.join(fixtureDirectory, "apps/example/src/main.spec.tsx"), "");
  await writeFile(path.join(fixtureDirectory, "apps/example/src/global.d.ts"), "");
  const result = await checkReport(["apps/example/src/main.ts", "packages/example/src/index.js"]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Coverage inventory verified: 2 source files");
});

it("rejects an omitted source file even when it was never imported", async () => {
  const result = await checkReport(["apps/example/src/main.ts"]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Coverage must contain every authored source file");
});

it("rejects generated output that would duplicate authored-source coverage", async () => {
  const result = await checkReport([
    "apps/example/src/main.ts",
    "packages/example/src/index.js",
    "packages/example/dist/index.js",
  ]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Coverage must contain every authored source file");
});
