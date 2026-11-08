# Library releases

## Status and boundaries

Five libraries use the public npm release setup under `@littlejay`: brand, tokens, UI, HTTP and server. Their initial generated version is `0.1.0`. The repository root, playground and API remain private at `0.0.0`. Versions are independent, with no fixed/linked groups. [PKG-004](BACKLOG.md#pkg-004-initial-npm-bootstrap) records owner-reported initial bootstrap completion on 2026-11-06; that report did not independently verify registry availability or trusted-publisher activation. Do not repeat bootstrap just because propagation is pending.

Changesets CLI **3.0.3** owns versions and changelogs; Changesets Action **2.1.2**, pinned by commit, opens release PRs. pnpm **12.18.0** installs, builds, packs and stages verified tarballs. GitHub metadata finalization uses per-package, verified-SHA API operations after all five registry integrities match. Do not combine Changesets with pnpm's separate native versioning engine. The existing ESM release script/test boundary is retained; no runtime/tooling migration is required.

The owner made the source repository public on 2026-11-06 and approved including branding in this release setup. Public source and npm packages are downloadable by everyone, but publication does not relicense branding artwork under MIT. Preserve reserved-rights statements and font notices; see [publication/rights policy](PUBLISHING.md).

## Everyday change notes

Run `pnpm changeset` for a consumer-visible library change. Select only affected packages and write the resulting `.changeset/*.md` note alongside the implementation. Explain compatibility/migration requirements, not just the internal task. Tests, maintainer docs and private-app-only changes normally need no changeset; record that decision rather than forcing an empty release.

- Patch: compatible fixes.
- Minor: features; before 1.0, also explicitly labeled breaking changes with migration guidance.
- From 1.0 onward: breaking changes require major versions.
- Root and runnable apps are never published or versioned by Changesets.
- This path supports stable versions and npm's `latest` tag only. Prerelease/`next` support requires a separately reviewed extension.

`pnpm release:validate` parses all pending notes with the Changesets parser and checks that targets are among the five libraries and bumps are patch, minor or major. The readiness/CI gate runs it first. No notes and explicitly empty notes are valid. Validation needs no Git history/registry access and changes no release files.

`pnpm release:status` previews the plan. `pnpm release:version` consumes notes, generates versions/changelogs, regenerates `pnpm-lock.yaml` with pnpm and formats release files. It never commits, tags, pushes or uploads; review its diff and avoid unrelated uncommitted work.

## Release PR automation

`.github/workflows/release-pr.yml` runs on main pushes or manual dispatch. Pending changesets produce a draft `changeset-release/main` PR through Changesets; without notes it does nothing. Merging that PR **does not upload or publish**.

Enable GitHub's setting allowing Actions to create PRs separately. The action uses only contents/PR write permissions. GitHub puts ordinary workflows on `GITHUB_TOKEN`-created/updated PRs into an approval-required state: a maintainer selects **Approve workflows to run**. This is separate from making the draft ready and from staging/npm approvals. See [GitHub's trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).

Without waiting for that approval, the read-only `verify-release-pr` job checks out the generated PR, performs frozen installation, installs the pinned scanner and runs `pnpm release:check`. Review its latest result. Main also requires ordinary `verify`/`scan` contexts: approve their runs, or arrange missing checks, rather than bypassing the ruleset. Removing recurring CI approval remains a separate automation/authentication change.

## Nonpublishing verification

`pnpm release:check` validates library names, stable versions, public access, registry/repository metadata, private root/apps, changelog headings and workspace dependencies. It refuses pending notes, runs `pnpm ready` and the history secret scan, then packs the libraries in dependency order into ignored `.release/`.

`verified.json` binds exact tarball filenames and SHA-512 hashes to a clean Git commit; `SHA512SUMS` supports human inspection. Each package also records `metadataCommit`: its existing exact-version tag's peeled commit, or the release commit when no tag exists. Existing tags must be ancestral to the release commit and contain that package's exact name/version. Verification fails on invalid tags or Git errors rather than treating them as absent. Dirty checkouts receive a null commit marker and cannot stage/finalize. `pnpm release:inspect --confirm <SHA>` checks the full artifact set and recorded target shapes against current manifests without commands, uploads or writes. Frozen installation and the pinned scanner are prerequisites for release checking; follow server isolation rules before clean builds. Consumer checks use actual package versions.

## Bootstrap and activation — owner actions, not automatic setup

For genuinely new packages, agree on a separate owner-led bootstrap procedure first. Do not publish dummy packages or placeholders to test this migration: npm staging can itself create a public placeholder for a new name.

Before a staged release:

1. Review the exact main commit, all five real tarballs, names, rights/notices and staged/history secret scans. The owner needs publish access to the `littlejay` npm organization and interactive npm authentication with 2FA. Never send credentials/OTPs to an agent or add an npm token to CI.
2. For **every** npm publisher connection on all five packages, require GitHub owner `jordan-a-young`, repository `little-jay`, workflow **`publish.yml`**, environment **`npm-publish`**, and **stage-only** permissions. Do not enable direct `npm publish` or dist-tag management. Remove/replace broader bypass connections only with owner authorization. If npm requires recreating a connection, preserve its exact identity/environment. New unvalidated connections expire after two days under npm's current policy.
3. Preserve `npm-publish` protections: main only, owner approval, no admin bypass. Owner self-approval is confirmation, not independent two-person review. Review npm maintainers, require 2FA and disallow traditional publishing tokens; GitHub cannot revoke another npm maintainer's access.
4. Merge the reviewed workflow before separately authorizing activation. The legacy-named repository variable **`NPM_PUBLISH_ENABLED=true`** gates staging and GitHub finalization; it no longer grants CI direct npm promotion. Keep it off while settings/rights/bootstrap are unresolved. Editing this setup does not inspect/change npm permissions, change remote activation, dispatch workflows or authorize uploads.

OIDC authenticates stage uploads, not dependency installation. Keep `publish.yml` for the existing environment-bound npm identity. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [staged publishing](https://docs.npmjs.com/staged-publishing/). Provenance/account eligibility requires external runtime evidence, not mocked tests.

## Stage verified release artifacts

After the version PR is merged and activation/staging separately authorized, the owner manually runs **Stage npm packages** (`publish.yml`) on **main** with its exact 40-character SHA. Approve `npm-publish` when the stage job pauses. No ordinary push/PR/tag/release event uploads packages.

- The read-only verify job performs frozen installation, full CI, history scanning and packing. **`verified-npm-release-<attempt>`**, retained for 30 days, contains the original tarballs, `verified.json` and `SHA512SUMS`.
- Only staging has OIDC, with read-only contents/Actions access. It downloads the exact same-run artifact ID, disables install scripts/caches and checks the full package set and every hash. No rebuilds, tests, public promotion, npm approvals or tags run there.
- Clean main, exact SHA and expected origin are checked again after environment approval. The origin must be exactly `https://github.com/jordan-a-young/little-jay.git` or its HTTPS form without `.git`; synchronization queries exact `refs/heads/main`. Root/apps remain private. Existing public versions are skipped only when registry integrity matches; errors are not absence.
- `pnpm stage publish <verified-tarball> --json` stages brand/tokens, HTTP/server, then UI, with lifecycle scripts disabled and registry-availability waiting set to zero. Staged versions intentionally are not installable. pnpm's package-name-keyed JSON supplies `name`, `version`, `filename`, `integrity` and `stageId`; all values and unique UUIDs are validated.
- `.release/staging.json` records source run/attempt/verified-artifact ID and per-package `not-attempted`, `attempting`, `staged`, `already-published` or `unknown` states. Persist `attempting` before each upload; nonzero exits or invalid responses leave uncertainty. **`npm-staging-report-<attempt>`** is retained after failures when the runner can upload it.

**Do not rerun staging.** Upload-capable attempt 1 is the only supported automated attempt. New dispatches reject unfinished prior upload-capable staging, even at another main SHA. Reconciliation reads each prior commit's exact five package versions from Git, then requires those exact tags and non-draft/non-prerelease GitHub releases. Each tag must be ancestral to that prior commit and contain the matching package name/version; unchanged packages may retain earlier targets. This is repository-metadata reconciliation under the trusted-maintainer model, not a reauthentication of expired historical artifacts or their original target snapshots. Run/job history inspection is bounded to 100 entries and fails closed beyond the bound; extend audited pagination rather than bypassing it when needed.

## Review and approve on npm

Staging is not publication. A maintainer reviews and approves the actual packages with interactive 2FA; see [npm's guide](https://docs.npmjs.com/staged-publishing/).

1. Preserve the source run ID, exact attempt (normally **1**), immutable verified artifact and receipt. From the original artifact directory, run `sha512sum --check SHA512SUMS` or the platform-equivalent SHA-512 tool. `release:inspect` checks artifacts placed in `.release/` against the matching checkout without writes.
2. In your own npm session, inspect each exact stage ID on npm or with `pnpm stage view <stage-id>`. `pnpm stage download <stage-id>` writes its archive locally: compare SHA-512 to the original verified archive, not just name/version. Inspect contents, provenance and notes. Stage read/approval operations cannot use CI OIDC.
3. Approve reviewed stages in dependency order on npm, or run `pnpm stage approve <reviewed-stage-id> ...` from the matching workspace. pnpm 12 supports multiple explicit IDs with an interactive OTP session and dependency ordering. Never put an OTP in workflow inputs, repository files or agent messages. Already-published matching packages need no new approval.

**Keep main pinned from staging through finalization.** If it advances, stop and agree on recovery; do not substitute the newer SHA or relax synchronization guards. Approvals are not atomic across five packages: approve dependencies before UI and retain partial-progress evidence.

## Finalize approved release metadata

After all five versions are public and propagated, manually run **Finalize approved npm release** (`finalize-release.yml`) on main with:

- **commit**: the same exact release SHA.
- **source_run**: the staging run ID.
- **source_attempt**: the precise original attempt, normally `1`, even if someone later reran that run.
- **reconcile_failed**: normally `false`; enable only for explicitly reviewed failed-staging recovery below.

The read-only job authenticates source repository/workflow/event/branch/SHA, original and selected-attempt actors, completion status, successful verification job and one exact, non-expired, attempt-specific artifact ID. GitHub timestamps must place artifact creation inside the verification job and before upload-job execution, rejecting replacement artifacts created by the later job. Normal completion also requires a successful staging job. It downloads that immutable original artifact into a data-only directory and checks every tarball plus all five public registry integrities. Missing approvals, registry or GitHub API failures, expired or missing artifacts, ambiguous evidence, or mismatches stop before metadata writes.

The protected finalization job has contents write/Actions read, **no OIDC or npm credentials**, and no install scripts/caches. After environment approval it repeats provenance/artifact/registry/current-main checks. GitHub `@littlejay/name@version` refs/releases use each package's original verified `metadataCommit`, never a target recomputed from later tags. New versions use the release SHA; unchanged versions preserve their historical targets, and missing historical tags are repaired at those recorded commits. A moved tag conflicts even if its new target is another ancestor with the same version. No local tags are generated: Changesets' broad `git-tag` command would recreate missing historical tags at HEAD. Matching metadata is preserved; conflicting tags/draft releases stop without overwriting. Both workflows share non-canceling concurrency; human approval is outside that lock. No all-package `v0.1.0` tag is created.

All five tarball/registry hashes remain mandatory for independent releases. An unchanged version does not justify ignoring byte differences: README/source/build changes or resolved workspace dependency versions can change its archive. Prepare a legitimate version bump rather than bypassing an integrity mismatch.

`.release/finalization.json` and **`npm-finalization-report-<attempt>`** retain metadata progress. Finalization may be retried after diagnosis: it cannot upload or approve npm packages. Git authentication is command-scoped, API authentication uses HTTPS headers, and neither persists credentials or logs response bodies.

## Local staging and partial-failure recovery

The old direct `release:publish` command is removed. Separately authorized local staging requires the owner's interactive authentication and clean synchronized main:

```sh
LITTLEJAY_PUBLISH_ENABLED=true pnpm release:stage --confirm <exact-40-character-main-SHA>
```

This verifies before staging, never public promotion or tags. `--verified-artifacts` is reserved for the exact GitHub staging workflow. Existing receipts block another local upload; a dry-run is not an authenticated staging test.

Automatic partial staging resume is deliberately unsupported. Timeouts, malformed or missing receipts can mean npm accepted an unapproved stage. **Registry 404 does not prove no stage exists.** A hard runner termination can prevent even the `always()` report upload. Preserve original verified artifacts and inspect npm before another upload. Never force, overwrite, unpublish, restage blindly or invent a version.

The owner reconciles known/unknown outcomes through human-authenticated npm stage list/view/download and exact hashes. Approve matching existing stages; stage genuinely unattempted packages only from original verified tarballs after separately authorizing recovery. If an unknown outcome cannot be established, artifacts expire or main advances, stop and agree on recovery. Never edit a failed receipt to appear successful.

Once all five exact artifacts are public, **reconcile_failed=true** permits no-upload finalization from the failed source run's successful verification job and original attempt-specific artifact. Actor/commit/artifact/hash/registry checks remain; the failed source status is recorded, not converted to success. Pre-migration runs without attempt-qualified artifacts are ineligible. No npm approval is automated.

## Checks for release-tooling changes

Use `pnpm test scripts/release.test.mjs` for real-parser and injected command/registry/GitHub boundaries. Cover valid/unknown/duplicate stage receipts, persistence before uploads, blocked retries, source run/attempt/artifact mismatches, failed-source reconciliation, all-five integrities, sequential independent releases, target snapshots and conflicting/partial/repeated metadata finalization. Real Git history/tag checks run only in disposable fixtures; tests never invoke actual staging, npm authentication/approval, project-repository tags/releases or remote writes. Run frozen installation and `TMPDIR=/tmp/opencode pnpm ready`, validate workflow syntax/permissions/mapped paths, verify version generation in a disposable copy, and obtain independent final review. Browser checks do not apply to release-only changes. npm settings/OIDC/approval behavior remain external verification, not claimed test passes.
