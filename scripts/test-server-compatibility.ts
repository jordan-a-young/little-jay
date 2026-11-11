import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const workspace = fileURLToPath(new URL("../", import.meta.url));
export const fastifyVersions = ["5.12.7", "5.12.8"] as const;
export const consumerFixtureNames = ["consumer.ts", "logging.ts"] as const;

export function runtimeTargets(environment: NodeJS.ProcessEnv, currentExecutable: string) {
  assert.ok(
    environment.LITTLEJAY_NODE24,
    "Set LITTLEJAY_NODE24 to the installed Node 24.18.0 executable",
  );
  assert.ok(
    path.isAbsolute(environment.LITTLEJAY_NODE24),
    "LITTLEJAY_NODE24 must be an absolute path",
  );
  return [
    { version: "24.18.0", executable: environment.LITTLEJAY_NODE24, nodeTypes: "24.19.2" },
    { version: "26.13.0", executable: currentExecutable, nodeTypes: "26.6.6" },
  ];
}

export function consumerManifest(tarball: string, fastifyVersion: string, nodeTypes: string) {
  assert.ok(
    fastifyVersions.some((version) => version === fastifyVersion),
    "Unsupported Fastify test version",
  );
  assert.ok(["24.19.2", "26.6.6"].includes(nodeTypes), "Unsupported Node typings test version");
  return {
    name: "little-jay-server-compatibility-consumer",
    private: true,
    type: "module",
    dependencies: { "@littlejay/server": `file:${tarball}`, fastify: fastifyVersion },
    devDependencies: { "@types/node": nodeTypes, typescript: "7.0.2" },
  };
}

export function consumerCompilerOptions() {
  return {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      skipLibCheck: false,
      types: ["node"],
      outDir: "dist",
    },
    include: ["consumer.ts"],
  };
}

async function run(command: string, arguments_: string[], directory: string) {
  const result = await execFileAsync(command, arguments_, {
    cwd: directory,
    timeout: 180_000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, NODE_PATH: "" },
  });
  return result.stdout.trim();
}

/** Checks exact runtime identity before any installation or fixture execution. */
export function assertRuntimeVersion(actual: string, expected: string) {
  assert.equal(
    actual.trim(),
    `v${expected}`,
    "Compatibility checks require the exact target runtime",
  );
}

export async function main() {
  assertRuntimeVersion(process.version, "26.13.0");
  const targets = runtimeTargets(process.env, process.execPath);
  const pnpm = process.env.npm_execpath;
  assert.ok(pnpm, "Run with pnpm test:server-compat");
  for (const target of targets) {
    assertRuntimeVersion(await run(target.executable, ["--version"], workspace), target.version);
  }
  const root = await mkdtemp(
    path.join(process.env.TMPDIR ?? tmpdir(), "little-jay-server-compat-"),
  );
  console.log(`Server compatibility evidence: ${root}`);
  const artifacts = path.join(root, "artifacts");
  await mkdir(artifacts);
  await run(
    pnpm,
    ["pack", "--pack-destination", artifacts],
    path.join(workspace, "packages/server"),
  );
  const tarballs = (await readdir(artifacts)).filter((filename) => filename.endsWith(".tgz"));
  assert.equal(tarballs.length, 1);
  const tarball = path.join(artifacts, tarballs[0]!);
  const integrity = `sha512-${createHash("sha512")
    .update(await readFile(tarball))
    .digest("base64")}`;
  const results: object[] = [];
  for (const target of targets) {
    for (const fastifyVersion of fastifyVersions) {
      const directory = path.join(root, `node-${target.version}-fastify-${fastifyVersion}`);
      await mkdir(directory);
      await writeFile(
        path.join(directory, "package.json"),
        JSON.stringify(consumerManifest(tarball, fastifyVersion, target.nodeTypes)),
      );
      await writeFile(
        path.join(directory, "pnpm-workspace.yaml"),
        "autoInstallPeers: false\nstrictPeerDependencies: true\nallowBuilds: {}\n",
      );
      await writeFile(
        path.join(directory, "tsconfig.json"),
        JSON.stringify(consumerCompilerOptions()),
      );
      for (const filename of consumerFixtureNames) {
        await copyFile(
          new URL(`./fixtures/server-compatibility/${filename}`, import.meta.url),
          path.join(directory, filename),
        );
      }
      await run(pnpm, ["install", "--ignore-scripts"], directory);
      await run(pnpm, ["exec", "tsc", "-p", "tsconfig.json"], directory);
      const output = await run(
        target.executable,
        ["dist/consumer.js", fastifyVersion, target.nodeTypes, target.version],
        directory,
      );
      const evidence = JSON.parse(output) as {
        passed: boolean;
        node: string;
        fastify: string;
        nodeTypes: string;
        listenerClosed: boolean;
        logging: { disabled: number; configured: number; injected: number };
      };
      assert.equal(evidence.passed, true);
      assert.equal(evidence.node, target.version);
      assert.equal(evidence.fastify, fastifyVersion);
      assert.equal(evidence.nodeTypes, target.nodeTypes);
      assert.equal(evidence.listenerClosed, true);
      assert.equal(evidence.logging.disabled, 0);
      assert.ok(evidence.logging.configured > 0);
      assert.ok(evidence.logging.injected > 0);
      results.push({ directory, ...evidence });
      await writeFile(
        path.join(root, "results.json"),
        JSON.stringify({ tarball, integrity, results }, null, 2),
      );
      console.log(
        `Passed Node ${target.version} / Fastify ${fastifyVersion} / @types/node ${target.nodeTypes}`,
      );
    }
  }
  assert.equal(results.length, 4);
  console.log(`All four packed server compatibility checks passed: ${root}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
