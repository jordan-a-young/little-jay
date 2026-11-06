# Shared packages

- Reusable packages are private ESM libraries with explicit exports. Keep application policy, schemas, caches, process listeners, and environment-specific setup in apps.
- Read the package's `AGENTS.md` and the relevant contract in `docs/` before changing behavior. Import sibling packages through public exports and declare local dependencies with `workspace:*`.
- For entry-point changes, keep source exports, `package.json` exports/files, build entries, declarations, documentation, and package-consumer coverage aligned. Do not edit generated outputs as a substitute.
- Build with `pnpm --filter @ljay/<name> build`. For dependency-inclusive builds, quote the selector: `pnpm --filter '@ljay/<name>...' build`. Packages with TypeScript expose `typecheck`; brand/tokens do not.
- Tests are root-owned: `pnpm test packages/<name>/src`, after required builds. Use existing colocated Node or `.component.test.tsx` tests as appropriate.
- For exports, assets, CSS, declarations, or dependency changes, run `pnpm build` and `TMPDIR=/tmp/opencode pnpm test:packages` as well as relevant checks. The consumer validates real tarballs without Tailwind installed; a workspace-only test is insufficient.
- Do not remove `private`, change the provisional scope, publish packages, or alter licensing/artwork provenance without explicit authorization.
