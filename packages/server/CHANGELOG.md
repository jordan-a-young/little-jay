# @littlejay/server

## 0.2.0

### Minor Changes

- 1200292: Move Fastify to a consumer-owned peer dependency (`~5.12.7`), retaining exact development version 5.12.8. Breaking installation change before 1.0: applications must declare a compatible Fastify dependency directly instead of relying on this package's transitive installation. Factory, plugin and response contracts are unchanged.

  Document packed ESM and strict NodeNext compatibility checks for Fastify 5.12.7 and 5.12.8 on Node 24.18.0 and 26.13.0. These are tested combinations, not a guarantee for other versions or downstream plugins. Application lifecycle and logging policy remain caller-owned.

## 0.1.2

### Patch Changes

- 2cf19d1: Prepare fresh maintenance versions of all five libraries so each package can pass through stage-only trusted publishing and maintainer approval. No public APIs or runtime behavior change. Branding artwork and third-party font rights remain unchanged.

## 0.1.1

### Patch Changes

- 6885a6f: Add installed-package optimization guidance and a shared OpenCode/Codex consumer setup reference. Document CSS and component reuse, local React state and retained tab effects, bounded requests and cache ownership, server lifecycle and probe costs, and selective asset delivery. Performance recommendations require representative measurements and preserve accessibility, validation, safe diagnostics, and artwork rights. No runtime APIs or behavior change.

## 0.1.0

### Minor Changes

- Initial release of the Little Jay libraries: canonical branding assets, semantic theme tokens, accessible React controls, bounded JSON transport, and opt-in Fastify foundations. Applications retain state, validation, authorization, asset serving, and lifecycle policy. Branding artwork remains excluded from the code/documentation MIT license; preserve the packaged provenance and font notices.
