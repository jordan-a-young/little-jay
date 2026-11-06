import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const mode = process.argv[2] ?? "history";
if (!["staged", "history"].includes(mode)) {
  console.error("Usage: node scripts/check-secrets.mjs [staged|history]");
  process.exit(1);
}

const ignored = spawnSync(
  "git",
  ["ls-files", "--cached", "--ignored", "--exclude-standard", "-z"],
  {
    cwd: workspace,
    encoding: "utf8",
  },
);
if (ignored.error || ignored.status !== 0) {
  console.error("Unable to inspect tracked files; secret scan blocked.");
  process.exit(1);
}
if (ignored.stdout.length > 0) {
  console.error(
    "Ignored files are tracked or staged. Remove them from the index before proceeding:",
  );
  for (const filename of ignored.stdout.split("\0").filter(Boolean)) {
    console.error(JSON.stringify(filename));
  }
  process.exit(1);
}

const binary =
  process.env.GITLEAKS_BIN ?? fileURLToPath(new URL("../.tools/gitleaks", import.meta.url));
const arguments_ = [
  "git",
  "--config",
  ".gitleaks.toml",
  "--redact=100",
  "--no-banner",
  "--ignore-gitleaks-allow",
  "--max-decode-depth=2",
  "--max-archive-depth=2",
  ...(mode === "staged" ? ["--pre-commit", "--staged"] : ["--log-opts=--all"]),
  ".",
];
const scan = spawnSync(binary, arguments_, { cwd: workspace, stdio: "inherit" });
if (scan.error) {
  console.error("Secret scanner unavailable. Run pnpm secrets:install; refusing to proceed.");
}
process.exit(scan.status ?? 1);
