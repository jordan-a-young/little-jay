import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readChangesets } from "@changesets/read";
import { tarballFilename } from "./package-artifacts.mjs";

export const releasePackages = ["brand", "tokens", "http", "server", "ui"];
export const registry = "https://registry.npmjs.org/";
const repository = "https://github.com/jordan-a-young/little-jay.git";
const workspace = fileURLToPath(new URL("../", import.meta.url));

export function createRelease({ root = workspace, env = process.env, execute, lookup } = {}) {
  root = path.resolve(root);
  const output = path.join(root, ".release");
  const run =
    execute ??
    ((command, arguments_, capture = false, commandEnvironment = {}) => {
      const result = execFileSync(command, arguments_, {
        cwd: root,
        env: { ...env, ...commandEnvironment },
        encoding: "utf8",
        stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
      });
      return result?.trim() ?? "";
    });
  const pnpm = (arguments_, capture = false) => {
    assert.ok(env.npm_execpath, "Run release commands through pnpm scripts.");
    return /\.(?:cjs|mjs|js)$/i.test(env.npm_execpath)
      ? run(process.execPath, [env.npm_execpath, ...arguments_], capture)
      : run(env.npm_execpath, arguments_, capture);
  };
  const git = (arguments_, commandEnvironment) => run("git", arguments_, true, commandEnvironment);
  const readJson = async (filename) =>
    JSON.parse(await readFile(path.join(root, filename), "utf8"));
  const digest = async (filename) =>
    createHash("sha512")
      .update(await readFile(filename))
      .digest("hex");

  async function manifests() {
    const rootManifest = await readJson("package.json");
    assert.equal(rootManifest.private, true, "The workspace root must remain private.");
    for (const entry of await readdir(path.join(root, "apps"), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      assert.equal(
        (await readJson(`apps/${entry.name}/package.json`)).private,
        true,
        "Apps must remain private.",
      );
    }
    const packages = [];
    for (const directory of releasePackages) {
      const manifest = await readJson(`packages/${directory}/package.json`);
      assert.equal(manifest.name, `@littlejay/${directory}`);
      assert.equal(manifest.private, false, `${manifest.name} is not publish-enabled.`);
      assert.match(
        manifest.version,
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
        "Only stable versions are supported by this release path.",
      );
      assert.notEqual(manifest.version, "0.0.0", "Prepare an initial version first.");
      assert.equal(manifest.publishConfig?.access, "public");
      assert.equal(manifest.publishConfig?.registry, registry);
      assert.equal(manifest.repository?.url, repository);
      const changelog = await readFile(
        path.join(root, `packages/${directory}/CHANGELOG.md`),
        "utf8",
      );
      assert.ok(
        changelog.includes(`## ${manifest.version}\n`),
        `Missing changelog for ${manifest.name}@${manifest.version}.`,
      );
      for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
        if (name.startsWith("@littlejay/")) {
          assert.ok(
            releasePackages.includes(name.slice("@littlejay/".length)),
            `Unpublishable dependency: ${name}`,
          );
          assert.equal(range, "workspace:*");
        }
      }
      packages.push({ name: manifest.name, version: manifest.version, directory });
    }
    return packages;
  }

  async function pending() {
    return (await readdir(path.join(root, ".changeset"))).filter(
      (filename) => filename.endsWith(".md") && !["README.md", "AGENTS.md"].includes(filename),
    );
  }

  async function validateChangesets() {
    const changesets = await readChangesets(root);
    const allowedPackages = new Set(releasePackages.map((name) => `@littlejay/${name}`));
    const allowedTypes = new Set(["patch", "minor", "major"]);
    for (const changeset of changesets) {
      for (const release of changeset.releases) {
        assert.ok(
          allowedPackages.has(release.name),
          `Unexpected changeset package in ${changeset.id}: ${release.name}`,
        );
        assert.ok(
          allowedTypes.has(release.type),
          `Unexpected changeset bump in ${changeset.id}: ${release.type}`,
        );
      }
    }
    return changesets;
  }

  async function version() {
    assert.ok((await pending()).length, "No pending changesets to version.");
    pnpm(["exec", "changeset", "version"]);
    pnpm(["install", "--lockfile-only", "--ignore-scripts"]);
    pnpm([
      "exec",
      "vp",
      "fmt",
      ...releasePackages.flatMap((name) => [
        `packages/${name}/package.json`,
        `packages/${name}/CHANGELOG.md`,
      ]),
    ]);
    console.log(
      "Review the generated versions, changelogs and lockfile. Nothing was committed or published.",
    );
  }

  async function status() {
    if ((await pending()).length) {
      pnpm(["exec", "changeset", "status"]);
    } else {
      const packages = await manifests();
      console.log(
        "No pending changesets. Current versions (review unpublished code changes separately):",
      );
      for (const entry of packages) console.log(`${entry.name}@${entry.version}`);
    }
  }

  async function check() {
    const packages = await manifests();
    assert.equal(
      (await pending()).length,
      0,
      "Version pending changesets before checking a release.",
    );
    pnpm(["ready"]);
    pnpm(["secrets:scan"]);
    const commit =
      git(["status", "--porcelain", "--untracked-files=all"]) === ""
        ? git(["rev-parse", "HEAD"])
        : null;
    await mkdir(output, { recursive: true });
    const packed = [];
    for (const entry of packages) {
      pnpm(["--filter", entry.name, "pack", "--pack-destination", output]);
      const filename = tarballFilename(entry.name, entry.version);
      packed.push({ ...entry, filename, sha512: await digest(path.join(output, filename)) });
    }
    const plan = { commit, registry, packages: packed };
    await writeFile(path.join(output, "verified.json"), `${JSON.stringify(plan, null, 2)}\n`);
    console.log(
      `Release artifacts verified. ${commit ? `Commit: ${commit}` : "Dirty checkout: artifacts cannot be published."}`,
    );
    return plan;
  }

  async function publicationPreflight(confirmation) {
    assert.equal(
      env.LITTLEJAY_PUBLISH_ENABLED,
      "true",
      "Publication is disabled. Activation requires explicit owner approval.",
    );
    assert.match(
      confirmation ?? "",
      /^[a-f0-9]{40}$/,
      "Pass --confirm with the exact release commit SHA.",
    );
    assert.equal(
      git(["rev-parse", "--show-toplevel"]),
      root,
      "Run from the assigned Git checkout.",
    );
    assert.equal(git(["branch", "--show-current"]), "main", "Publish only from main.");
    assert.equal(
      git(["status", "--porcelain", "--untracked-files=all"]),
      "",
      "Publish only a clean checkout.",
    );
    assert.equal(
      git(["rev-parse", "HEAD"]),
      confirmation,
      "Release commit does not match confirmation.",
    );
    const origin = git(["remote", "get-url", "origin"]);
    assert.ok([repository, repository.slice(0, -4)].includes(origin), "Unexpected origin.");
    let authentication;
    if (env.GITHUB_ACTIONS === "true") {
      assert.ok(env.GITHUB_TOKEN, "The private-origin check requires the workflow GitHub token.");
      authentication = {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString("base64")}`,
        GIT_TERMINAL_PROMPT: "0",
      };
    }
    const remote = git(["ls-remote", "--heads", "origin", "refs/heads/main"], authentication);
    assert.equal(
      remote,
      `${confirmation}\trefs/heads/main`,
      "Release commit must be current origin/main.",
    );
    assert.equal((await pending()).length, 0, "Version pending changesets before publishing.");
    return manifests();
  }

  const alreadyPublished =
    lookup ??
    (async (entry) => {
      const response = await fetch(
        `${registry}${encodeURIComponent(entry.name)}/${entry.version}`,
        { signal: AbortSignal.timeout(15_000) },
      );
      if (response.status === 404) return false;
      assert.equal(response.status, 200, `Unable to confirm registry status for ${entry.name}.`);
      const manifest = await response.json();
      assert.equal(manifest.name, entry.name);
      assert.equal(manifest.version, entry.version);
      const integrity = `sha512-${Buffer.from(entry.sha512, "hex").toString("base64")}`;
      assert.equal(
        manifest.dist?.integrity,
        integrity,
        `Existing npm artifact differs: ${entry.name}@${entry.version}. Never overwrite it.`,
      );
      return true;
    });

  async function publish({ confirmation, verifiedArtifacts = false } = {}) {
    const packages = await publicationPreflight(confirmation);
    if (verifiedArtifacts) {
      assert.equal(
        env.GITHUB_ACTIONS,
        "true",
        "Preverified artifacts are only accepted from the publishing workflow.",
      );
      assert.equal(
        env.GITHUB_WORKFLOW_REF,
        `jordan-a-young/little-jay/.github/workflows/publish.yml@refs/heads/main`,
      );
      assert.equal(env.GITHUB_SHA, confirmation);
    } else {
      await check();
    }
    const plan = await readJson(".release/verified.json");
    assert.equal(plan.commit, confirmation, "Artifacts were not verified from the release commit.");
    assert.equal(plan.registry, registry);
    assert.equal(plan.packages.length, packages.length);
    for (const [index, entry] of packages.entries()) {
      const artifact = plan.packages[index];
      const filename = tarballFilename(entry.name, entry.version);
      assert.equal(artifact.name, entry.name);
      assert.equal(artifact.version, entry.version);
      assert.equal(artifact.filename, filename);
      assert.equal(
        await digest(path.join(output, filename)),
        artifact.sha512,
        `Artifact changed: ${entry.name}`,
      );
    }
    await publicationPreflight(confirmation);
    const summary = { commit: confirmation, confirmedPackages: [] };
    await writeFile(
      path.join(output, "publish-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    let attemptedPackage;
    try {
      for (const entry of plan.packages) {
        attemptedPackage = `${entry.name}@${entry.version}`;
        const exists = await alreadyPublished(entry);
        if (!exists) {
          pnpm([
            "publish",
            path.join(output, entry.filename),
            "--registry",
            registry,
            "--access",
            "public",
            "--tag",
            "latest",
            "--publish-branch",
            "main",
            "--publish-wait-timeout",
            "600000",
          ]);
        }
        summary.confirmedPackages.push({
          name: entry.name,
          version: entry.version,
          existing: exists,
        });
        await writeFile(
          path.join(output, "publish-summary.json"),
          `${JSON.stringify(summary, null, 2)}\n`,
        );
      }
    } catch (error) {
      await writeFile(
        path.join(output, "publish-summary.json"),
        `${JSON.stringify({ ...summary, unconfirmedPackage: attemptedPackage }, null, 2)}\n`,
      );
      console.error(
        "Publication stopped. Inspect .release/publish-summary.json and npm before retrying this same commit; never force or overwrite a version.",
      );
      throw error;
    }
    pnpm(["exec", "changeset", "git-tag"]);
    console.log(
      "All package versions confirmed; local release tags created. No Git commits, tag pushes or GitHub releases were made by this script.",
    );
    return summary;
  }

  return { check, status, version, publish, manifests, validateChangesets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...arguments_] = process.argv.slice(2);
    const release = createRelease();
    if (command === "validate") {
      const changesets = await release.validateChangesets();
      console.log(`Validated ${changesets.length} pending changesets. No release files changed.`);
    } else if (command === "status") await release.status();
    else if (command === "check") await release.check();
    else if (command === "version") await release.version();
    else if (command === "publish") {
      const confirmationIndex = arguments_.indexOf("--confirm");
      assert.ok(confirmationIndex >= 0, "Pass --confirm with the exact release commit SHA.");
      assert.ok(
        arguments_.every(
          (argument, index) =>
            argument === "--confirm" ||
            argument === "--verified-artifacts" ||
            index === confirmationIndex + 1,
        ),
        "Unknown publishing argument.",
      );
      await release.publish({
        confirmation: arguments_[confirmationIndex + 1],
        verifiedArtifacts: arguments_.includes("--verified-artifacts"),
      });
    } else
      throw new Error(
        "Use release:validate, release:status, release:version, release:check or release:publish through pnpm.",
      );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Release command failed.");
    process.exitCode = 1;
  }
}
