# Fastify foundations

- `docs/SERVER.md` is the behavioral contract. `createServer` creates an ordinary Fastify instance only; routes/plugins are opt-in and listening, process signals, shutdown, and logging remain app-owned.
- Preserve Fastify encapsulation and registration order. Safe errors must use fixed canonical codes/messages, never raw diagnostic data; readiness failures must not reveal checks or exceptions.
- Keep liveness independent of readiness. Readiness checks are injected, and their deadlines/resources remain caller-owned; do not add service connections or domain routes here.
- Prefer `server.inject` tests without real network listeners; close instances. Extend factory/plugin tests for changed behavior and run `pnpm test packages/server/src` from the root.
- Changes to contracts or Fastify integration also require API-consumer tests and the tarball consumer check; update `docs/SERVER.md` when applicable.
