import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
let githubRequest;
let sourceRun;
let sourceJobs;
let sourceArtifact;
let remoteTags;
let remoteReleases;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "littlejay-release-test-"));
  commands = [];
  gitState = {
    branch: "main",
    status: "",
    head: commit,
    origin: repository,
    remote: `${commit}\trefs/heads/main`,
    history: new Map(),
  };
  env = {
    npm_execpath: "/fixture/pnpm",
    LITTLEJAY_PUBLISH_ENABLED: "true",
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: commit,
    GITHUB_TOKEN: "synthetic-workflow-token",
    GITHUB_REPOSITORY: "jordan-a-young/little-jay",
    GITHUB_REF: "refs/heads/main",
    GITHUB_ACTOR: "jordan-a-young",
    GITHUB_TRIGGERING_ACTOR: "jordan-a-young",
    GITHUB_RUN_ID: "200",
    GITHUB_RUN_ATTEMPT: "1",
    RELEASE_ARTIFACT_ID: "123",
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
  sourceRun = {
    id: 100,
    run_attempt: 1,
    path: ".github/workflows/publish.yml",
    repository: { full_name: "jordan-a-young/little-jay" },
    event: "workflow_dispatch",
    head_branch: "main",
    head_sha: commit,
    actor: { login: "jordan-a-young" },
    triggering_actor: { login: "jordan-a-young" },
    status: "completed",
    conclusion: "success",
  };
  sourceJobs = {
    total_count: 2,
    jobs: [
      {
        name: "verify",
        conclusion: "success",
        started_at: "2026-11-08T00:00:00Z",
        completed_at: "2026-11-08T00:01:00Z",
      },
      {
        name: "stage",
        conclusion: "success",
        started_at: "2026-11-08T00:02:00Z",
        completed_at: "2026-11-08T00:03:00Z",
      },
    ],
  };
  sourceArtifact = {
    id: 123,
    name: "verified-npm-release-1",
    expired: false,
    created_at: "2026-11-08T00:00:30Z",
    workflow_run: { id: 100, head_sha: commit },
  };
  remoteTags = new Map();
  remoteReleases = new Map();
  githubRequest = vi.fn(async (pathname, options = {}) => {
    if (pathname.startsWith("actions/workflows/publish.yml/runs?"))
      return { total_count: 1, workflow_runs: [{ id: 200, head_sha: commit }] };
    if (pathname === "actions/runs/100/attempts/1") return sourceRun;
    if (pathname.endsWith("/jobs?per_page=100")) return sourceJobs;
    if (pathname === "actions/runs/100/artifacts?per_page=100")
      return { total_count: 1, artifacts: [sourceArtifact] };
    if (pathname.startsWith("git/ref/tags/")) {
      const tag = decodeURIComponent(pathname.slice("git/ref/tags/".length));
      return remoteTags.has(tag)
        ? { ref: `refs/tags/${tag}`, object: { type: "commit", sha: remoteTags.get(tag) } }
        : null;
    }
    if (pathname.startsWith("releases/tags/"))
      return (
        remoteReleases.get(decodeURIComponent(pathname.slice("releases/tags/".length))) ?? null
      );
    if (pathname === "releases?per_page=100") return [...remoteReleases.values()];
    if (pathname === "git/refs" && options.method === "POST") {
      remoteTags.set(options.body.ref.slice("refs/tags/".length), options.body.sha);
      return { object: { type: "commit", sha: options.body.sha } };
    }
    if (pathname === "releases" && options.method === "POST") {
      remoteReleases.set(options.body.tag_name, options.body);
      return options.body;
    }
    throw new Error(`Unexpected mock GitHub request: ${pathname}`);
  });
  execute = vi.fn((command, arguments_) => {
    commands.push([command, ...arguments_]);
    if (command === "git") {
      if (arguments_[0] === "status") return gitState.status;
      if (arguments_[0] === "branch") return gitState.branch;
      if (arguments_[0] === "remote") return gitState.origin;
      if (arguments_[0] === "ls-remote") {
        return gitState.releaseBranch && arguments_[3] === "main"
          ? `${gitState.releaseBranch}\n${gitState.remote}`
          : gitState.remote;
      }
      if (arguments_[1] === "--show-toplevel") return root;
      if (arguments_[1] === "HEAD") {
        if (!gitState.history.has(gitState.head))
          gitState.history.set(
            gitState.head,
            new Map(
              releasePackages.map((directory) => [
                directory,
                readFileSync(path.join(root, "packages", directory, "package.json"), "utf8"),
              ]),
            ),
          );
        return gitState.head;
      }
      if (arguments_[0] === "for-each-ref")
        return remoteTags.has(arguments_[2].slice("refs/tags/".length)) ? arguments_[2] : "";
      if (arguments_[0] === "rev-parse" && arguments_[1] === "--verify")
        return remoteTags.get(arguments_[2].slice("refs/tags/".length, -"^{commit}".length));
      if (arguments_[0] === "merge-base") {
        if (!gitState.history.has(arguments_[2])) throw new Error("Tag target is not an ancestor");
        return "";
      }
      if (arguments_[0] === "show") {
        const [revision, filename] = arguments_[1].split(":");
        const directory = filename.split("/")[1];
        const manifest = gitState.history.get(revision)?.get(directory);
        if (!manifest) throw new Error("Missing historical manifest");
        return manifest;
      }
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
    if (arguments_[0] === "stage" && arguments_[1] === "publish") {
      const tarball = readFileSync(arguments_[2]);
      const manifest = JSON.parse(tarball.toString());
      const index = releasePackages.indexOf(manifest.name.slice("@littlejay/".length));
      return JSON.stringify({
        [manifest.name]: {
          name: manifest.name,
          version: manifest.version,
          filename: path.basename(arguments_[2]),
          integrity: `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
          stageId: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
        },
      });
    }
    return "";
  });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(root, { recursive: true, force: true });
});

const release = () => createRelease({ root, env, execute, lookup, githubRequest });
const publishCommands = () => commands.filter(([, command]) => command === "publish");
const stageCommands = () =>
  commands.filter(([, command, subcommand]) => command === "stage" && subcommand === "publish");
const finalizationOptions = () => ({ confirmation: commit, sourceRun: "100", sourceAttempt: "1" });
function finalization() {
  env.GITHUB_WORKFLOW_REF =
    "jordan-a-young/little-jay/.github/workflows/finalize-release.yml@refs/heads/main";
  return release();
}
async function mutateManifest(directory, change) {
  const filename = path.join(root, "packages", directory, "package.json");
  const manifest = JSON.parse(await readFile(filename, "utf8"));
  change(manifest);
  await writeFile(filename, JSON.stringify(manifest));
}

describe("release artifacts and versioning", () => {
  it("validates pending changesets without commands or release-file writes", async () => {
    const note =
      '---\n"@littlejay/ui": minor\n"@littlejay/http": patch\n"@littlejay/server": major\n---\n\nImprove consumer behavior.\n';
    await writeFile(path.join(root, ".changeset/fix.md"), note);
    const manifest = await readFile(path.join(root, "packages/ui/package.json"), "utf8");
    await expect(release().validateChangesets()).resolves.toEqual([
      {
        id: "fix",
        summary: "Improve consumer behavior.",
        releases: [
          { name: "@littlejay/ui", type: "minor" },
          { name: "@littlejay/http", type: "patch" },
          { name: "@littlejay/server", type: "major" },
        ],
      },
    ]);
    expect(await readFile(path.join(root, ".changeset/fix.md"), "utf8")).toBe(note);
    expect(await readFile(path.join(root, "packages/ui/package.json"), "utf8")).toBe(manifest);
    await expect(readFile(path.join(root, ".release/verified.json"))).rejects.toThrow();
    expect(commands).toEqual([]);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("allows no pending notes and explicitly empty changesets", async () => {
    await expect(release().validateChangesets()).resolves.toEqual([]);
    await writeFile(
      path.join(root, ".changeset/empty.md"),
      "---\n---\n\nMaintainer-only change.\n",
    );
    await expect(release().validateChangesets()).resolves.toEqual([
      { id: "empty", releases: [], summary: "Maintainer-only change." },
    ]);
    expect(commands).toEqual([]);
  });

  it.each(["@littlejay/typo", "little-jay", "@littlejay/playground"])(
    "rejects a changeset targeting %s",
    async (name) => {
      await writeFile(
        path.join(root, ".changeset/invalid.md"),
        `---\n"${name}": patch\n---\n\nFix behavior.\n`,
      );
      await expect(release().validateChangesets()).rejects.toThrow("Unexpected changeset package");
      expect(commands).toEqual([]);
    },
  );

  it.each(["invalid", "none"])("rejects the changeset bump %s", async (type) => {
    await writeFile(
      path.join(root, ".changeset/invalid.md"),
      `---\n"@littlejay/ui": ${type}\n---\n\nFix behavior.\n`,
    );
    await expect(release().validateChangesets()).rejects.toThrow();
    expect(commands).toEqual([]);
  });

  it("rejects malformed changeset frontmatter", async () => {
    await writeFile(
      path.join(root, ".changeset/invalid.md"),
      '---\n"@littlejay/ui": [\n---\n\nFix behavior.\n',
    );
    await expect(release().validateChangesets()).rejects.toThrow();
    expect(commands).toEqual([]);
  });

  it("runs changeset validation before the rest of the readiness gate", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    expect(manifest.scripts.ready.split(" && ")[0]).toBe("pnpm release:validate");
    expect(manifest.scripts["release:validate"]).toBe("node scripts/release.mjs validate");
  });

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

  it("binds an annotated historical tag using real isolated Git history while inspection stays command-free", async () => {
    const git = (arguments_) =>
      execFileSync("git", arguments_, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    git(["init", "-b", "main"]);
    git(["config", "user.name", "Release fixture"]);
    git(["config", "user.email", "release-fixture@example.test"]);
    await writeFile(path.join(root, ".gitignore"), ".release/\n");
    git(["add", "."]);
    git(["commit", "-m", "Initial fixture versions"]);
    const originalCommit = git(["rev-parse", "HEAD"]);
    git(["tag", "-a", "@littlejay/brand@0.1.0", "-m", "Fixture release"]);
    await mutateManifest("ui", (manifest) => {
      manifest.version = "0.5.1";
    });
    await writeFile(
      path.join(root, "packages/ui/CHANGELOG.md"),
      "# UI\n\n## 0.5.1\n\nUI fixture change\n",
    );
    git(["add", "."]);
    git(["commit", "-m", "UI-only fixture release"]);
    const currentCommit = git(["rev-parse", "HEAD"]);
    const originalExecute = execute.getMockImplementation();
    execute.mockImplementation((command, arguments_) =>
      command === "git" ? git(arguments_) : originalExecute(command, arguments_),
    );
    const plan = await release().check();
    expect(plan.commit).toBe(currentCommit);
    expect(plan.packages[0].metadataCommit).toBe(originalCommit);
    expect(plan.packages.slice(1).every((entry) => entry.metadataCommit === currentCommit)).toBe(
      true,
    );
    execute.mockClear();
    await release().inspect({ confirmation: currentCommit });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["unrelated", "version", "descendant", "git-error"])(
    "rejects an invalid existing %s tag during original verification",
    async (change) => {
      const plan = await release().check();
      const historical = "b".repeat(40);
      const entry = plan.packages[0];
      const tag = `${entry.name}@${entry.version}`;
      remoteTags.set(tag, historical);
      if (change !== "unrelated")
        gitState.history.set(historical, new Map(gitState.history.get(commit)));
      if (change === "version") {
        const manifest = JSON.parse(gitState.history.get(historical).get(entry.directory));
        manifest.version = "0.0.9";
        gitState.history.get(historical).set(entry.directory, JSON.stringify(manifest));
      }
      if (change === "descendant" || change === "git-error") {
        const original = execute.getMockImplementation();
        execute.mockImplementation((command, arguments_) => {
          if (arguments_[0] === "for-each-ref") {
            if (change === "git-error") throw new Error("Git read failed");
            return `${arguments_[2]}/unexpected`;
          }
          return original(command, arguments_);
        });
      }
      await expect(release().check()).rejects.toThrow();
      expect(stageCommands()).toEqual([]);
    },
  );

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
  it("reads the exact main ref when a changeset-release/main branch also exists", async () => {
    gitState.releaseBranch = `${"b".repeat(40)}\trefs/heads/changeset-release/main`;
    await release().check();
    await release().stage({ confirmation: commit, verifiedArtifacts: true });
    const remoteReads = commands.filter(
      ([command, argument]) => command === "git" && argument === "ls-remote",
    );
    expect(remoteReads.length).toBeGreaterThan(0);
    for (const command of remoteReads) {
      expect(command).toEqual(["git", "ls-remote", "--heads", "origin", "refs/heads/main"]);
    }
    expect(stageCommands()).toHaveLength(releasePackages.length);
  });

  it.each([repository, repository.slice(0, -4)])(
    "accepts the expected HTTPS origin %s for verified publication",
    async (origin) => {
      await release().check();
      gitState.origin = origin;
      await release().stage({ confirmation: commit, verifiedArtifacts: true });
      expect(stageCommands()).toHaveLength(releasePackages.length);
    },
  );

  it.each([
    "https://example.test/repo",
    "https://github.com/another-owner/little-jay.git",
    "https://github.com/jordan-a-young/another-repository.git",
    "http://github.com/jordan-a-young/little-jay.git",
    "git@github.com:jordan-a-young/little-jay.git",
    "https://github.com.example.test/jordan-a-young/little-jay.git",
    "https://github.com@untrusted.test/jordan-a-young/little-jay.git",
    `${repository}.git`,
    `${repository}/`,
    `${repository}?redirect=other`,
    `${repository}#other`,
  ])("rejects unexpected origin %s before remote or registry access", async (origin) => {
    gitState.origin = origin;
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("Unexpected origin");
    expect(publishCommands()).toEqual([]);
    expect(lookup).not.toHaveBeenCalled();
    expect(
      commands.some(([command, argument]) => command === "git" && argument === "ls-remote"),
    ).toBe(false);
  });

  it("requires explicit activation and exact SHA confirmation", async () => {
    env.LITTLEJAY_PUBLISH_ENABLED = "false";
    await expect(release().stage({ confirmation: commit })).rejects.toThrow(
      "Publication is disabled",
    );
    env.LITTLEJAY_PUBLISH_ENABLED = "true";
    await expect(release().stage()).rejects.toThrow("exact release commit");
    await expect(release().stage({ confirmation: "b".repeat(40) })).rejects.toThrow(
      "does not match confirmation",
    );
    expect(publishCommands()).toEqual([]);
  });

  it("authenticates private-origin reads only through command-scoped environment, never arguments or Git config writes", async () => {
    await release().check();
    await release().stage({ confirmation: commit, verifiedArtifacts: true });
    const remoteReads = execute.mock.calls.filter(
      ([command, arguments_]) => command === "git" && arguments_[0] === "ls-remote",
    );
    expect(remoteReads.length).toBeGreaterThan(0);
    const header = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${env.GITHUB_TOKEN}`).toString("base64")}`;
    for (const [, arguments_, capture, commandEnvironment] of remoteReads) {
      expect(arguments_).toEqual(["ls-remote", "--heads", "origin", "refs/heads/main"]);
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
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("requires the workflow GitHub token");
    env.GITHUB_ACTIONS = "false";
    commands.length = 0;
    const previousCalls = execute.mock.calls.length;
    await rm(path.join(root, ".release/staging.json"));
    await release().stage({ confirmation: commit });
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
    ["remote", `${commit}\trefs/heads/changeset-release/main`, "current origin/main"],
    ["remote", "", "current origin/main"],
    ["remote", `${commit}\trefs/heads/main\n${commit}\trefs/heads/other`, "current origin/main"],
  ])("rejects unexpected Git %s", async (key, value, message) => {
    gitState[key] = value;
    await expect(release().stage({ confirmation: commit })).rejects.toThrow(message);
    expect(publishCommands()).toEqual([]);
  });

  it("does not let local callers bypass verification using downloaded artifacts", async () => {
    env.GITHUB_ACTIONS = "false";
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("requires its GitHub workflow");
    env.GITHUB_ACTIONS = "true";
    env.GITHUB_WORKFLOW_REF =
      "jordan-a-young/little-jay/.github/workflows/other.yml@refs/heads/main";
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow();
    expect(publishCommands()).toEqual([]);
  });

  it.each([
    "hash",
    "commit",
    "filename",
    "count",
    "directory",
    "extra",
    "checksums",
    "metadata-target",
  ])("rejects changed artifact %s before the first upload", async (change) => {
    const plan = await release().check();
    if (change === "hash")
      await writeFile(path.join(root, ".release", plan.packages.at(-1).filename), "tampered");
    if (change === "commit") plan.commit = "b".repeat(40);
    if (change === "filename") plan.packages[0].filename = "../escape.tgz";
    if (change === "count") plan.packages.pop();
    if (change === "directory") plan.packages[0].directory = "../../outside";
    if (change === "metadata-target") delete plan.packages[0].metadataCommit;
    if (change === "extra") await writeFile(path.join(root, ".release/unexpected.js"), "untrusted");
    if (change === "checksums") await writeFile(path.join(root, ".release/SHA512SUMS"), "wrong");
    await writeFile(path.join(root, ".release/verified.json"), JSON.stringify(plan));
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow();
    expect(publishCommands()).toEqual([]);
    expect(stageCommands()).toEqual([]);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("stages locally in dependency order without publishing or creating tags", async () => {
    env.GITHUB_ACTIONS = "false";
    const summary = await release().stage({ confirmation: commit });
    expect(summary.complete).toBe(true);
    expect(summary.packages.every((entry) => entry.state === "staged")).toBe(true);
    expect(stageCommands().map((command) => path.basename(command[3]))).toEqual(
      releasePackages.map((name, index) => `littlejay-${name}-0.${index + 1}.0.tgz`),
    );
    expect(
      stageCommands().every(
        (command) =>
          command[command.indexOf("--publish-wait-timeout") + 1] === "0" &&
          command.includes("--ignore-scripts") &&
          !command.includes("--force") &&
          !command.includes("--no-git-checks"),
      ),
    ).toBe(true);
    expect(publishCommands()).toEqual([]);
    expect(
      commands.some(
        (command) =>
          command.includes("git-tag") || command.includes("push") || command.includes("commit"),
      ),
    ).toBe(false);
  });

  it("reuses verified CI tarballs without rebuilding and skips already published matching versions", async () => {
    await release().check();
    commands.length = 0;
    lookup.mockResolvedValue(true);
    const summary = await release().stage({ confirmation: commit, verifiedArtifacts: true });
    expect(summary.packages.every((entry) => entry.state === "already-published")).toBe(true);
    expect(stageCommands()).toEqual([]);
    expect(publishCommands()).toEqual([]);
    expect(commands.some((command) => command.includes("ready") || command.includes("pack"))).toBe(
      false,
    );
  });

  it("fails closed on registry errors and preserves partial progress without tagging", async () => {
    await release().check();
    lookup.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("registry unavailable"));
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("registry unavailable");
    expect(stageCommands()).toHaveLength(1);
    const report = JSON.parse(await readFile(path.join(root, ".release/staging.json"), "utf8"));
    expect(report.complete).toBe(false);
    expect(report.packages[0].state).toBe("staged");
    expect(report.packages[1].state).toBe("not-attempted");
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
    const guarded = createRelease({ root, env, execute, githubRequest });
    await expect(guarded.stage({ confirmation: commit, verifiedArtifacts: true })).rejects.toThrow(
      "Existing npm artifact differs",
    );
    expect(publishCommands()).toEqual([]);
  });
});

describe("staging receipts and uncertain uploads", () => {
  it("keeps retry diagnostics on stderr instead of mixing them into the JSON receipt", async () => {
    await release().check();
    const executable = path.join(root, "pnpm-reporter-fixture.mjs");
    await writeFile(
      executable,
      `
const output = process.argv.includes("--reporter=ndjson") ? process.stderr : process.stdout;
output.write("GET https://registry.example.test/fixture error (temporary failure)\\n");
process.stdout.write(process.argv.at(-1));
`,
    );
    const original = execute.getMockImplementation();
    execute.mockImplementation((command, arguments_, capture) => {
      const result = original(command, arguments_);
      if (arguments_[0] !== "stage") return result;
      expect(capture).toBe(true);
      return execFileSync(process.execPath, [executable, ...arguments_, result], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    });
    const receipt = await release().stage({ confirmation: commit, verifiedArtifacts: true });
    expect(receipt.complete).toBe(true);
    expect(receipt.packages.every((entry) => entry.state === "staged")).toBe(true);
    expect(stageCommands()).toHaveLength(5);
    expect(stageCommands().every((command) => command.includes("--reporter=ndjson"))).toBe(true);
  });

  it("binds successful stage IDs to the exact artifact and records attempting before upload", async () => {
    await release().check();
    const original = execute.getMockImplementation();
    execute.mockImplementation((command, arguments_) => {
      if (arguments_[0] === "stage") {
        const receipt = JSON.parse(readFileSync(path.join(root, ".release/staging.json"), "utf8"));
        const entry = receipt.packages.find(
          (candidate) => candidate.filename === path.basename(arguments_[2]),
        );
        expect(entry.state).toBe("attempting");
      }
      return original(command, arguments_);
    });
    const receipt = await release().stage({ confirmation: commit, verifiedArtifacts: true });
    expect(receipt.source).toEqual({ runId: 200, attempt: 1, artifactId: 123 });
    expect(new Set(receipt.packages.map((entry) => entry.stageId)).size).toBe(5);
    expect(publishCommands()).toEqual([]);
    expect(
      commands.some((command) => command.includes("git-tag") || command.includes("approve")),
    ).toBe(false);
  });

  it.each([
    "malformed",
    "diagnostic-prefix",
    "uuid",
    "name",
    "version",
    "filename",
    "integrity",
    "duplicate",
  ])("stops with an unknown outcome on an invalid %s staging response", async (change) => {
    await release().check();
    const original = execute.getMockImplementation();
    execute.mockImplementation((command, arguments_) => {
      const result = original(command, arguments_);
      if (arguments_[0] !== "stage") return result;
      if (change === "malformed") return "not JSON";
      if (change === "diagnostic-prefix")
        return `GET https://registry.example.test/fixture error (temporary failure)\n${result}`;
      const response = JSON.parse(result);
      const receipt = Object.values(response)[0];
      if (change === "uuid") receipt.stageId = "not-a-stage-id";
      if (change === "name") receipt.name = "@littlejay/other";
      if (change === "version") receipt.version = "9.9.9";
      if (change === "filename") receipt.filename = "other.tgz";
      if (change === "integrity") receipt.integrity = "sha512-wrong";
      if (change === "duplicate") receipt.stageId = "00000000-0000-0000-0000-000000000001";
      return JSON.stringify(response);
    });
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow();
    const receipt = JSON.parse(await readFile(path.join(root, ".release/staging.json"), "utf8"));
    expect(receipt.complete).toBe(false);
    expect(receipt.packages.some((entry) => entry.state === "unknown")).toBe(true);
    const attempted = stageCommands().length;
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("existing staging receipt");
    expect(stageCommands()).toHaveLength(attempted);
  });

  it("never automatically repeats an upload after its command fails", async () => {
    await release().check();
    const original = execute.getMockImplementation();
    execute.mockImplementation((command, arguments_) => {
      if (arguments_[0] === "stage") {
        original(command, arguments_);
        throw new Error("upload outcome unknown");
      }
      return original(command, arguments_);
    });
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("outcome unknown");
    const receipt = JSON.parse(await readFile(path.join(root, ".release/staging.json"), "utf8"));
    expect(receipt.packages[0].state).toBe("unknown");
    expect(receipt.packages[0].stageId).toBeUndefined();
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("existing staging receipt");
    expect(stageCommands()).toHaveLength(1);
    const previousCommands = commands.length;
    env.GITHUB_ACTIONS = "false";
    await expect(release().stage({ confirmation: commit })).rejects.toThrow(
      "existing staging receipt",
    );
    expect(
      commands
        .slice(previousCommands)
        .some((command) => command.includes("ready") || command.includes("pack")),
    ).toBe(false);
  });

  it("blocks reruns and new dispatches after a prior upload-capable job", async () => {
    await release().check();
    env.GITHUB_RUN_ATTEMPT = "2";
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("Do not rerun staging");
    env.GITHUB_RUN_ATTEMPT = "1";
    githubRequest.mockResolvedValueOnce({
      total_count: 1,
      workflow_runs: [{ id: 100, head_sha: commit }],
    });
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("prior staging attempt exists");
    expect(stageCommands()).toEqual([]);
  });

  it("does not treat incomplete history or API errors as permission to stage again", async () => {
    await release().check();
    githubRequest.mockResolvedValueOnce({ total_count: 101, workflow_runs: [] });
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("inspection bound");
    githubRequest.mockRejectedValueOnce(new Error("GitHub unavailable"));
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("GitHub unavailable");
    expect(stageCommands()).toEqual([]);
  });

  it("also blocks a new main SHA while an older staging release is unfinished", async () => {
    await release().check();
    gitState.history.set("b".repeat(40), new Map(gitState.history.get(commit)));
    githubRequest.mockResolvedValueOnce({
      total_count: 1,
      workflow_runs: [{ id: 100, head_sha: "b".repeat(40) }],
    });
    await expect(
      release().stage({ confirmation: commit, verifiedArtifacts: true }),
    ).rejects.toThrow("do not upload again or substitute a newer main SHA");
    expect(stageCommands()).toEqual([]);
  });

  it("permits the next release only after all prior tags and releases prove finalization", async () => {
    const plan = await release().check();
    const previous = "b".repeat(40);
    gitState.history.set(previous, new Map(gitState.history.get(commit)));
    for (const entry of plan.packages) {
      const tag = `${entry.name}@${entry.version}`;
      remoteTags.set(tag, previous);
      remoteReleases.set(tag, {
        tag_name: tag,
        target_commitish: previous,
        draft: false,
        prerelease: false,
      });
    }
    githubRequest.mockResolvedValueOnce({
      total_count: 1,
      workflow_runs: [{ id: 100, head_sha: previous }],
    });
    await release().stage({ confirmation: commit, verifiedArtifacts: true });
    expect(stageCommands()).toHaveLength(5);
  });

  it.each(["missing-release", "wrong-version", "unrelated-target", "wrong-manifest"])(
    "blocks staging with %s in prior independent-release metadata",
    async (change) => {
      const plan = await release().check();
      const previous = "b".repeat(40);
      gitState.history.set(previous, new Map(gitState.history.get(commit)));
      for (const entry of plan.packages) {
        const tag = `${entry.name}@${entry.version}`;
        remoteTags.set(tag, previous);
        remoteReleases.set(tag, {
          tag_name: tag,
          target_commitish: "main",
          draft: false,
          prerelease: false,
        });
      }
      const last = plan.packages.at(-1);
      const lastTag = `${last.name}@${last.version}`;
      if (change === "missing-release" || change === "wrong-version")
        remoteReleases.delete(lastTag);
      if (change === "wrong-version")
        remoteReleases.set(`${last.name}@0.0.9`, {
          tag_name: `${last.name}@0.0.9`,
          draft: false,
          prerelease: false,
        });
      if (change === "unrelated-target" || change === "wrong-manifest")
        remoteTags.set(lastTag, "c".repeat(40));
      if (change === "wrong-manifest") {
        const wrong = new Map(gitState.history.get(commit));
        const manifest = JSON.parse(wrong.get(last.directory));
        manifest.version = "0.0.9";
        wrong.set(last.directory, JSON.stringify(manifest));
        gitState.history.set("c".repeat(40), wrong);
      }
      githubRequest.mockResolvedValueOnce({
        total_count: 1,
        workflow_runs: [{ id: 100, head_sha: previous }],
      });
      await expect(
        release().stage({ confirmation: commit, verifiedArtifacts: true }),
      ).rejects.toThrow();
      expect(stageCommands()).toEqual([]);
    },
  );

  it("never builds or tests in the OIDC workflow", async () => {
    await expect(release().stage({ confirmation: commit })).rejects.toThrow(
      "must use preverified artifacts",
    );
    expect(commands.some((command) => command.includes("ready") || command.includes("pack"))).toBe(
      false,
    );
  });
});

describe("cross-run source binding and no-upload finalization", () => {
  it("selects exactly one immutable artifact from the selected owner-run attempt", async () => {
    await expect(finalization().source(finalizationOptions())).resolves.toEqual({
      runId: 100,
      attempt: 1,
      artifactId: 123,
      sourceConclusion: "success",
    });
    expect(
      githubRequest.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
    ).toBe(true);
    expect(stageCommands()).toEqual([]);
  });

  it("uses the scoped GitHub token only in HTTPS headers and fails closed on API authorization errors", async () => {
    finalization();
    const fetchMock = vi.fn(async (url, options) => {
      expect(url).toMatch(/^https:\/\/api\.github\.com\/repos\/jordan-a-young\/little-jay\//);
      expect(options.headers.Authorization).toBe(`Bearer ${env.GITHUB_TOKEN}`);
      return Response.json({ privateMessage: "must not be logged" }, { status: 403 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const guarded = createRelease({ root, env, execute, lookup });
    await expect(guarded.source(finalizationOptions())).rejects.toThrow(
      "GitHub release metadata request failed (403)",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(commands)).not.toContain(env.GITHUB_TOKEN);
    expect(stageCommands()).toEqual([]);
  });

  it.each([
    ["path", ".github/workflows/ci.yml"],
    ["run_attempt", 2],
    ["head_branch", "other"],
    ["head_sha", "b".repeat(40)],
    ["event", "push"],
    ["status", "in_progress"],
    ["actor", { login: "other" }],
    ["triggering_actor", { login: "other" }],
    ["repository", { full_name: "another/repository" }],
  ])("rejects mismatched source %s metadata", async (key, value) => {
    sourceRun[key] = value;
    await expect(finalization().source(finalizationOptions())).rejects.toThrow();
  });

  it("requires an explicit reconciliation decision for failed staging, but never waives verification", async () => {
    sourceRun.conclusion = "failure";
    sourceJobs.jobs[1].conclusion = "failure";
    await expect(finalization().source(finalizationOptions())).rejects.toThrow(
      "explicit failed-stage reconciliation",
    );
    await expect(
      finalization().source({ ...finalizationOptions(), reconcileFailed: true }),
    ).resolves.toMatchObject({ sourceConclusion: "failure" });
    sourceJobs.jobs[0].conclusion = "failure";
    await expect(
      finalization().source({ ...finalizationOptions(), reconcileFailed: true }),
    ).rejects.toThrow("verification did not succeed");
  });

  it.each([
    "expired",
    "name",
    "run",
    "sha",
    "duplicate",
    "bound",
    "created-before",
    "created-after",
    "created-during-upload",
    "timestamp-missing",
  ])("rejects source artifact %s mismatch", async (change) => {
    if (change === "expired") sourceArtifact.expired = true;
    if (change === "name") sourceArtifact.name = "verified-npm-release-2";
    if (change === "run") sourceArtifact.workflow_run.id = 999;
    if (change === "sha") sourceArtifact.workflow_run.head_sha = "b".repeat(40);
    if (change === "created-before") sourceArtifact.created_at = "2026-11-07T23:59:00Z";
    if (change === "created-after") sourceArtifact.created_at = "2026-11-08T00:01:30Z";
    if (change === "timestamp-missing") delete sourceArtifact.created_at;
    if (change === "created-during-upload") {
      sourceArtifact.created_at = "2026-11-08T00:02:30Z";
      sourceJobs.jobs[0].completed_at = "2026-11-08T00:03:00Z";
    }
    if (change === "duplicate" || change === "bound") {
      const original = githubRequest.getMockImplementation();
      githubRequest.mockImplementation((pathname, options) =>
        pathname.includes("/artifacts?")
          ? {
              total_count: change === "bound" ? 101 : 2,
              artifacts: [sourceArtifact, { ...sourceArtifact, id: 999 }],
            }
          : original(pathname, options),
      );
    }
    await expect(finalization().source(finalizationOptions())).rejects.toThrow();
  });

  it("blocks finalization until every approved registry integrity matches", async () => {
    await release().check();
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "Await npm approval",
    );
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(stageCommands()).toEqual([]);
  });

  it("checks the exact source artifact ID and all hashes in both finalization phases", async () => {
    const plan = await release().check();
    lookup.mockResolvedValue(true);
    env.RELEASE_ARTIFACT_ID = "999";
    await expect(finalization().verifyFinalization(finalizationOptions())).rejects.toThrow(
      "Downloaded artifact differs",
    );
    env.RELEASE_ARTIFACT_ID = "123";
    plan.packages[0].directory = "../../outside";
    await writeFile(path.join(root, ".release/verified.json"), JSON.stringify(plan));
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow();
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("performs no-upload verification without creating tags or releases", async () => {
    await release().check();
    lookup.mockResolvedValue(true);
    await finalization().verifyFinalization(finalizationOptions());
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("finalizes exact-commit metadata only after all five packages are confirmed, and is retryable", async () => {
    await release().check();
    lookup.mockResolvedValue(true);
    const report = await finalization().finalize(finalizationOptions());
    expect(report.completedTags).toHaveLength(5);
    expect(remoteTags.size).toBe(5);
    expect(remoteReleases.size).toBe(5);
    expect([...remoteTags.values()].every((target) => target === commit)).toBe(true);
    expect(
      [...remoteReleases.values()].every(
        (entry) => entry.target_commitish === commit && !entry.draft && !entry.prerelease,
      ),
    ).toBe(true);
    expect(stageCommands()).toEqual([]);
    expect(publishCommands()).toEqual([]);
    githubRequest.mockClear();
    await finalization().finalize(finalizationOptions());
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("preserves historical metadata across a UI-only second release and permits subsequent staging", async () => {
    const originalGithub = githubRequest.getMockImplementation();
    let history = [{ id: 100, head_sha: commit }];
    githubRequest.mockImplementation((pathname, options) => {
      if (pathname.startsWith("actions/workflows/publish.yml/runs?"))
        return { total_count: history.length, workflow_runs: history };
      if (pathname === `actions/runs/${sourceRun.id}/attempts/1`) return sourceRun;
      if (pathname === `actions/runs/${sourceRun.id}/artifacts?per_page=100`)
        return { total_count: 1, artifacts: [sourceArtifact] };
      return originalGithub(pathname, options);
    });
    env.GITHUB_RUN_ID = "100";
    const first = await release().check();
    await release().stage({ confirmation: commit, verifiedArtifacts: true });
    lookup.mockResolvedValue(true);
    await finalization().finalize(finalizationOptions());
    const historicalTags = new Map(remoteTags);
    const historicalReleases = new Map(remoteReleases);

    const secondCommit = "b".repeat(40);
    await mutateManifest("ui", (manifest) => {
      manifest.version = "0.5.1";
    });
    await writeFile(
      path.join(root, "packages/ui/CHANGELOG.md"),
      "# UI\n\n## 0.5.1\n\nImprove UI.\n\n## 0.5.0\n\nInitial release\n",
    );
    await rm(path.join(root, ".release"), { recursive: true });
    gitState.head = secondCommit;
    gitState.remote = `${secondCommit}\trefs/heads/main`;
    env.GITHUB_SHA = secondCommit;
    env.GITHUB_RUN_ID = "200";
    env.GITHUB_WORKFLOW_REF =
      "jordan-a-young/little-jay/.github/workflows/publish.yml@refs/heads/main";
    history = [{ id: 200, head_sha: secondCommit }, ...history];
    sourceRun.id = 200;
    sourceRun.head_sha = secondCommit;
    sourceArtifact.workflow_run = { id: 200, head_sha: secondCommit };
    const second = await release().check();
    lookup.mockImplementation(async (entry) => entry.name !== "@littlejay/ui");
    commands.length = 0;
    await release().stage({ confirmation: secondCommit, verifiedArtifacts: true });
    expect(stageCommands()).toHaveLength(1);
    lookup.mockResolvedValue(true);
    githubRequest.mockClear();
    const report = await finalization().finalize({
      confirmation: secondCommit,
      sourceRun: "200",
      sourceAttempt: "1",
    });
    expect(report.completedTags).toContain("@littlejay/ui@0.5.1");
    expect(remoteTags.get("@littlejay/ui@0.5.1")).toBe(secondCommit);
    expect(
      githubRequest.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(2);
    for (const [tag, target] of historicalTags) {
      expect(remoteTags.get(tag)).toBe(target);
      expect(remoteReleases.get(tag)).toEqual(historicalReleases.get(tag));
    }
    expect(
      first.packages.filter((entry) => entry.name !== "@littlejay/ui").map((entry) => entry.sha512),
    ).toEqual(
      second.packages
        .filter((entry) => entry.name !== "@littlejay/ui")
        .map((entry) => entry.sha512),
    );

    const thirdCommit = "c".repeat(40);
    await rm(path.join(root, ".release"), { recursive: true });
    gitState.head = thirdCommit;
    gitState.remote = `${thirdCommit}\trefs/heads/main`;
    env.GITHUB_SHA = thirdCommit;
    env.GITHUB_RUN_ID = "300";
    env.GITHUB_WORKFLOW_REF =
      "jordan-a-young/little-jay/.github/workflows/publish.yml@refs/heads/main";
    history = [{ id: 300, head_sha: thirdCommit }, ...history];
    await release().check();
    commands.length = 0;
    const secondRelease = remoteReleases.get("@littlejay/ui@0.5.1");
    remoteReleases.delete("@littlejay/ui@0.5.1");
    await expect(
      release().stage({ confirmation: thirdCommit, verifiedArtifacts: true }),
    ).rejects.toThrow("prior staging attempt exists");
    expect(stageCommands()).toEqual([]);
    remoteReleases.set("@littlejay/ui@0.5.1", secondRelease);
    await release().stage({ confirmation: thirdCommit, verifiedArtifacts: true });
    expect(stageCommands()).toEqual([]);
  });

  it("rejects conflicting existing tags before making any remote writes", async () => {
    const plan = await release().check();
    lookup.mockResolvedValue(true);
    const last = plan.packages.at(-1);
    remoteTags.set(`${last.name}@${last.version}`, "b".repeat(40));
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "Existing tag targets another commit",
    );
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("repairs a missing historical tag at its verified target without creating local tags at HEAD", async () => {
    const first = await release().check();
    const historical = "b".repeat(40);
    gitState.history.set(historical, new Map(gitState.history.get(commit)));
    const entry = first.packages[0];
    const tag = `${entry.name}@${entry.version}`;
    remoteTags.set(tag, historical);
    const plan = await release().check();
    expect(plan.packages[0].metadataCommit).toBe(historical);
    expect(plan.packages.slice(1).every((candidate) => candidate.metadataCommit === commit)).toBe(
      true,
    );
    remoteTags.delete(tag);
    lookup.mockResolvedValue(true);
    await finalization().finalize(finalizationOptions());
    expect(remoteTags.get(tag)).toBe(historical);
    expect(remoteReleases.get(tag).target_commitish).toBe(historical);
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("rejects a historical tag moved after verification even to another matching-version ancestor", async () => {
    const first = await release().check();
    const entry = first.packages[0];
    const tag = `${entry.name}@${entry.version}`;
    const original = "b".repeat(40);
    const moved = "c".repeat(40);
    gitState.history.set(original, new Map(gitState.history.get(commit)));
    gitState.history.set(moved, new Map(gitState.history.get(commit)));
    remoteTags.set(tag, original);
    await release().check();
    remoteTags.set(tag, moved);
    lookup.mockResolvedValue(true);
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "Existing tag targets another commit",
    );
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it("rejects a mismatched registry hash during finalization, not just during staging", async () => {
    const plan = await release().check();
    finalization();
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
    const guarded = createRelease({ root, env, execute, githubRequest });
    await expect(guarded.finalize(finalizationOptions())).rejects.toThrow(
      "Existing npm artifact differs",
    );
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  });

  it.each([401, 403, 500])(
    "does not treat registry HTTP %i as absence or approval",
    async (status) => {
      await release().check();
      finalization();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({}, { status })),
      );
      const guarded = createRelease({ root, env, execute, githubRequest });
      await expect(guarded.finalize(finalizationOptions())).rejects.toThrow(
        "Unable to confirm registry status",
      );
      expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(
        false,
      );
    },
  );

  it.each(["draft", "prerelease"])(
    "preserves conflicting existing %s metadata rather than overwriting it",
    async (flag) => {
      const plan = await release().check();
      lookup.mockResolvedValue(true);
      const entry = plan.packages[0];
      const tag = `${entry.name}@${entry.version}`;
      remoteTags.set(tag, commit);
      remoteReleases.set(tag, { tag_name: tag, draft: false, prerelease: false, [flag]: true });
      await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
        "manual reconciliation",
      );
      expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(
        false,
      );
    },
  );

  it("rechecks artifact hashes after the first no-upload verification", async () => {
    const plan = await release().check();
    let reads = 0;
    lookup.mockImplementation(async () => {
      if (++reads === 5)
        await writeFile(path.join(root, ".release", plan.packages[0].filename), "tampered");
      return true;
    });
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "Artifact changed",
    );
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("fails closed if main moves between registry verification and metadata writes", async () => {
    await release().check();
    let reads = 0;
    lookup.mockImplementation(async () => {
      if (++reads === 5) gitState.remote = `${"b".repeat(40)}\trefs/heads/main`;
      return true;
    });
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "current origin/main",
    );
    expect(githubRequest.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(commands.some((command) => command.includes("git-tag"))).toBe(false);
  });

  it("recovers missing metadata after a partial GitHub failure without retagging", async () => {
    await release().check();
    lookup.mockResolvedValue(true);
    const original = githubRequest.getMockImplementation();
    let releaseCalls = 0;
    githubRequest.mockImplementation((pathname, options) => {
      if (pathname === "releases" && ++releaseCalls === 2) throw new Error("GitHub unavailable");
      return original(pathname, options);
    });
    await expect(finalization().finalize(finalizationOptions())).rejects.toThrow(
      "GitHub unavailable",
    );
    expect(remoteTags.size).toBe(2);
    expect(remoteReleases.size).toBe(1);
    githubRequest.mockImplementation(original);
    await finalization().finalize(finalizationOptions());
    expect(remoteTags.size).toBe(5);
    expect(remoteReleases.size).toBe(5);
    expect(stageCommands()).toEqual([]);
  });
});

it("keeps workflows manual-only for staging and isolates OIDC from finalization", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/publish.yml", import.meta.url),
    "utf8",
  );
  const [verify, publish] = workflow.split("\n  stage:");
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
  expect(publish).not.toContain("contents: write");
  expect(publish).toContain("pnpm release:stage --verified-artifacts");
  expect(publish).not.toContain("changesets/action/publish");
  expect(publish).not.toContain("git-tag");
  expect(publish).toContain("github.repository == 'jordan-a-young/little-jay'");
  expect(publish).toContain("github.ref == 'refs/heads/main'");
  expect(publish).toContain("github.actor == 'jordan-a-young'");
  expect(publish).toContain("github.triggering_actor == 'jordan-a-young'");
  expect(publish).toContain("\n    environment: npm-publish\n");
  expect(publish).toContain("artifact-ids: ${{ needs.verify.outputs.artifact-id }}");
  expect(publish).toContain("--frozen-lockfile --ignore-scripts");
  expect(publish).not.toContain("pnpm ready");
  expect(publish).not.toMatch(/^\s+cache:\s*(?!false\b)\S+/m);
  expect(publish).toContain("package-manager-cache: false");
  expect(workflow).not.toContain("NPM_TOKEN");
  expect(workflow).toContain("github.run_attempt");
  const finalizeWorkflow = await readFile(
    new URL("../.github/workflows/finalize-release.yml", import.meta.url),
    "utf8",
  );
  expect(finalizeWorkflow).toContain("workflow_dispatch:");
  expect(finalizeWorkflow).not.toMatch(/\n  (push|pull_request|workflow_run):/);
  expect(finalizeWorkflow).not.toContain("id-token: write");
  expect(finalizeWorkflow).not.toContain("release:stage");
  expect(finalizeWorkflow).toContain("pnpm release:verify-finalization");
  expect(finalizeWorkflow).toContain("pnpm release:finalize");
  expect(finalizeWorkflow).toContain("group: littlejay-npm-publication");
  expect(finalizeWorkflow).toContain("artifact-ids: ${{ needs.verify.outputs.artifact-id }}");
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  expect(manifest.scripts["release:publish"]).toBeUndefined();
  const versionWorkflow = await readFile(
    new URL("../.github/workflows/release-pr.yml", import.meta.url),
    "utf8",
  );
  expect(versionWorkflow).toContain("verify-release-pr:");
  expect(versionWorkflow).not.toContain("id-token: write");
  expect(versionWorkflow).not.toContain("release:publish");
});

it.each(["ci.yml", "secrets.yml", "release-pr.yml", "publish.yml", "finalize-release.yml"])(
  "%s pins Node 24 actions while preserving explicit project Node and cache settings",
  async (filename) => {
    const workflow = await readFile(
      new URL(`../.github/workflows/${filename}`, import.meta.url),
      "utf8",
    );
    const actionReferences = [
      ...workflow.matchAll(
        /uses: (actions\/checkout|actions\/setup-node|pnpm\/action-setup)@(\S+)/g,
      ),
    ];
    const expectedRevisions = {
      "actions/checkout": "fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",
      "actions/setup-node": "a0853c24544627f65ddf259abe73b1d18a591444",
      "pnpm/action-setup": "fc06bc1257f339d1d5d8b3a19a8cae5388b55320",
    };
    expect(actionReferences.length).toBeGreaterThanOrEqual(2);
    for (const [, action, revision] of actionReferences) {
      expect(revision).toBe(expectedRevisions[action]);
    }
    const nodeSetupSteps = workflow
      .split(/\n      - /)
      .filter((step) => step.startsWith("uses: actions/setup-node@"));
    expect(nodeSetupSteps.length).toBeGreaterThan(0);
    for (const step of nodeSetupSteps) {
      expect(step).toContain("node-version-file: .node-version");
      expect(step).toContain("package-manager-cache: false");
    }
    if (filename === "ci.yml") {
      expect(workflow).toContain("cache: pnpm");
    } else {
      expect(workflow).not.toMatch(/^\s+cache:\s*(?!false\b)\S+/m);
    }
  },
);
