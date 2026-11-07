import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createRelease, registry, releasePackages } from "./release.mjs";
import { tarballFilename } from "./package-artifacts.mjs";

const commit = "a".repeat(40);
const repository = "https://github.com/jordan-a-young/little-jay.git";
let root;
let commands;
let gitState;
let env;
let execute;
let lookup;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "littlejay-release-test-"));
  commands = [];
  gitState = {
    branch: "main",
    status: "",
    head: commit,
    origin: repository,
    remote: `${commit}\trefs/heads/main`,
  };
  env = {
    npm_execpath: "/fixture/pnpm",
    LITTLEJAY_PUBLISH_ENABLED: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: commit,
    GITHUB_TOKEN: "synthetic-workflow-token",
    GITHUB_WORKFLOW_REF: "jordan-a-young/little-jay/.github/workflows/publish.yml@refs/heads/main",
  };
  await mkdir(path.join(root, "apps/playground"), { recursive: true });
  await writeFile(path.join(root, "apps/AGENTS.md"), "Application guidance");
  await mkdir(path.join(root, ".changeset"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ private: true }));
  await writeFile(
    path.join(root, "apps/playground/package.json"),
    JSON.stringify({ private: true }),
  );
  await writeFile(path.join(root, ".changeset/README.md"), "Release notes");
  await writeFile(path.join(root, ".changeset/AGENTS.md"), "Guidance");
  for (const [index, directory] of releasePackages.entries()) {
    const version = `0.${index + 1}.0`;
    await mkdir(path.join(root, "packages", directory), { recursive: true });
    await writeFile(
      path.join(root, "packages", directory, "package.json"),
      JSON.stringify({
        name: `@littlejay/${directory}`,
        version,
        private: false,
        publishConfig: { registry, access: "public" },
        repository: { url: repository },
        dependencies:
          directory === "ui"
            ? { "@littlejay/brand": "workspace:*", "@littlejay/tokens": "workspace:*" }
            : {},
      }),
    );
    await writeFile(
      path.join(root, "packages", directory, "CHANGELOG.md"),
      `# Package\n\n## ${version}\n\nInitial release\n`,
    );
  }
  lookup = vi.fn(async () => false);
  execute = vi.fn((command, arguments_) => {
    commands.push([command, ...arguments_]);
    if (command === "git") {
      if (arguments_[0] === "status") return gitState.status;
      if (arguments_[0] === "branch") return gitState.branch;
      if (arguments_[0] === "remote") return gitState.origin;
      if (arguments_[0] === "ls-remote") return gitState.remote;
      if (arguments_[1] === "--show-toplevel") return root;
      if (arguments_[1] === "HEAD") return gitState.head;
      throw new Error("Unexpected Git command in release test");
    }
    if (arguments_.includes("pack")) {
      const name = arguments_[1];
      const manifest = JSON.parse(
        readFileSync(path.join(root, "packages", name.split("/")[1], "package.json"), "utf8"),
      );
      writeFileSync(
        path.join(root, ".release", tarballFilename(name, manifest.version)),
        JSON.stringify(manifest),
      );
    }
    return "";
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

const release = () => createRelease({ root, env, execute, lookup });
const publishCommands = () => commands.filter(([, command]) => command === "publish");
async function mutateManifest(directory, change) {
  const filename = path.join(root, "packages", directory, "package.json");
  const manifest = JSON.parse(await readFile(filename, "utf8"));
  change(manifest);
  await writeFile(filename, JSON.stringify(manifest));
}

describe("release artifacts and versioning", () => {
  it("derives safe tarball names from independent versions, including prerelease fixtures", () => {
    expect(tarballFilename("@littlejay/ui", "0.2.3")).toBe("littlejay-ui-0.2.3.tgz");
    expect(tarballFilename("@littlejay/tokens", "1.2.0-beta.1")).toBe(
      "littlejay-tokens-1.2.0-beta.1.tgz",
    );
    expect(() => tarballFilename("../../escape", "0.1.0")).toThrow();
    expect(() => tarballFilename("@littlejay/ui", "../../escape")).toThrow();
  });

  it("verifies before packing all five libraries and binds hashes to the clean commit", async () => {
    const plan = await release().check();
    expect(commands.slice(0, 2)).toEqual([
      [env.npm_execpath, "ready"],
      [env.npm_execpath, "secrets:scan"],
    ]);
    expect(plan.commit).toBe(commit);
    expect(plan.packages.map((entry) => entry.name)).toEqual(
      releasePackages.map((name) => `@littlejay/${name}`),
    );
    for (const entry of plan.packages) {
      expect(entry.sha512).toBe(
        createHash("sha512")
          .update(await readFile(path.join(root, ".release", entry.filename)))
          .digest("hex"),
      );
    }
    expect(publishCommands()).toEqual([]);
  });

  it("does not mint a publishable verification record from dirty work", async () => {
    gitState.status = " M package.json";
    expect((await release().check()).commit).toBeNull();
  });

  it("stops before packing if a verification gate fails", async () => {
    execute.mockImplementationOnce(() => {
      throw new Error("coverage failed");
    });
    await expect(release().check()).rejects.toThrow("coverage failed");
    expect(commands).toEqual([]);
    await expect(readFile(path.join(root, ".release/verified.json"))).rejects.toThrow();
  });

  it.each([
    [
      "privacy",
      (manifest) => {
        manifest.private = true;
      },
    ],
    [
      "scope",
      (manifest) => {
        manifest.name = "@unexpected/ui";
      },
    ],
    [
      "version",
      (manifest) => {
        manifest.version = "0.0.0";
      },
    ],
    [
      "prerelease",
      (manifest) => {
        manifest.version = "0.1.0-beta.1";
      },
    ],
    [
      "registry",
      (manifest) => {
        manifest.publishConfig.registry = "https://example.test/";
      },
    ],
    [
      "access",
      (manifest) => {
        manifest.publishConfig.access = "restricted";
      },
    ],
    [
      "repository",
      (manifest) => {
        manifest.repository.url = "https://example.test/repo";
      },
    ],
    [
      "dependency",
      (manifest) => {
        manifest.dependencies["@littlejay/private"] = "workspace:*";
      },
    ],
  ])("rejects invalid %s metadata before commands run", async (_label, change) => {
    await mutateManifest("ui", change);
    await expect(release().check()).rejects.toThrow();
    expect(commands).toEqual([]);
  });

  it("requires private root/apps and current changelogs", async () => {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ private: false }));
    await expect(release().manifests()).rejects.toThrow("root must remain private");
    await writeFile(path.join(root, "package.json"), JSON.stringify({ private: true }));
    await writeFile(
      path.join(root, "apps/playground/package.json"),
      JSON.stringify({ private: false }),
    );
    await expect(release().manifests()).rejects.toThrow("Apps must remain private");
    await writeFile(
      path.join(root, "apps/playground/package.json"),
      JSON.stringify({ private: true }),
    );
    await writeFile(path.join(root, "packages/ui/CHANGELOG.md"), "# Missing version");
    await expect(release().manifests()).rejects.toThrow("Missing changelog");
  });

  it("versions only pending notes without Git writes or publication", async () => {
    await expect(release().version()).rejects.toThrow("No pending changesets");
    await writeFile(
      path.join(root, ".changeset/fix.md"),
      '---\n"@littlejay/ui": patch\n---\n\nFix focus\n',
    );
    await expect(release().check()).rejects.toThrow("Version pending changesets");
    await release().version();
    expect(commands.slice(0, 2)).toEqual([
      [env.npm_execpath, "exec", "changeset", "version"],
      [env.npm_execpath, "install", "--lockfile-only", "--ignore-scripts"],
    ]);
    expect(commands.some(([command]) => command === "git")).toBe(false);
    expect(publishCommands()).toEqual([]);
  });

  it("reports current versions after notes are consumed and previews pending notes through Changesets", async () => {
    await release().status();
    expect(commands).toEqual([]);
    await writeFile(
      path.join(root, ".changeset/fix.md"),
      '---\n"@littlejay/ui": patch\n---\n\nFix focus\n',
    );
    await release().status();
    expect(commands).toEqual([[env.npm_execpath, "exec", "changeset", "status"]]);
  });
});

describe("publication boundaries without registry writes", () => {
  it("requires explicit activation and exact SHA confirmation", async () => {
    env.LITTLEJAY_PUBLISH_ENABLED = "false";
    await expect(release().publish({ confirmation: commit })).rejects.toThrow(
      "Publication is disabled",
    );
    env.LITTLEJAY_PUBLISH_ENABLED = "true";
    await expect(release().publish()).rejects.toThrow("exact release commit");
    await expect(release().publish({ confirmation: "b".repeat(40) })).rejects.toThrow(
      "does not match confirmation",
    );
    expect(publishCommands()).toEqual([]);
  });

  it("authenticates private-origin reads only through command-scoped environment, never arguments or Git config writes", async () => {
    await release().publish({ confirmation: commit });
    const remoteReads = execute.mock.calls.filter(
      ([command, arguments_]) => command === "git" && arguments_[0] === "ls-remote",
    );
    expect(remoteReads.length).toBeGreaterThan(0);
    const header = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString("base64")}`;
    for (const [, arguments_, capture, commandEnvironment] of remoteReads) {
      expect(arguments_).toEqual(["ls-remote", "--heads", "origin", "main"]);
      expect(capture).toBe(true);
      expect(commandEnvironment).toEqual({
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_0: header,
        GIT_TERMINAL_PROMPT: "0",
      });
    }
    expect(JSON.stringify(commands)).not.toContain(env.GITHUB_TOKEN);
    expect(JSON.stringify(commands)).not.toContain(header);
    expect(commands.some(([command, argument]) => command === "git" && argument === "config")).toBe(
      false,
    );
    env.GITHUB_TOKEN = "";
    await expect(
      release().publish({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("requires the workflow GitHub token");
    env.GITHUB_ACTIONS = "false";
    commands.length = 0;
    const previousCalls = execute.mock.calls.length;
    await release().publish({ confirmation: commit });
    const localReads = execute.mock.calls
      .slice(previousCalls)
      .filter(([command, arguments_]) => command === "git" && arguments_[0] === "ls-remote");
    expect(localReads.length).toBeGreaterThan(0);
    expect(localReads.every((call) => call[3] === undefined)).toBe(true);
  });

  it.each([
    ["branch", "feature", "Publish only from main"],
    ["status", " M package.json", "clean checkout"],
    ["origin", "https://example.test/repo", "Unexpected origin"],
    ["remote", `${"b".repeat(40)}\trefs/heads/main`, "current origin/main"],
  ])("rejects unexpected Git %s", async (key, value, message) => {
    gitState[key] = value;
    await expect(release().publish({ confirmation: commit })).rejects.toThrow(message);
    expect(publishCommands()).toEqual([]);
  });

  it("does not let local callers bypass verification using downloaded artifacts", async () => {
    env.GITHUB_ACTIONS = "false";
    await expect(
      release().publish({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("only accepted from the publishing workflow");
    env.GITHUB_ACTIONS = "true";
    env.GITHUB_WORKFLOW_REF =
      "jordan-a-young/little-jay/.github/workflows/other.yml@refs/heads/main";
    await expect(
      release().publish({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow();
    expect(publishCommands()).toEqual([]);
  });

  it.each(["hash", "commit", "filename", "count"])(
    "rejects changed artifact %s before the first upload",
    async (change) => {
      const plan = await release().check();
      if (change === "hash")
        await writeFile(path.join(root, ".release", plan.packages.at(-1).filename), "tampered");
      if (change === "commit") plan.commit = "b".repeat(40);
      if (change === "filename") plan.packages[0].filename = "../escape.tgz";
      if (change === "count") plan.packages.pop();
      await writeFile(path.join(root, ".release/verified.json"), JSON.stringify(plan));
      await expect(
        release().publish({ confirmation: commit, verifiedArtifacts: true }),
      ).rejects.toThrow();
      expect(publishCommands()).toEqual([]);
      expect(lookup).not.toHaveBeenCalled();
    },
  );

  it("publishes locally only after all gates, in dependency order, then creates local tags", async () => {
    const summary = await release().publish({ confirmation: commit });
    expect(summary.confirmedPackages).toHaveLength(5);
    expect(publishCommands().map((command) => path.basename(command[2]))).toEqual(
      releasePackages.map((name, index) => `littlejay-${name}-0.${index + 1}.0.tgz`),
    );
    expect(
      publishCommands().every(
        (command) =>
          command.includes("--publish-wait-timeout") &&
          !command.includes("--force") &&
          !command.includes("--no-git-checks"),
      ),
    ).toBe(true);
    expect(commands.at(-1)).toEqual([env.npm_execpath, "exec", "changeset", "git-tag"]);
    expect(commands.some((command) => command.includes("push") || command.includes("commit"))).toBe(
      false,
    );
  });

  it("reuses verified CI tarballs without rebuilding and skips confirmed versions on retry", async () => {
    await release().check();
    commands.length = 0;
    lookup.mockResolvedValue(true);
    const summary = await release().publish({ confirmation: commit, verifiedArtifacts: true });
    expect(summary.confirmedPackages.every((entry) => entry.existing)).toBe(true);
    expect(publishCommands()).toEqual([]);
    expect(commands.some((command) => command.includes("ready") || command.includes("pack"))).toBe(
      false,
    );
  });

  it("fails closed on registry errors and preserves partial progress without tagging", async () => {
    lookup.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("registry unavailable"));
    await expect(release().publish({ confirmation: commit })).rejects.toThrow(
      "registry unavailable",
    );
    expect(publishCommands()).toHaveLength(1);
    const report = JSON.parse(
      await readFile(path.join(root, ".release/publish-summary.json"), "utf8"),
    );
    expect(report.confirmedPackages.map((entry) => entry.name)).toEqual(["@littlejay/brand"]);
    expect(report.unconfirmedPackage).toBe("@littlejay/tokens@0.2.0");
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("checks registry integrity rather than trusting a version number alone", async () => {
    const plan = await release().check();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const entry = plan.packages.find((candidate) =>
          url.includes(encodeURIComponent(candidate.name)),
        );
        return Response.json({
          name: entry.name,
          version: entry.version,
          dist: { integrity: "sha512-wrong" },
        });
      }),
    );
    const guarded = createRelease({ root, env, execute });
    await expect(
      guarded.publish({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("Existing npm artifact differs");
    expect(publishCommands()).toEqual([]);
  });
});

it("keeps workflows manual-only for publication and isolates OIDC from verification", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/publish.yml", import.meta.url),
    "utf8",
  );
  const [verify, publish] = workflow.split("\n  publish:");
  expect(workflow).toContain("workflow_dispatch:");
  expect(workflow).not.toMatch(/\n  (push|pull_request|workflow_run):/);
  expect(workflow).toContain("cancel-in-progress: false");
  expect(verify).toContain("github.ref == 'refs/heads/main'");
  expect(verify).toContain("github.actor == 'jordan-a-young'");
  expect(verify).toContain("github.triggering_actor == 'jordan-a-young'");
  expect(verify).not.toContain("environment:");
  expect(verify).not.toContain("id-token: write");
  expect(verify).toContain("pnpm release:check");
  expect(publish).toContain("id-token: write");
  expect(publish).toContain("github.repository == 'jordan-a-young/little-jay'");
  expect(publish).toContain("github.ref == 'refs/heads/main'");
  expect(publish).toContain("github.actor == 'jordan-a-young'");
  expect(publish).toContain("github.triggering_actor == 'jordan-a-young'");
  expect(publish).toContain("\n    environment: npm-publish\n");
  expect(publish).toContain("artifact-ids: ${{ needs.verify.outputs.artifact-id }}");
  expect(publish).toContain("--frozen-lockfile --ignore-scripts");
  expect(publish).not.toContain("pnpm ready");
  expect(publish).not.toContain("cache:");
  expect(workflow).not.toContain("NPM_TOKEN");
  const versionWorkflow = await readFile(
    new URL("../.github/workflows/release-pr.yml", import.meta.url),
    "utf8",
  );
  expect(versionWorkflow).toContain("verify-release-pr:");
  expect(versionWorkflow).not.toContain("id-token: write");
  expect(versionWorkflow).not.toContain("release:publish");
});
