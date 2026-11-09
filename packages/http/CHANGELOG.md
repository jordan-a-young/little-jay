# @littlejay/http

## 0.1.2

### Patch Changes

- 2cf19d1: Prepare fresh maintenance versions of all five libraries so each package can pass through stage-only trusted publishing and maintainer approval. No public APIs or runtime behavior change. Branding artwork and third-party font rights remain unchanged.

## 0.1.1

### Patch Changes

- 6885a6f: Add installed-package optimization guidance and a shared OpenCode/Codex consumer setup reference. Document CSS and component reuse, local React state and retained tab effects, bounded requests and cache ownership, server lifecycle and probe costs, and selective asset delivery. Performance recommendations require representative measurements and preserve accessibility, validation, safe diagnostics, and artwork rights. No runtime APIs or behavior change.
- cf6055d: Accept JSON Content-Type headers with semicolons or charset-like text inside quoted extension parameters, respecting escaped quotes and backslashes. Actual unsupported charset parameters remain rejected. Unterminated quoted parameters now return the safe `content_type` error; servers must close quoted parameter values.

## 0.1.0

### Minor Changes

- Initial release of the Little Jay libraries: canonical branding assets, semantic theme tokens, accessible React controls, bounded JSON transport, and opt-in Fastify foundations. Applications retain state, validation, authorization, asset serving, and lifecycle policy. Branding artwork remains excluded from the code/documentation MIT license; preserve the packaged provenance and font notices.
