# Independent release metadata targets

Verified 2026-11-08. For release finalization, follow `docs/RELEASING.md` and `scripts/AGENTS.md`.

- An all-package integrity gate does not imply every version belongs to the newest release commit. Original verification must bind each version’s tag target; unchanged versions retain historical targets. See `scripts/release.mjs` metadataCommit/finalize and the A → UI-only B → C regression in `scripts/release.test.mjs`.
- Do not reintroduce broad Changesets `git-tag` into this flow: it can recreate a missing historical version tag at HEAD. Exact-target API repair avoids that side effect; the isolated real-Git test covers annotated-tag peeling and snapshot binding.
- Exact current source-artifact provenance and bounded historical repository-metadata reconciliation are different guarantees. The runbook documents this distinction; do not describe ancestral matching-version history as reauthentication of an expired artifact.
