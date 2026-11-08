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

export function createRelease({
  root = workspace,
  env = process.env,
  execute,
  lookup,
  githubRequest,
} = {}) {
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
  const identifier = (value, label) => {
    assert.match(String(value ?? ""), /^[1-9]\d{0,14}$/, `Invalid ${label}.`);
    const result = Number(value);
    assert.ok(Number.isSafeInteger(result), `Invalid ${label}.`);
    return result;
  };
  const github =
    githubRequest ??
    (async (pathname, { method = "GET", body, allowMissing = false } = {}) => {
      assert.ok(env.GITHUB_TOKEN, "GitHub metadata access requires the workflow token.");
      const response = await fetch(
        `https://api.github.com/repos/jordan-a-young/little-jay/${pathname}`,
        {
          method,
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (allowMissing && response.status === 404) return null;
      if (!response.ok) {
        const error = new Error(`GitHub release metadata request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    });

  function workflowContext(filename, confirmation) {
    assert.equal(env.GITHUB_ACTIONS, "true", "This operation requires its GitHub workflow.");
    assert.equal(env.GITHUB_REPOSITORY, "jordan-a-young/little-jay");
    assert.equal(env.GITHUB_REF, "refs/heads/main");
    assert.equal(env.GITHUB_ACTOR, "jordan-a-young");
    assert.equal(env.GITHUB_TRIGGERING_ACTOR, "jordan-a-young");
    assert.equal(
      env.GITHUB_WORKFLOW_REF,
      `jordan-a-young/little-jay/.github/workflows/${filename}@refs/heads/main`,
    );
    assert.equal(env.GITHUB_SHA, confirmation);
  }

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

  function manifestAt(commit, directory) {
    assert.match(commit, /^[a-f0-9]{40}$/);
    assert.ok(releasePackages.includes(directory));
    const manifest = JSON.parse(git(["show", `${commit}:packages/${directory}/package.json`]));
    assert.equal(manifest.name, `@littlejay/${directory}`);
    assert.match(manifest.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
    return manifest;
  }

  function assertHistoricalTarget(entry, target, commit) {
    assert.match(target, /^[a-f0-9]{40}$/);
    git(["merge-base", "--is-ancestor", target, commit]);
    const historical = manifestAt(target, entry.directory);
    assert.equal(historical.name, entry.name);
    assert.equal(
      historical.version,
      entry.version,
      "Historical tag has a different package version.",
    );
  }

  function metadataCommit(entry, commit) {
    if (!commit) return null;
    const reference = `refs/tags/${entry.name}@${entry.version}`;
    const existing = git(["for-each-ref", "--format=%(refname)", reference]);
    if (!existing) return commit;
    assert.equal(existing, reference, "Unexpected local release tag reference.");
    const target = git(["rev-parse", "--verify", `${reference}^{commit}`]);
    assertHistoricalTarget(entry, target, commit);
    return target;
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
      packed.push({
        ...entry,
        filename,
        sha512: await digest(path.join(output, filename)),
        metadataCommit: metadataCommit(entry, commit),
      });
    }
    const plan = { commit, registry, packages: packed };
    await writeFile(path.join(output, "verified.json"), `${JSON.stringify(plan, null, 2)}\n`);
    await writeFile(
      path.join(output, "SHA512SUMS"),
      packed.map((entry) => `${entry.sha512}  ${entry.filename}\n`).join(""),
    );
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

  async function inspect({ confirmation } = {}) {
    assert.match(
      confirmation ?? "",
      /^[a-f0-9]{40}$/,
      "Pass --confirm with the exact release commit SHA.",
    );
    const packages = await manifests();
    const plan = await readJson(".release/verified.json");
    assert.equal(plan.commit, confirmation, "Artifacts were not verified from the release commit.");
    assert.equal(plan.registry, registry);
    assert.equal(plan.packages.length, packages.length);
    for (const [index, entry] of packages.entries()) {
      const artifact = plan.packages[index];
      const filename = tarballFilename(entry.name, entry.version);
      assert.equal(artifact.name, entry.name);
      assert.equal(artifact.version, entry.version);
      assert.equal(artifact.directory, entry.directory);
      assert.equal(artifact.filename, filename);
      assert.match(artifact.sha512, /^[a-f0-9]{128}$/);
      assert.match(
        artifact.metadataCommit,
        /^[a-f0-9]{40}$/,
        "Missing or invalid verified metadata target.",
      );
      assert.equal(
        await digest(path.join(output, filename)),
        artifact.sha512,
        `Artifact changed: ${entry.name}`,
      );
    }
    const tarballs = (await readdir(output)).filter((filename) => filename.endsWith(".tgz")).sort();
    assert.deepEqual(
      tarballs,
      plan.packages.map((entry) => entry.filename).sort(),
      "Unexpected release tarball set.",
    );
    const allowedFiles = new Set([
      "verified.json",
      "SHA512SUMS",
      "staging.json",
      "finalization.json",
      ...tarballs,
    ]);
    assert.ok(
      (await readdir(output)).every((filename) => allowedFiles.has(filename)),
      "Unexpected release artifact file.",
    );
    assert.equal(
      await readFile(path.join(output, "SHA512SUMS"), "utf8"),
      plan.packages.map((entry) => `${entry.sha512}  ${entry.filename}\n`).join(""),
      "Checksum manifest differs from the verified plan.",
    );
    return plan;
  }

  async function assertFreshStaging() {
    assert.equal(
      env.GITHUB_RUN_ATTEMPT,
      "1",
      "Do not rerun staging. Reconcile the original attempt first.",
    );
    const currentRun = identifier(env.GITHUB_RUN_ID, "current run ID");
    const runs = await github(
      "actions/workflows/publish.yml/runs?branch=main&event=workflow_dispatch&per_page=100",
    );
    assert.ok(
      runs.total_count <= 100,
      "Staging history exceeds the inspection bound; reconcile manually.",
    );
    const finalized = new Set();
    for (const run of runs.workflow_runs) {
      if (run.id === currentRun || finalized.has(run.head_sha)) continue;
      const jobs = await github(
        `actions/runs/${identifier(run.id, "prior run ID")}/attempts/1/jobs?per_page=100`,
      );
      assert.ok(jobs.total_count <= 100, "Staging job history exceeds the inspection bound.");
      if (
        !jobs.jobs.some(
          (job) => job.name === "stage" && job.started_at && job.conclusion !== "skipped",
        )
      )
        continue;
      for (const directory of releasePackages) {
        const manifest = manifestAt(run.head_sha, directory);
        const tag = `${manifest.name}@${manifest.version}`;
        const release = await github(`releases/tags/${encodeURIComponent(tag)}`, {
          allowMissing: true,
        });
        assert.ok(
          release &&
            release.tag_name === tag &&
            release.draft === false &&
            release.prerelease === false,
          "A prior staging attempt exists without complete finalization. Reconcile its stages and original artifacts; do not upload again or substitute a newer main SHA.",
        );
        const target = await tagTarget(tag);
        assert.ok(target, "A prior finalized release is missing its package tag.");
        assertHistoricalTarget(
          { name: manifest.name, version: manifest.version, directory },
          target,
          run.head_sha,
        );
      }
      finalized.add(run.head_sha);
    }
  }

  async function stage({ confirmation, verifiedArtifacts = false } = {}) {
    await publicationPreflight(confirmation);
    try {
      await readFile(path.join(output, "staging.json"));
      throw new Error(
        "An existing staging receipt requires manual reconciliation before another upload.",
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (verifiedArtifacts) {
      workflowContext("publish.yml", confirmation);
      await assertFreshStaging();
    } else {
      assert.notEqual(
        env.GITHUB_ACTIONS,
        "true",
        "The staging workflow must use preverified artifacts.",
      );
      await check();
    }
    const plan = await inspect({ confirmation });
    await publicationPreflight(confirmation);
    const summary = {
      commit: confirmation,
      registry,
      source: verifiedArtifacts
        ? {
            runId: identifier(env.GITHUB_RUN_ID, "current run ID"),
            attempt: 1,
            artifactId: identifier(env.RELEASE_ARTIFACT_ID, "verified artifact ID"),
          }
        : null,
      complete: false,
      packages: plan.packages.map((entry) => ({ ...entry, state: "not-attempted" })),
    };
    const save = () =>
      writeFile(path.join(output, "staging.json"), `${JSON.stringify(summary, null, 2)}\n`);
    await save();
    const stageIds = new Set();
    try {
      for (const entry of summary.packages) {
        if (await alreadyPublished(entry)) {
          entry.state = "already-published";
        } else {
          entry.state = "attempting";
          await save();
          const result = JSON.parse(
            pnpm(
              [
                "stage",
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
                "0",
                "--ignore-scripts",
                "--json",
              ],
              true,
            ),
          );
          assert.deepEqual(
            Object.keys(result),
            [entry.name],
            "Unexpected staging response package set.",
          );
          const receipt = result[entry.name];
          assert.equal(receipt.name, entry.name);
          assert.equal(receipt.version, entry.version);
          assert.equal(receipt.filename, entry.filename);
          assert.equal(
            receipt.integrity,
            `sha512-${Buffer.from(entry.sha512, "hex").toString("base64")}`,
          );
          assert.match(
            receipt.stageId ?? "",
            /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i,
            "Invalid stage ID.",
          );
          assert.ok(!stageIds.has(receipt.stageId.toLowerCase()), "Duplicate stage ID.");
          stageIds.add(receipt.stageId.toLowerCase());
          entry.stageId = receipt.stageId;
          entry.state = "staged";
        }
        await save();
      }
    } catch (error) {
      for (const entry of summary.packages)
        if (entry.state === "attempting") entry.state = "unknown";
      await save();
      console.error(
        "Staging stopped. Preserve the receipt and original artifacts; reconcile with npm before another upload. No tags were created.",
      );
      throw error;
    }
    summary.complete = true;
    await save();
    console.log(
      "Packages staged, not published. Review and approve on npm with 2FA, then run release finalization.",
    );
    return summary;
  }

  async function source({ confirmation, sourceRun, sourceAttempt, reconcileFailed = false } = {}) {
    workflowContext("finalize-release.yml", confirmation);
    await publicationPreflight(confirmation);
    const runId = identifier(sourceRun, "source run ID");
    const attempt = identifier(sourceAttempt, "source attempt");
    const run = await github(`actions/runs/${runId}/attempts/${attempt}`);
    assert.equal(run.id, runId);
    assert.equal(run.run_attempt, attempt);
    assert.equal(run.path, ".github/workflows/publish.yml");
    assert.equal(run.repository?.full_name, "jordan-a-young/little-jay");
    assert.equal(run.event, "workflow_dispatch");
    assert.equal(run.head_branch, "main");
    assert.equal(run.head_sha, confirmation);
    assert.equal(run.actor?.login, "jordan-a-young");
    assert.equal(run.triggering_actor?.login, "jordan-a-young");
    assert.equal(run.status, "completed");
    assert.ok(
      run.conclusion === "success" ||
        (reconcileFailed && ["failure", "cancelled", "timed_out"].includes(run.conclusion)),
      "Source staging attempt was not successful; explicit failed-stage reconciliation is required.",
    );
    const jobs = await github(`actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100`);
    assert.ok(jobs.total_count <= 100, "Source job set exceeds the inspection bound.");
    const verificationJobs = jobs.jobs.filter(
      (job) => job.name === "verify" && job.conclusion === "success",
    );
    assert.equal(verificationJobs.length, 1, "Source verification did not succeed.");
    if (!reconcileFailed)
      assert.equal(
        jobs.jobs.filter((job) => job.name === "stage" && job.conclusion === "success").length,
        1,
        "Source staging did not succeed.",
      );
    const artifacts = await github(`actions/runs/${runId}/artifacts?per_page=100`);
    assert.ok(artifacts.total_count <= 100, "Source artifact set exceeds the inspection bound.");
    const matches = artifacts.artifacts.filter(
      (artifact) => artifact.name === `verified-npm-release-${attempt}`,
    );
    assert.equal(matches.length, 1, "Expected one exact verified source artifact.");
    const artifact = matches[0];
    assert.equal(artifact.expired, false, "Source artifact has expired.");
    assert.equal(artifact.workflow_run?.id, runId);
    assert.equal(artifact.workflow_run?.head_sha, confirmation);
    const createdAt = Date.parse(artifact.created_at);
    const startedAt = Date.parse(verificationJobs[0].started_at);
    const completedAt = Date.parse(verificationJobs[0].completed_at);
    assert.ok(
      Number.isFinite(createdAt) && Number.isFinite(startedAt) && Number.isFinite(completedAt),
      "Missing source artifact/job timestamps.",
    );
    assert.ok(
      createdAt >= startedAt && createdAt <= completedAt,
      "Source artifact was not created during the successful verification job.",
    );
    const uploadJob = jobs.jobs.find((job) => job.name === "stage");
    if (uploadJob?.started_at)
      assert.ok(
        createdAt < Date.parse(uploadJob.started_at),
        "Source artifact was created after the upload job started.",
      );
    return {
      runId,
      attempt,
      artifactId: identifier(artifact.id, "source artifact ID"),
      sourceConclusion: run.conclusion,
    };
  }

  async function verifyFinalization(options = {}) {
    const origin = await source(options);
    assert.equal(
      String(origin.artifactId),
      env.RELEASE_ARTIFACT_ID,
      "Downloaded artifact differs from the selected source artifact.",
    );
    const plan = await inspect(options);
    for (const entry of plan.packages) {
      assert.equal(
        await alreadyPublished(entry),
        true,
        `Await npm approval and registry propagation: ${entry.name}@${entry.version}`,
      );
    }
    await publicationPreflight(options.confirmation);
    return { plan, origin };
  }

  async function tagTarget(tag) {
    let reference = await github(`git/ref/tags/${encodeURIComponent(tag)}`, { allowMissing: true });
    if (!reference) return null;
    assert.equal(reference.ref, `refs/tags/${tag}`, "Unexpected release tag reference.");
    for (let depth = 0; depth < 5; depth++) {
      if (reference.object?.type === "commit") {
        assert.match(reference.object.sha, /^[a-f0-9]{40}$/);
        return reference.object.sha;
      }
      assert.equal(reference.object?.type, "tag", "Unexpected release tag object.");
      assert.match(reference.object.sha, /^[a-f0-9]{40}$/);
      reference = await github(`git/tags/${reference.object.sha}`);
    }
    throw new Error("Release tag nesting exceeds the inspection bound.");
  }

  async function finalize(options = {}) {
    const { plan, origin } = await verifyFinalization(options);
    const entries = [];
    for (const entry of plan.packages) {
      assertHistoricalTarget(entry, entry.metadataCommit, options.confirmation);
      const tag = `${entry.name}@${entry.version}`;
      const target = await tagTarget(tag);
      assert.ok(
        target === null || target === entry.metadataCommit,
        `Existing tag targets another commit: ${tag}`,
      );
      const release = await github(`releases/tags/${encodeURIComponent(tag)}`, {
        allowMissing: true,
      });
      if (release) {
        assert.equal(release.tag_name, tag);
        assert.equal(
          release.draft,
          false,
          "An existing draft release requires manual reconciliation.",
        );
        assert.equal(
          release.prerelease,
          false,
          "An existing prerelease requires manual reconciliation.",
        );
        assert.equal(target, entry.metadataCommit, "Existing release lacks the expected tag.");
      }
      const changelog = (
        await readFile(path.join(root, "packages", entry.directory, "CHANGELOG.md"), "utf8")
      ).split("\n");
      const start = changelog.indexOf(`## ${entry.version}`);
      assert.ok(start >= 0, "Current changelog heading not found.");
      const end = changelog.findIndex((line, index) => index > start && line.startsWith("## "));
      const body = changelog
        .slice(start + 1, end === -1 ? undefined : end)
        .join("\n")
        .trim();
      assert.ok(body, "Current changelog entry is empty.");
      entries.push({ tag, target, release, body, metadataCommit: entry.metadataCommit });
    }
    await verifyFinalization(options);
    const report = { commit: options.confirmation, source: origin, completedTags: [] };
    await writeFile(path.join(output, "finalization.json"), `${JSON.stringify(report, null, 2)}\n`);
    for (const entry of entries) {
      if (!entry.target) {
        try {
          await github("git/refs", {
            method: "POST",
            body: { ref: `refs/tags/${entry.tag}`, sha: entry.metadataCommit },
          });
        } catch (error) {
          if (![409, 422].includes(error.status)) throw error;
        }
      }
      assert.equal(
        await tagTarget(entry.tag),
        entry.metadataCommit,
        "Remote release tag does not match the reviewed commit.",
      );
      if (!entry.release) {
        try {
          await github("releases", {
            method: "POST",
            body: {
              tag_name: entry.tag,
              target_commitish: entry.metadataCommit,
              name: entry.tag,
              body: entry.body,
              draft: false,
              prerelease: false,
            },
          });
        } catch (error) {
          if (error.status !== 422) throw error;
        }
        const release = await github(`releases/tags/${encodeURIComponent(entry.tag)}`);
        assert.equal(release.tag_name, entry.tag);
        assert.equal(release.draft, false);
        assert.equal(release.prerelease, false);
      }
      report.completedTags.push(entry.tag);
      await writeFile(
        path.join(output, "finalization.json"),
        `${JSON.stringify(report, null, 2)}\n`,
      );
    }
    return report;
  }

  return {
    check,
    status,
    version,
    stage,
    inspect,
    source,
    verifyFinalization,
    finalize,
    manifests,
    validateChangesets,
  };
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
    else if (["stage", "inspect", "source", "verify-finalization", "finalize"].includes(command)) {
      const options = {};
      const values = {
        "--confirm": "confirmation",
        "--source-run": "sourceRun",
        "--source-attempt": "sourceAttempt",
      };
      const flags = {
        "--verified-artifacts": "verifiedArtifacts",
        "--reconcile-failed": "reconcileFailed",
      };
      for (let index = 0; index < arguments_.length; index++) {
        const argument = arguments_[index];
        const key = Object.hasOwn(values, argument)
          ? values[argument]
          : Object.hasOwn(flags, argument)
            ? flags[argument]
            : undefined;
        assert.ok(key && !Object.hasOwn(options, key), "Unknown or duplicate release argument.");
        if (Object.hasOwn(flags, argument)) options[key] = true;
        else {
          assert.ok(
            arguments_[index + 1] && !arguments_[index + 1].startsWith("--"),
            "Missing release argument value.",
          );
          options[key] = arguments_[++index];
        }
      }
      const permitted =
        command === "stage"
          ? ["confirmation", "verifiedArtifacts"]
          : command === "inspect"
            ? ["confirmation"]
            : ["confirmation", "sourceRun", "sourceAttempt", "reconcileFailed"];
      assert.ok(
        Object.keys(options).every((key) => permitted.includes(key)),
        "Argument is not supported by this release command.",
      );
      const methods = {
        stage: "stage",
        inspect: "inspect",
        source: "source",
        "verify-finalization": "verifyFinalization",
        finalize: "finalize",
      };
      const result = await release[methods[command]](options);
      if (command === "source") {
        assert.ok(process.env.GITHUB_OUTPUT, "Source selection requires GitHub job outputs.");
        await writeFile(process.env.GITHUB_OUTPUT, `artifact-id=${result.artifactId}\n`, {
          flag: "a",
        });
      }
    } else
      throw new Error(
        "Run a supported release:* script through pnpm. Direct publishing has been removed; use staging and finalization.",
      );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Release command failed.");
    process.exitCode = 1;
  }
}
