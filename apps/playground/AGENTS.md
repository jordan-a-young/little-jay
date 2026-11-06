# Component playground

- Read `docs/CATALOG.md` before catalog changes and `docs/BRANDING.md` before theme/bootstrap/asset changes.
- Components belong in `packages/ui`; catalog pages, executable examples, authored props/snippets, registry metadata, and preview controls belong here. Update documentation alongside changed component contracts.
- Preserve stable page/example IDs, hash deep links, Back/Forward, missing-route recovery, and lazy category loading. Add pages through `src/catalog/registry.ts` and the existing page/example pattern.
- Demos are local-only unless explicitly demonstrating a real API operation. Label simulations; do not start workflows, persist records, or add external calls incidentally.
- TanStack Query owns request caching/lifecycle; use `@ljay/http` for bounded decoded JSON and pass the Query abort signal. Do not add library-owned retry/cache behavior.
- Preserve document-level theme ownership, pre-render bootstrap, persistence fallback, and portal inheritance. Do not remount forms on theme changes.
- `branding.ts` synchronizes an allowlist from canonical brand assets. Do not edit or manually populate generated `public/branding/`.
- Run focused tests with `pnpm test apps/playground/src` from the root after building prerequisites. For UI changes, also check keyboard/focus behavior, light/dark themes, and a real narrow browser viewport. The preview width control is not a viewport or a substitute for browser validation.
