# Public-repository checklist

This checklist prepares a possible public GitHub repository. It does not authorize initializing Git, committing, pushing, changing repository visibility, publishing packages, or deploying an application.

## License and provenance

- Project-authored code and documentation use the root [MIT License](../LICENSE). Preserve its copyright and permission notice in copies and substantial portions.
- Little Jay/Pebble artwork is excluded from that grant. The creator reports making it with ChatGPT; [brand provenance and rights](../packages/brand/README.md#provenance-and-rights) records that statement and reserves any rights held. No artwork reuse license or trademark permission is granted.
- Preserve third-party terms and notices, including [font notices](../packages/brand/FONT-NOTICES.txt). The MIT license does not relicense dependencies or third-party content.
- AI-assisted creation is not proof of copyright protection, exclusivity, noninfringement, or trademark clearance. Resolve any known third-party rights concerns before distributing the affected files.

## Before the first public push

1. Review the exact files to be uploaded, not only the current application source. Keep dependencies, build outputs, generated branding copies, environment files, credentials, local data, logs, and private test artifacts out of the commit. Check [.gitignore](../.gitignore); ignore rules do not remove files already tracked.
2. Once Git has been explicitly initialized and the intended files staged, inspect `git status --short`, `git diff --cached --name-status`, and `git diff --cached`. Check all history too if importing an existing repository. Avoid displaying suspected secret values in logs or reports.
3. Run `pnpm secrets:staged` against the intended commit, then `pnpm secrets:scan` after committing to audit history. Install the scanner with `pnpm secrets:install` first. If a real secret is found, revoke or rotate it; deleting the current file does not remove historical exposure.
4. Confirm that the README's license scope and artwork exclusions match the intended release. Public GitHub visibility makes included assets downloadable; it cannot guarantee control over copying.
5. Enable GitHub secret scanning and push protection where available. Review GitHub Actions permissions before enabling workflows; never place credentials in source or workflow literals.
6. For code changes, use [the verification matrix](VERIFICATION.md); `pnpm ready` is the full local integration gate. Passing tests does not replace disclosure or rights checks. Documentation-only licensing changes need formatting and link validation, not a rebuild.

Repeat the staged-file and history review for each publication; an earlier clean scan does not establish that later commits are safe.

## Secret prevention and response

- Store secrets in a local secret manager, ignored environment files, or GitHub Actions secrets, never in source or workflow literals. `.env.example` is intentionally allowed and must contain placeholders only. Vite's `VITE_` variables are public browser configuration, not a place for secrets.
- `.gitignore` excludes environment files, common private-key/credential files, local scanner binaries, logs, and build outputs. Ignore rules are convenience, not enforcement: forced additions and already-tracked files still need review. The scan wrapper rejects ignored files that appear in the index.
- `pnpm secrets:install` installs Gitleaks 8.30.1 into `.tools/` after verifying an embedded release SHA-256 checksum. The installer supports Linux/macOS x64 and ARM64. Other platforms need the same version installed manually, with `GITLEAKS_BIN` pointing to its executable. Updating the scanner requires reviewing its release and updating the version and checksums together.
- Enable local hooks in every clone with `git config --local core.hooksPath .githooks`. The pre-commit hook scans staged additions, including the initial commit; the pre-push hook scans all local history. Hooks fail closed when the scanner is unavailable. Scans redact matched secret values and inspect encoded content and archives up to two levels. Do not add blanket suppressions or bypass a finding to publish.
- `.github/workflows/secrets.yml` independently scans full fetched history on pushes and pull requests, without installing application dependencies. Both workflows request read-only repository permissions and disable checkout credential persistence. CI scans occur **after upload**, so they are detection, not upload prevention.
- GitHub rejected native secret scanning/push protection and branch rules for this private repository's current plan during initial setup. Repository visibility was not changed. If supported later, enable native secret scanning and push protection, and require the `Secrets / scan` and `CI / verify` checks before merging. Recheck GitHub's current plan availability rather than assuming these controls are enabled.
- No scanner detects every secret; hooks can be bypassed or disabled, and unsupported or encrypted/binary content may escape detection. Review the exact staged files, keep credentials out of screenshots/artwork/archives, and treat scanner/configuration/workflow changes as security-sensitive. Keep any diagnostic reports private and out of Git.
- If exposure occurs, revoke/rotate the credential immediately, inspect provider audit logs, remove it from current files, and coordinate history cleanup with collaborators. History rewriting is a separate destructive operation requiring explicit authorization; deleting a file or making a repository private does not revoke the credential.

## Separate publication decisions

- Public GitHub source and npm publication are separate operations. `private: true` prevents accidental npm publishing but does not hide public repository content.
- Keep package privacy flags and provisional `@ljay` scope unchanged until npm publication is separately requested. Before that publication, verify scope ownership and ensure each tarball includes the correct license and third-party notices, without implying an MIT artwork license.
- Deployments need their own review of public metadata, origins, service configuration, and asset permissions. None is authorized by adding a license or creating a GitHub repository.
