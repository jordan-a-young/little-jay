import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vite-plus/test";
import {
  assertRuntimeVersion,
  consumerCompilerOptions,
  consumerFixtureNames,
  consumerManifest,
  fastifyVersions,
  runtimeTargets,
} from "./test-server-compatibility.ts";

it("leaves Fastify ownership to the consumer while retaining an exact development version", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../packages/server/package.json", import.meta.url), "utf8"),
  );
  expect(manifest.dependencies.fastify).toBeUndefined();
  expect(manifest.peerDependencies.fastify).toBe("~5.12.7");
  expect(manifest.devDependencies.fastify).toBe("5.12.8");
  expect(manifest.dependencies["fastify-plugin"]).toBe("6.0.1");
});

it("selects both exact runtimes and matching major-version typings without installing a runtime", () => {
  expect(runtimeTargets({ LITTLEJAY_NODE24: "/installed/node24" }, "/installed/node26")).toEqual([
    { version: "24.18.0", executable: "/installed/node24", nodeTypes: "24.19.2" },
    { version: "26.13.0", executable: "/installed/node26", nodeTypes: "26.6.6" },
  ]);
  expect(fastifyVersions).toEqual(["5.12.7", "5.12.8"]);
  expect(consumerFixtureNames).toEqual(["consumer.ts", "logging.ts"]);
});

it("rejects absent or relative target executables", () => {
  expect(() => runtimeTargets({}, process.execPath)).toThrow("Set LITTLEJAY_NODE24");
  expect(() => runtimeTargets({ LITTLEJAY_NODE24: "node" }, process.execPath)).toThrow(
    "absolute path",
  );
});

it("does not silently substitute a newer runtime", () => {
  expect(() => assertRuntimeVersion("v24.18.0\n", "24.18.0")).not.toThrow();
  expect(() => assertRuntimeVersion("v26.13.0", "24.18.0")).toThrow("exact target runtime");
});

it.each(["5.12.7", "5.12.8"])(
  "installs the packed artifact with consumer-selected Fastify %s",
  (version) => {
    expect(consumerManifest("/fixture/server.tgz", version, "24.19.2")).toEqual({
      name: "little-jay-server-compatibility-consumer",
      private: true,
      type: "module",
      dependencies: { "@littlejay/server": "file:/fixture/server.tgz", fastify: version },
      devDependencies: { "@types/node": "24.19.2", typescript: "7.0.2" },
    });
  },
);

it("rejects matrix drift and keeps strict installed declarations enabled", () => {
  expect(() => consumerManifest("/fixture/server.tgz", "5.13.0", "24.19.2")).toThrow(
    "Unsupported Fastify",
  );
  expect(() => consumerManifest("/fixture/server.tgz", "5.12.7", "22.0.0")).toThrow(
    "Unsupported Node typings",
  );
  const configuration = consumerCompilerOptions();
  expect(configuration.compilerOptions).toMatchObject({
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    skipLibCheck: false,
    types: ["node"],
    outDir: "dist",
  });
  expect(configuration.include).toEqual(["consumer.ts"]);
});

it("fails before packing or installation when the configured Node24 executable is actually Node26", () => {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./test-server-compatibility.ts", import.meta.url))],
    {
      encoding: "utf8",
      timeout: 10_000,
      env: { ...process.env, LITTLEJAY_NODE24: process.execPath },
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("exact target runtime");
  expect(result.stdout).not.toContain("Server compatibility evidence:");
});
