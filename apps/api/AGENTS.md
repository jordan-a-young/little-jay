# Example API

- Read `docs/SERVER.md`. Keep route schemas and inferred types in the app using the existing TypeBox provider; do not introduce shared domain-schema packages.
- The app owns listening, signals, graceful shutdown, and logging policy; `@ljay/server` must remain free of process listeners and automatic binding.
- Preserve safe error responses and disabled automatic request logging. Do not return or log raw URLs, headers, bodies, validation details, or exception messages incidentally.
- Keep liveness independent of readiness. The text-preview route is bounded and stateless: no persistence, execution, external calls, or raw text echo.
- Prefer Fastify injection for route tests, close created servers, and preserve lifecycle tests for shutdown/startup behavior. Run `pnpm test apps/api/src` from the root after building `@ljay/server`.
- Use `HOST`/`PORT` for task-specific bindings and update the playground's `API_PROXY_TARGET` together; see `../AGENTS.md`.
