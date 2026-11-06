# Release notes

Run `pnpm changeset` when a change affects a published library. Select only affected packages and write a consumer-facing summary, including migration instructions for breaking changes. Documentation-only maintainer changes and tests need no release; record that decision in the PR.

Changesets is the only versioning engine. Do not also run `pnpm version -r` or hand-edit generated changelogs. See [the release runbook](../docs/RELEASING.md) and [agent guidance](AGENTS.md).
