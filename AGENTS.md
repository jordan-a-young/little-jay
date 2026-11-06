# Repository guidance

## Scope and navigation

- Read this file and the applicable `AGENTS.md` files along the path to files you change. Child files add area-specific guidance; do not treat them as permission to bypass repository-wide constraints.
- `apps/` contains runnable examples; `packages/` contains reusable libraries. Read their guidance before editing. Keep application policy out of shared packages.
- Start with `README.md` for setup and architecture. Consult only the relevant contract in `docs/`: `CATALOG.md`, `BRANDING.md`, `PEBBLE-STATES.md`, `HTTP.md`, or `SERVER.md`. `ROADMAP.md` describes future work, not implemented APIs.
- Use [the task-to-file map](docs/REPO-MAP.md) to locate likely owners, source entry points, contracts, and tests before broader searches. It is a starting point, not an exhaustive file inventory or a substitute for checking current code.
- Maintain the map in the same change whenever you add/remove a workspace or task area, move/rename mapped paths, or change ownership, entry points, generators, or test locations. Update affected scoped `AGENTS.md` files too. Verify mapped paths still exist; ordinary implementation edits need no map rewrite when its guidance remains accurate.
- Preserve unfamiliar changes. This directory may have no Git metadata; do not initialize Git, commit, push, publish, or deploy unless requested.

## Bounded troubleshooting

- Before editing, identify the owning workspace, relevant contract, expected behavior, and smallest useful verification command. Keep discovery proportional to the task; reuse established context instead of repeatedly scanning the repository.
- Search explicit first-party paths and inspect bounded results. If a search is too broad or returns nothing, refine the path, symbol, or hypothesis rather than repeatedly dumping the same results or expanding into dependencies/generated output.
- When a focused check fails, inspect its specific error and form a testable hypothesis before changing code or running broader checks. Rerun the affected check after the change; passing a different check does not resolve the failure. Broaden verification once the local issue is understood, or when a broader check is needed to test a concrete hypothesis.
- After two unsuccessful attempts at the same hypothesis, pause and summarize the evidence, what was ruled out, and the next distinct hypothesis. Do not repeat equivalent commands or speculative edits without new evidence. If there is no justified next step, report the blocker rather than continuing to guess.
- Distinguish pre-existing failures from regressions using available baseline evidence; label uncertain causes as unconfirmed. Do not repair unrelated failures, disable checks, or relax assertions merely to get a passing result.
- Stop the blocked part of the task and ask for the specific missing input or authorization when progress requires unavailable credentials/services, out-of-scope dependency changes, or conflicting instructions. Continue independent in-scope work only when safe. Report the exact failing command or symptom, evidence gathered, and smallest next action; do not claim completion while required checks remain blocked.

## Toolchain and dependencies

- Use pnpm exclusively: Node is pinned in `.node-version`, the supported range is in `package.json`, and `packageManager` pins pnpm. Check `node --version` and `pnpm --version` if setup is uncertain. Do not switch package managers or install global tools.
- Install with `pnpm install --frozen-lockfile`. Do not bypass a lockfile mismatch; investigate it. Dependency changes must be within the task's scope.
- Run scripts from the workspace root with `pnpm <script>` or `pnpm --filter @ljay/<name> <script>`. Use `pnpm exec <tool>` for installed tools without a script, not `npx`, `pnpm dlx`, or direct `node_modules/.bin` paths.
- Discover workspace names with `pnpm list -r --depth -1`; inspect direct dependencies with `pnpm --filter @ljay/<name> list --depth 0`; trace a dependency with `pnpm -r why <dependency>`. `pnpm list -r --lockfile-only --depth 0` inspects the lockfile without relying on installed modules. Use `pnpm view <dependency> <field>` for registry metadata when network access is appropriate.
- Search first-party paths explicitly (`apps/`, `packages/`, `scripts/`, `docs/`). Do not recursively search `node_modules`, the pnpm store, `dist`, or `.vite`, or edit dependency/generated files to fix source problems. If a concrete bug requires installed implementation inspection, first identify the exact package/version with pnpm and read only the relevant file.
- For an authorized dependency addition, use `pnpm --filter @ljay/<name> add -E <dependency>` (or `add -DE` for development tools); root tooling uses `pnpm add -DwE <dependency>`. Use `workspace:*` for local packages. Preserve exact-version conventions, the Vite+ Vite override, and the explicit `allowBuilds` list in `pnpm-workspace.yaml`; do not approve new install scripts incidentally.

## Commands and verification

Run these from the root; scripts in `package.json` and `.github/workflows/ci.yml` are authoritative.

Use [the verification matrix](docs/VERIFICATION.md) to select checks for the change type, including build prerequisites and browser/package-consumer triggers. Combine applicable rows; do not use a narrower row to bypass scoped requirements. Keep the matrix current in the same change when scripts, prerequisites, test projects, or verification requirements change.

| Command                                   | Purpose / prerequisite                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                              | Generated-token freshness, formatting, and lint checks; does not fix files                                                     |
| `pnpm build`                              | Dependency-ordered builds; required before standalone typechecks/tests on a fresh checkout                                     |
| `pnpm typecheck`                          | Root tooling and workspace TypeScript                                                                                          |
| `pnpm test`                               | All configured test projects, one run                                                                                          |
| `pnpm test <file-or-path>`                | Focused tests through the root configuration; packages do not have test scripts                                                |
| `TMPDIR=/tmp/opencode pnpm test:packages` | Packs five libraries and tests an isolated consumer; retains temporary artifacts and may need registry access; never publishes |
| `pnpm ready`                              | Full CI gate: check, build, typecheck, tests, and package-consumer checks                                                      |
| `pnpm fmt`                                | Formats in place; prefer `pnpm exec vp fmt <changed-paths>` to avoid unrelated edits                                           |

- Add regression coverage for observable behavior using existing colocated tests. `vite.config.ts` defines Node and jsdom component projects; do not add another test runner.
- For source changes, build prerequisites before focused tests/typechecks. Use `pnpm ready` for final integration verification when practical; report exactly what ran and any failures or skipped checks. Documentation-only changes need formatting/link/command validation, not a full build or dependency install.
- Never hand-edit `dist/`, `.vite/`, `packages/tokens/theme.css`, or `apps/playground/public/branding/`. Change their sources and use the documented generator/build.
- Keep TypeScript/JavaScript ESM and existing module conventions. Prefer descriptive names and async/await; add only editor documentation comments when comments are needed.

## Safety and local services

- Never expose secrets, raw request data, or private diagnostic messages in responses, logs, fixtures, or docs. Do not change public contracts or add dependencies incidentally.
- Secret guards live in `scripts/check-secrets.mjs`, `scripts/install-gitleaks.sh`, `.githooks/`, and `.github/workflows/secrets.yml`; see `docs/PUBLISHING.md`. Install the pinned local scanner with `pnpm secrets:install` and enable hooks per clone with `git config --local core.hooksPath .githooks`. Scan staged additions before commits and all history before pushes; never bypass findings or missing-scanner failures to publish.
- Inspect listeners before starting servers; assign distinct UI/API ports per task. See `apps/AGENTS.md` for isolated startup commands. Never kill an unfamiliar process.
- Stop task-owned development servers before builds or `pnpm ready`: clean builds replace package outputs used by running applications. Preserve other tasks' servers and files.
