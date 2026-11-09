# Example API

- Read `docs/SERVER.md`. Keep route schemas and inferred types in the app using the existing TypeBox provider; do not introduce shared domain-schema packages.
- The app owns listening, signals, graceful shutdown, and logging policy; `@littlejay/server` must remain free of process listeners and automatic binding.
- Preserve safe error responses and disabled automatic request logging. Do not return or log raw URLs, headers, bodies, validation details, or exception messages incidentally.
- Keep liveness independent of readiness. The text-preview route is bounded and stateless: no persistence, execution, external calls, or raw text echo.
- Prefer Fastify injection for route tests, close created servers, and preserve lifecycle tests for shutdown/startup behavior. Run `pnpm test apps/api/src` from the root after building `@littlejay/server`.
- `src/examples/async-app/` owns explicit Zod configuration, the injected ready/non-listening factory, synthetic defaults and separate demo startup. Keep environment/signal/listening ownership in startup, bounded work opt-in, and injected resource contents out of responses/logs. Preserve the original `src/server.ts` entry point and TypeBox routes.
- Use `HOST`/`PORT` for task-specific bindings; the new demo accepts loopback hosts only. The frontend has no API proxy or backend dependency; see `../AGENTS.md`.
