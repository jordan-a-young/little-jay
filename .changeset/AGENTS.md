# Changesets

- Read `docs/RELEASING.md` before release work. Use `pnpm changeset` or `pnpm exec changeset add`; agents may write the same Markdown/YAML format noninteractively when the affected packages and bump are established.
- Name only affected libraries under `packages/`; root and runnable apps remain private and unversioned. No fixed/linked version groups are configured.
- Write consumer-facing changes and migration notes, not internal task history. Preserve branding artwork's separate rights; public distribution does not grant a new artwork license.
- Before 1.0, patch means compatible fixes; minor means features or explicitly identified breaking changes. From 1.0, breaking changes require a major. Do not mechanically infer release impact from commit prefixes.
- `pnpm release:version` consumes notes, changes versions/changelogs, regenerates the lockfile and formats release files. It does not commit, tag, push or publish. Do not use pnpm's separate native versioning engine or manually edit generated release files to bypass the plan.
- A changeset, version bump, runbook entry or release PR is not authorization to publish or trigger a workflow. Keep `NPM_PUBLISH_ENABLED` off until the owner explicitly approves bootstrap and activation.
