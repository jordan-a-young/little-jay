import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const binary = fileURLToPath(new URL("../.tools/actionlint", import.meta.url));
const validation = spawnSync(binary, ["-shellcheck=", "-pyflakes="], {
  cwd: workspace,
  stdio: "inherit",
  timeout: 30_000,
});

if (validation.error || validation.status === null) {
  console.error(
    "Workflow validator unavailable or failed to run. Run pnpm workflows:install; refusing to proceed.",
  );
}
process.exitCode = validation.status ?? 1;
