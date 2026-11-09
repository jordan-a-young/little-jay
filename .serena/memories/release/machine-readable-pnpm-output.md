# Machine-readable pnpm release output

Verified 2026-11-08 against pinned pnpm 12.18.0 and CI run 42523987132. See `docs/RELEASING.md` and the reporter regression in `scripts/release.test.mjs`.

- `stage publish --json` alone does not isolate stdout: the default reporter may prepend request-retry diagnostics after an otherwise successful upload. Explicit `--reporter=ndjson` routes diagnostics to stderr and leaves stdout for the package-keyed JSON receipt; pinned CLI help documents this boundary.
- Do not recover by extracting JSON from arbitrary mixed output or retrying an upload. Keep strict receipt identity/hash/UUID checks and unknown-outcome reconciliation. A parsing failure after exit zero can coexist with a real staged package.
- GitHub environment approval waits before uploads. npm stage approval independently promotes a package and does not resume a failed receipt parser. Public registry integrity must be compared with the original verified artifact before considering the outcome reconciled.
