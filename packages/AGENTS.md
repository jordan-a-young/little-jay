# Shared packages

- Reusable packages are private ESM libraries with explicit exports. Keep application policy, schemas, caches, process listeners, and environment-specific setup in apps.
- Package READMEs are installed consumer guidance, not maintainer instructions. Keep them self-contained; packaged relative links must resolve within the package, and source-only references must be labeled. `docs/CONSUMER-AGENTS.md` provides opt-in discovery; `scripts/test-packages.mjs` checks installed guidance and its local links. Do not promise automatic agent loading or change rights/publication scope.
- Read the package's `AGENTS.md` and the relevant contract in `docs/` before changing behavior. Import sibling packages through public exports and declare local dependencies with `workspace:*`.
- For entry-point changes, keep source exports, `package.json` exports/files, build entries, declarations, documentation, and package-consumer coverage aligned. Do not edit generated outputs as a substitute.
- Build with `pnpm --filter @littlejay/<name> build`. For dependency-inclusive builds, quote the selector: `pnpm --filter '@littlejay/<name>...' build`. Packages with TypeScript expose `typecheck`; brand/tokens do not.
- Tests are root-owned: `pnpm test packages/<name>/src`, after required builds. Use existing colocated Node or `.component.test.tsx` tests as appropriate.
- For exports, assets, CSS, declarations, or dependency changes, run `pnpm build` and `TMPDIR=/tmp/opencode pnpm test:packages` as well as relevant checks. The consumer validates real tarballs without Tailwind installed; a workspace-only test is insufficient.
- The owner selected `@littlejay` for future use on the public npm registry. Keep the scope consistent across workspaces, imports, styles, docs and package-consumer fixtures. Do not remove `private`, change versions/scope, configure publishing, publish packages, or alter licensing/artwork provenance without explicit authorization.
