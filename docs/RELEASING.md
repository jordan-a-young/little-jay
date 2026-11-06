# Library releases

## Status and boundaries

Five libraries are prepared for public npm publication under `@littlejay`: brand, tokens, UI, HTTP and server. Their initial generated version is `0.1.0`. The repository root, playground and API remain private at `0.0.0`. Versions are independent; there are no fixed/linked groups. This setup has not published any package, configured npm credentials/trusted publishers, activated workflows remotely, changed GitHub visibility, or granted additional artwork rights.

Changesets CLI **3.0.3** owns versions and changelogs; Changesets Action **2.1.2**, pinned by commit, opens release PRs and finalizes GitHub tags/releases after successful npm publication. pnpm **12.18.0** installs, builds, packs and publishes. Do not combine Changesets with pnpm's separate native versioning engine.

Public npm packages are downloadable by everyone even though the source repository stays private. Branding artwork retains its reserved-rights statements and font notices; publishing the package does not relicense the artwork under MIT. The owner explicitly approved including branding in this release setup. See [publication/rights policy](PUBLISHING.md).

## Everyday change notes

Run `pnpm changeset` from the root for a consumer-visible library change. Select only affected packages and write the resulting `.changeset/*.md` note alongside the implementation. Explain compatibility/migration requirements, not just the internal task. Tests, maintainer docs and private-app-only changes normally need no changeset; record that decision in review rather than forcing an empty release.

- Patch: compatible fixes.
- Minor: features; before 1.0, also explicitly labeled breaking changes with migration guidance.
- From 1.0 onward: breaking changes require major versions.
- Root and runnable apps are never published or versioned by Changesets.
- This release path supports stable versions and npm's `latest` tag only. Prerelease/`next` support requires a separately reviewed extension, not a flag added ad hoc.

Use `pnpm release:status` to inspect the proposed release. For local preparation, run `pnpm release:version`: it consumes notes, generates per-package changelogs/versions, regenerates `pnpm-lock.yaml` using pnpm, and formats release files. Review the diff. It does not commit, tag, push or publish; avoid invoking it with unrelated uncommitted work. Generated notes include commit references that may require access to this private source repository.

## Release PR automation

`.github/workflows/release-pr.yml` runs on main pushes or manual dispatch. If pending changesets exist, it creates/updates a draft `changeset-release/main` PR through Changesets. Without notes it does nothing. Merging the PR **does not publish**.

The action uses the built-in GitHub token with only contents/PR write permissions. Enable GitHub's setting allowing Actions to create PRs separately; repository-settings changes are not part of local setup. A `GITHUB_TOKEN`-created PR does not trigger ordinary PR workflows automatically, so the workflow explicitly checks out the generated PR in a separate read-only `verify-release-pr` job, runs frozen installation, installs the pinned secret scanner and runs `pnpm release:check`. Review this job's result for the latest release-PR update before merging. Do not infer that branch protection or environment approvals are available on this private repository's current GitHub plan.

## Nonpublishing verification

`pnpm release:check` validates library names, stable versions, public access, registry/repository metadata, private root/apps, current changelog headings and internal dependencies. It refuses pending unversioned notes, runs `pnpm ready` and `pnpm secrets:scan`, then packs the five libraries in dependency order into ignored `.release/`.

`.release/verified.json` binds the exact tarball names and SHA-512 hashes to a clean Git commit. Dirty checkouts may run checks and create local artifacts but receive a null commit marker: they cannot be published. This command never uploads anything, creates tags or accesses npm credentials. Frozen installation and the pinned local scanner are prerequisites. Follow server isolation rules before clean builds. Package-consumer tests derive filenames/overrides from each manifest and verify actual tarballs, not hardcoded `0.0.0` versions.

## Bootstrap and activation — owner actions, not automatic setup

Before the first publication:

1. Review the exact release commit, public tarball contents, package names and brand rights/notices. Confirm all five package names are available and the npm account has publish access to the `littlejay` organization. Keep secrets out of the commit; run the staged/history scan gates under the publication policy.
2. Merge reviewed version/release setup through the agreed Git workflow. Keep the release SHA pinned. Install the pinned Node/pnpm versions, use frozen installation, and keep the checkout clean and synchronized with the intended origin's `main`.
3. Authenticate interactively to npm using the owner's account with 2FA. Do not send credentials or OTPs to an agent, store them in repository files, or add a long-lived CI npm token.
4. Separately authorize the initial local publication of the **real initial versions** with the local publish command below. New packages must exist before their npm trusted-publisher settings can be configured. Do not publish dummy/stub packages as a test. This bootstrap has not been performed by this implementation.
5. For **each** package on npm, configure a GitHub Actions trusted publisher: GitHub owner `jordan-a-young`, repository `little-jay`, workflow filename `publish.yml`. Permit direct `npm publish`/pnpm publication; newly created configurations may otherwise allow only staged publishing. No GitHub environment name is set by these workflows. Use GitHub-hosted runners. Configure near the first intended OIDC release: npm's current policy expires new, unvalidated trusted-publisher connections after two days.
6. After separately approving activation, set GitHub repository variable **`NPM_PUBLISH_ENABLED=true`**. It is intentionally unset/off by default. Do not enable it merely because CI passes. Leave it off if bootstrap, rights or permissions are unresolved. No npm token secret is needed. After OIDC works, npm recommends requiring 2FA and disallowing traditional tokens.

Trusted publishing authenticates CI with short-lived OIDC credentials. It does not authenticate dependency installation. Our dependencies are publicly readable. npm provenance attestations are **not supported for private source repositories**, even for public npm packages; no `--provenance` flag is forced. Do not change repository visibility merely to obtain provenance. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) for current requirements and limits.

## Manual GitHub publishing

After the release PR is reviewed/merged and activation is explicitly authorized, manually dispatch **Publish npm packages** on **main**, supplying that exact 40-character commit SHA. The workflow rejects a different branch, missing activation, mismatched SHA or main moving since dispatch. It never publishes on an ordinary push, PR, GitHub release event or tag creation.

- The read-only verify job uses frozen installation, the full gate and a history secret scan, then uploads verified tarballs and their commit/hash record.
- The publish job alone has `id-token: write`; it downloads that same run's exact artifact ID, installs tooling with lifecycle scripts disabled and no restored cache, and checks the complete artifact set before the first upload. It does not rebuild or rerun application/test code with OIDC permissions.
- The script checks a clean, synchronized main, expected origin, confirmation SHA, allowlist and every tarball hash. Publication order is brand/tokens, independent HTTP/server, then UI. Existing versions are skipped only if registry artifact integrity matches; authentication/network errors are not treated as “unpublished.”
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
