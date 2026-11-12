import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";

const validator = fileURLToPath(new URL("../.tools/actionlint", import.meta.url));
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(process.env.TMPDIR ?? tmpdir(), "little-jay-workflows-"));
  for (const relative of ["scripts", ".tools", "bin", ".github/workflows"]) {
    await mkdir(path.join(directory, relative), { recursive: true });
  }
  await writeFile(path.join(directory, "package.json"), '{"type":"module"}');
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function run(command: string, arguments_: string[], environment: NodeJS.ProcessEnv = {}) {
  return spawnSync(command, arguments_, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, ...environment },
  });
}

async function commandFixture(relative: string, contents: string) {
  const filename = path.join(directory, relative);
  await writeFile(filename, `#!/bin/sh\nset -eu\n${contents}\n`, { mode: 0o755 });
  return filename;
}

it.each(["ci.yml", "secrets.yml"])(
  "%s checks pull requests and main pushes without duplicate feature-push runs",
  async (filename) => {
    const workflow = await readFile(
      new URL(`../.github/workflows/${filename}`, import.meta.url),
      "utf8",
    );
    expect(workflow).toMatch(/^on:\n  push:\n    branches: \[main\]\n  pull_request:\n/m);
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain(filename === "ci.yml" ? "  verify:" : "  scan:");
    if (filename === "secrets.yml") expect(workflow).toContain("  workflow_dispatch:");
  },
);

it.each(["ci.yml", "release-pr.yml", "publish.yml"])(
  "%s installs the validator before its repository verification gate",
  async (filename) => {
    const workflow = await readFile(
      new URL(`../.github/workflows/${filename}`, import.meta.url),
      "utf8",
    );
    const installation = workflow.indexOf("run: pnpm workflows:install");
    const verification = workflow.indexOf(
      filename === "ci.yml" ? "run: pnpm ready" : "run: pnpm release:check",
    );
    expect(installation).toBeGreaterThan(0);
    expect(verification).toBeGreaterThan(installation);
    expect(workflow.match(/run: pnpm workflows:install/g)).toHaveLength(1);
  },
);

async function runner() {
  const filename = path.join(directory, "scripts/check-workflows.ts");
  await copyFile(new URL("./check-workflows.ts", import.meta.url), filename);
  return filename;
}

it("runs the local validator from the workspace with deterministic optional integrations", async () => {
  await commandFixture(".tools/actionlint", 'printf "%s\\n" "$PWD" "$@"');
  const result = run(process.execPath, [await runner()]);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim().split("\n")).toEqual([directory, "-shellcheck=", "-pyflakes="]);
});

it("fails closed with installation guidance when the validator is missing", async () => {
  const result = run(process.execPath, [await runner()]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("pnpm workflows:install");
});

it("propagates validator failure without treating it as a skipped check", async () => {
  await commandFixture(".tools/actionlint", "exit 17");
  const result = run(process.execPath, [await runner()]);
  expect(result.status).toBe(17);
});

it("fails closed when the validator terminates by signal", async () => {
  await commandFixture(".tools/actionlint", "kill -TERM $$");
  const result = run(process.execPath, [await runner()]);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("refusing to proceed");
});

const validWorkflow =
  "on: pull_request\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo verified\n";

it("accepts a valid workflow using the real pinned semantic validator", async () => {
  const filename = path.join(directory, ".github/workflows/example.yml");
  await writeFile(filename, validWorkflow);
  const result = run(validator, ["-shellcheck=", "-pyflakes=", filename]);
  expect(result.error).toBeUndefined();
  expect(result.status, result.stdout + result.stderr).toBe(0);
});

it.each([
  ["invalid YAML", "on: [push\n", "could not parse"],
  [
    "wrong event key",
    validWorkflow.replace("on: pull_request", "on:\n  push:\n    branch: [main]"),
    "unexpected key",
  ],
  [
    "missing dependency",
    validWorkflow.replace("    runs-on:", "    needs: absent\n    runs-on:"),
    "absent",
  ],
  [
    "unknown expression step",
    validWorkflow.replace("echo verified", "echo '${{ steps.absent.outputs.value }}'"),
    "absent",
  ],
])(
  "rejects %s rather than merely matching workflow strings",
  async (_name, workflow, diagnostic) => {
    const filename = path.join(directory, ".github/workflows/example.yml");
    await writeFile(filename, workflow!);
    const result = run(validator, ["-shellcheck=", "-pyflakes=", filename]);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain(diagnostic);
  },
);

async function installerFixture(validChecksum: boolean, withBinary = true) {
  const payload = path.join(directory, "payload");
  await mkdir(payload);
  await writeFile(
    path.join(payload, withBinary ? "actionlint" : "unexpected"),
    '#!/bin/sh\nprintf executed > "$ACTIONLINT_EXECUTION_MARKER"\nprintf "1.7.12\\n"\n',
    { mode: 0o755 },
  );
  const archive = path.join(directory, "fixture.tar.gz");
  const packed = run("tar", [
    "-czf",
    archive,
    "-C",
    payload,
    withBinary ? "actionlint" : "unexpected",
  ]);
  expect(packed.status, packed.stderr).toBe(0);
  let source = await readFile(new URL("./install-actionlint.sh", import.meta.url), "utf8");
  if (validChecksum) {
    const checksum = createHash("sha256")
      .update(await readFile(archive))
      .digest("hex");
    source = source.replace(/checksum=[a-f0-9]{64}/g, `checksum=${checksum}`);
  }
  const installer = path.join(directory, "scripts/install-actionlint.sh");
  await writeFile(installer, source);
  await commandFixture(
    "bin/curl",
    'while [ "$#" -gt 0 ]; do\n  if [ "$1" = --output ]; then cp "$ACTIONLINT_FIXTURE_ARCHIVE" "$2"; exit 0; fi\n  shift\ndone\nexit 1',
  );
  return {
    installer,
    environment: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`,
      ACTIONLINT_FIXTURE_ARCHIVE: archive,
      ACTIONLINT_EXECUTION_MARKER: path.join(directory, "executed"),
    },
  };
}

it("installs only a checksum-verified archive and removes its own temporary files", async () => {
  const fixture = await installerFixture(true);
  const result = run("sh", [fixture.installer], fixture.environment);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("1.7.12");
  expect(await readFile(path.join(directory, "executed"), "utf8")).toBe("executed");
  expect((await stat(path.join(directory, ".tools/actionlint"))).mode & 0o111).not.toBe(0);
  expect(await readdir(path.join(directory, ".tools"))).toEqual(["actionlint"]);
});

it("rejects a checksum mismatch before extraction/execution and preserves an existing tool", async () => {
  const fixture = await installerFixture(false);
  await writeFile(path.join(directory, ".tools/actionlint"), "existing tool");
  const result = run("sh", [fixture.installer], fixture.environment);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("checksum verification failed");
  expect(await readFile(path.join(directory, ".tools/actionlint"), "utf8")).toBe("existing tool");
  await expect(stat(path.join(directory, "executed"))).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readdir(path.join(directory, ".tools"))).toEqual(["actionlint"]);
});

it("fails closed when the verified archive lacks the expected binary", async () => {
  const fixture = await installerFixture(true, false);
  const result = run("sh", [fixture.installer], fixture.environment);
  expect(result.status).not.toBe(0);
  expect(await readdir(path.join(directory, ".tools"))).toEqual([]);
  await expect(stat(path.join(directory, "executed"))).rejects.toMatchObject({ code: "ENOENT" });
});

it("fails closed on download failure without leaving partial installation state", async () => {
  const fixture = await installerFixture(true);
  await commandFixture("bin/curl", "exit 22");
  const result = run("sh", [fixture.installer], fixture.environment);
  expect(result.status).not.toBe(0);
  expect(await readdir(path.join(directory, ".tools"))).toEqual([]);
});

it("rejects unsupported platforms before downloading or installing", async () => {
  const fixture = await installerFixture(true);
  await commandFixture("bin/uname", "printf Unsupported");
  const result = run("sh", [fixture.installer], fixture.environment);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("Unsupported platform");
  expect(await readdir(path.join(directory, ".tools"))).toEqual([]);
});
