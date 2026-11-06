# React UI

- Target React 19; preserve React/React DOM as peers. Use native controls and ref props, existing composition patterns, and Radix only for the established modal foundation. Avoid adding a form library or global state for generic controls.
- Preserve native semantics, accessible names, keyboard/focus behavior, disabled states, field associations, and safe rendering of untrusted text. Accessibility flags are not authorization or server validation.
- Shared UI owns presentation, not workflow policy, network requests, caches, or application schemas. Examples and authored prop documentation live in `apps/playground`.
- LoadingIndicator is presentational: visible `label` text is optional, icon-only rendering retains hidden loading text, and live roles/busy state remain caller-owned. Keep its reduced-motion fallback and reset-free styles covered when changing it.
- Styles use semantic tokens and compile into reset-free CSS. Consumers must not need Tailwind. Preserve CSS side effects, theme convenience exports, and the development source/production output boundary.
- The playground development server consumes UI component source through the package's `development` exports and aliases the stylesheet to source CSS. Component logic, Tailwind classes, and component CSS hot-reload without a manual rebuild/restart. This does not refresh `dist` declarations or packaged output; rebuild for checks/consumers that require those artifacts, not for each visual iteration.
- New component exports must be wired through `src/index.ts`, `package.json`, and `vite.config.ts` build entries as appropriate; add catalog examples and tests.
- Run `pnpm test packages/ui/src` from the root after prerequisite builds. Test interactive behavior in jsdom component tests, then check affected flows in a browser with keyboard use, both themes, and a narrow viewport. Verify modal focus restoration and portal theme inheritance when affected.
- For public API/CSS/export changes, also run the package-consumer check described in `../AGENTS.md`.
