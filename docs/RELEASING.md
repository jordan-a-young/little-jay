# Library releases

## Status and boundaries

Five libraries use the public npm release setup under `@littlejay`: brand, tokens, UI, HTTP and server. Their initial generated version is `0.1.0`. The repository root, playground and API remain private at `0.0.0`. Versions are independent; there are no fixed/linked groups. On 2026-11-06, the owner reported that the initial publish script had essentially finished and was waiting for registry-cache propagation, and requested treating bootstrap as completed; see [PKG-004](BACKLOG.md#pkg-004-initial-npm-bootstrap). Registry availability and trusted-publisher/workflow activation were not independently verified by that backlog review. Release setup itself did not authenticate, publish, activate remote workflows, change GitHub visibility, or grant additional artwork rights.

Changesets CLI **3.0.3** owns versions and changelogs; Changesets Action **2.1.2**, pinned by commit, opens release PRs and finalizes GitHub tags/releases after successful npm publication. pnpm **12.18.0** installs, builds, packs and publishes. Do not combine Changesets with pnpm's separate native versioning engine.

The owner made the GitHub source repository public on 2026-11-06. Public source and npm packages are downloadable by everyone. Branding artwork retains its reserved-rights statements and font notices; publication does not relicense the artwork under MIT. The owner explicitly approved including branding in this release setup. See [publication/rights policy](PUBLISHING.md).

## Everyday change notes

Run `pnpm changeset` from the root for a consumer-visible library change. Select only affected packages and write the resulting `.changeset/*.md` note alongside the implementation. Explain compatibility/migration requirements, not just the internal task. Tests, maintainer docs and private-app-only changes normally need no changeset; record that decision in review rather than forcing an empty release.

- Patch: compatible fixes.
- Minor: features; before 1.0, also explicitly labeled breaking changes with migration guidance.
- From 1.0 onward: breaking changes require major versions.
- Root and runnable apps are never published or versioned by Changesets.
- This release path supports stable versions and npm's `latest` tag only. Prerelease/`next` support requires a separately reviewed extension, not a flag added ad hoc.

Run `pnpm release:validate` to parse all pending notes with the Changesets parser and check that every target is one of the five libraries and every bump is patch, minor or major. The readiness/CI gate runs it before the other checks. No notes and explicitly empty notes are valid, so documentation/tooling-only changes do not need an artificial release. Validation requires no Git history or registry access and does not modify notes, versions, changelogs or the lockfile.

Use `pnpm release:status` to inspect the proposed release. For local preparation, run `pnpm release:version`: it consumes notes, generates per-package changelogs/versions, regenerates `pnpm-lock.yaml` using pnpm, and formats release files. Review the diff. It does not commit, tag, push or publish; avoid invoking it with unrelated uncommitted work. Generated notes include commit references that may require access to this private source repository.

## Release PR automation

`.github/workflows/release-pr.yml` runs on main pushes or manual dispatch. If pending changesets exist, it creates/updates a draft `changeset-release/main` PR through Changesets. Without notes it does nothing. Merging the PR **does not publish**.

The action uses the built-in GitHub token with only contents/PR write permissions. Enable GitHub's setting allowing Actions to create PRs separately; repository-settings changes are not part of local setup. GitHub creates ordinary PR workflow runs for `GITHUB_TOKEN`-created or updated PRs in an approval-required state; a maintainer with write access must select **Approve workflows to run**. This is separate from marking the draft ready for review and from the protected npm-publication approval. See [GitHub's workflow-trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).

Without waiting for that approval, the workflow explicitly checks out the generated PR in a separate read-only `verify-release-pr` job, runs frozen installation, installs the pinned secret scanner and runs `pnpm release:check`. Review this job's result for the latest release-PR update before merging. Main also requires the ordinary `verify` and `scan` checks; approve their pending runs, or arrange those checks if absent, rather than bypassing the ruleset. The release-specific job does not substitute for those required contexts. Removing the recurring CI approval requires a separately reviewed automation/authentication change; changing draft status or the Node action runtime does not remove it.

## Nonpublishing verification

`pnpm release:check` validates library names, stable versions, public access, registry/repository metadata, private root/apps, current changelog headings and internal dependencies. It refuses pending unversioned notes, runs `pnpm ready` and `pnpm secrets:scan`, then packs the five libraries in dependency order into ignored `.release/`.

`.release/verified.json` binds the exact tarball names and SHA-512 hashes to a clean Git commit. Dirty checkouts may run checks and create local artifacts but receive a null commit marker: they cannot be published. This command never uploads anything, creates tags or accesses npm credentials. Frozen installation and the pinned local scanner are prerequisites. Follow server isolation rules before clean builds. Package-consumer tests derive filenames/overrides from each manifest and verify actual tarballs, not hardcoded `0.0.0` versions.

## Bootstrap and activation — owner actions, not automatic setup

The initial bootstrap procedure is retained below for reference; PKG-004 records owner-reported completion. Do not repeat publication merely because registry-cache propagation is pending. Trusted-publisher configuration and activation still require separate authorization and are not confirmed by that report.

Before the first publication:

1. Review the exact release commit, public tarball contents, package names and brand rights/notices. Confirm all five package names are available and the npm account has publish access to the `littlejay` organization. Keep secrets out of the commit; run the staged/history scan gates under the publication policy.
2. Merge reviewed version/release setup through the agreed Git workflow. Keep the release SHA pinned. Install the pinned Node/pnpm versions, use frozen installation, and keep the checkout clean and synchronized with the intended origin's `main`.
3. Authenticate interactively to npm using the owner's account with 2FA. Do not send credentials or OTPs to an agent, store them in repository files, or add a long-lived CI npm token.
4. Separately authorize the initial local publication of the **real initial versions** with the local publish command below. New packages must exist before their npm trusted-publisher settings can be configured. Do not publish dummy/stub packages as a test. The release-setup implementation did not perform bootstrap; subsequent owner-reported completion is recorded under PKG-004.
5. For **each** package on npm, configure a GitHub Actions trusted publisher: GitHub owner `jordan-a-young`, repository `little-jay`, workflow filename `publish.yml`, environment **`npm-publish`**. The environment binding is required: a workflow-file restriction alone is not the approval gate. Permit direct `npm publish`/pnpm publication; newly created configurations may otherwise allow only staged publishing. Use GitHub-hosted runners. Configure near the first intended OIDC release: npm's current policy expires new, unvalidated trusted-publisher connections after two days.
6. Before activation, merge the protected-environment workflow and audit **every** trusted-publisher connection on all five packages, not just one connection per package: no additional unrestricted workflow/provider connection may bypass the gate. Existing connections cannot be edited; the owner must replace broader connections with environment-bound ones. Review npm organization/package maintainers, require 2FA and disallow traditional publishing tokens. GitHub protection cannot revoke another npm maintainer's direct access. Then, only after separate activation approval, set GitHub repository variable **`NPM_PUBLISH_ENABLED=true`**. It is explicitly `false` after the public-repository hardening. Do not enable it merely because CI passes. Leave it off if bootstrap, rights or permissions are unresolved. No npm token secret is needed.

Trusted publishing authenticates CI with short-lived OIDC credentials. It does not authenticate dependency installation. Our dependencies are publicly readable. npm provenance attestations were unavailable while the source repository was private. Public visibility now makes provenance eligible, but this hardening does not change or verify attestation behavior and no `--provenance` flag is forced. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for current requirements and limits.

## Manual GitHub publishing

After the release PR is reviewed/merged and activation is explicitly authorized, `jordan-a-young` may manually dispatch **Publish npm packages** on **main**, supplying that exact 40-character commit SHA. Both the original actor and rerun actor must be that owner; other actors or refs are skipped before verification. The workflow rejects missing activation, mismatched SHA or main moving since dispatch. It never publishes on an ordinary push, PR, GitHub release event or tag creation.

The publish job must use the GitHub **`npm-publish`** environment. Its live protection allows only the `main` branch (not tags), requires `jordan-a-young` approval and disallows admin bypass. Self-review remains allowed so the sole maintainer can approve their own deliberate release; this is an owner confirmation, not independent two-person approval. PR #9 merged the protected-environment workflow; subsequent read-only checks confirmed its main-branch wiring and the environment protections, with publication still disabled. The owner confirmed the npm-side checklist under SEC-001 in the [local record](BACKLOG.md#sec-001-protect-public-main-actions-and-npm-publication); those account settings were not independently inspected or changed through GitHub. Recheck the prerequisites before separately authorized activation/publication.

- The read-only verify job uses frozen installation, the full gate and a history secret scan, then uploads verified tarballs and their commit/hash record.
- The publish job alone has `id-token: write`; it downloads that same run's exact artifact ID, installs tooling with lifecycle scripts disabled and no restored cache, and checks the complete artifact set before the first upload. It does not rebuild or rerun application/test code with OIDC permissions.
- The script checks a clean, synchronized main, expected origin, confirmation SHA, allowlist and every tarball hash. The origin must be exactly `https://github.com/jordan-a-young/little-jay.git` or the equivalent HTTPS URL without `.git` used by GitHub checkout; other repositories, protocols and URL variants are rejected. Synchronization queries the exact `refs/heads/main` ref, not the similarly named `changeset-release/main` branch. Publication order is brand/tokens, independent HTTP/server, then UI. Existing versions are skipped only if registry artifact integrity matches; authentication/network errors are not treated as “unpublished.”
- pnpm waits for each new version to become installable before proceeding to its dependent. Publication is serialized and not canceled by a newer run. npm releases are **not atomic across packages**.
- Only after every planned package is confirmed does Changesets create local package tags (`@littlejay/name@version`). The GitHub action pushes them and creates corresponding GitHub releases from package changelogs. No all-package `v0.1.0` tag is used.

The default GitHub token creates release tags/metadata through the action; local checkout credentials are not persisted. The custom script's private-origin `git ls-remote` read uses that token only through command-scoped `GIT_CONFIG_*` environment values: no credential is written to Git config or passed in command arguments. Local fallback uses the owner's existing Git authentication as well as separate npm authentication. Protect this workflow and main through available repository controls. A manual trigger is an explicit release action, not a substitute for code review or a platform-enforced independent approval.

## Local publishing fallback

After separate publication approval, authentication and a clean synchronized main checkout:

```sh
LITTLEJAY_PUBLISH_ENABLED=true pnpm release:publish --confirm <exact-40-character-main-SHA>
```

This reruns release verification and packs fresh artifacts before uploading, then creates local package tags after all versions are confirmed. It never creates Git commits, pushes tags or creates GitHub releases. Those are separate explicit actions. `--verified-artifacts` is reserved for the exact GitHub publishing workflow; local callers cannot use it to skip checks. A dry-run/check is not an authenticated publishing test.

## Partial failure and recovery

Inspect the workflow log and `.release/publish-summary.json` (retained as a workflow artifact). It records confirmed versions and the current unconfirmed package on failure. An upload timeout can mean npm accepted the version even though it is not visible yet: check npm before retrying. Never force, overwrite, unpublish, change a released tarball, bypass Git checks, or invent a new version just to hide a partial failure.

Retry only the reviewed release commit after diagnosing the failure. The script verifies hashes of existing registry versions and publishes the remainder. A failure during npm upload creates no release tags. If npm succeeds but tag/GitHub-release finalization fails, reconcile the missing metadata explicitly against registry state and the original commit; rerunning may skip already-existing Git tags and cannot be assumed to repair every GitHub release automatically. Keep old artifacts/logs as private diagnostic evidence, not source files. If main has advanced, stop and agree on recovery rather than bypassing the synchronization guard.

## Checks for release-tooling changes

Use `pnpm test scripts/release.test.mjs` for command/registry-boundary tests. Tests use synthetic manifests and injected commands; they never invoke a real publish, auth flow, tag creation or remote write. Run frozen installation and `TMPDIR=/tmp/opencode pnpm ready` for final integration, check workflow syntax/permission boundaries and changeset version generation in a disposable copy, and obtain independent review for changes to publishing/authentication boundaries. Browser checks are not needed for release-only changes with unchanged rendering/styles/interaction. Local checks do not prove GitHub OIDC or first-publication access; report those external steps as unperformed, never as passing.
