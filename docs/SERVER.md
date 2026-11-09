# Server contracts

`@littlejay/server` exports `createServer`, `safeErrorsPlugin`, and `healthRoutes`, their option/response types, and the existing Fastify types. The factory only creates Fastify: routes, listener startup, shutdown, and process listeners remain app-owned.

## Consumer-owned Fastify and compatibility

Fastify is a `~5.12.7` peer dependency, not a bundled/runtime dependency; consumers declare their compatible Fastify installation directly. Development retains exactly 5.12.8 and fastify-plugin 6.0.1. Existing factory, plugin and safe-response contracts are unchanged. The [installed server guide](../packages/server/README.md#compatibility) describes installation and the migration from transitive Fastify ownership.

`pnpm test:server-compat` packs the current built server library and checks isolated ESM/strict NodeNext consumers against Fastify 5.12.7 and 5.12.8 on Node 24.18.0 and 26.13.0. The fixture uses Node-major-specific typings (24.19.2 / 26.6.6), does not skip declaration checking, and checks shared Fastify resolution, native plugins and augmentation, typed requests/replies/decorators, hooks, readiness, injection, closing and an application-owned loopback listener. It verifies listener release after closing. This is compatibility evidence for these combinations, not a production deployment or all-version guarantee.

Build first using the repository's pinned Node 26.13.0/pnpm 12.18.0 toolchain. Set `LITTLEJAY_NODE24` to the absolute path of an already-installed Node 24.18.0 executable:

```sh
LITTLEJAY_NODE24=/absolute/path/to/node24 TMPDIR=/tmp/opencode pnpm test:server-compat
```

The harness validates both exact runtime versions before packing/installing, never installs Node, and retains fixture packages, lockfiles, compiled consumers, the original tarball/hash and per-combination results in the printed temporary directory. Registry access or a populated pnpm store is required. Installation disables lifecycle scripts. TypeScript compilation runs from the repository's Node 26 host using each isolated consumer's typings; emitted consumers execute with their selected runtime. CI provisions Node 24 alongside the normal Node 26 toolchain and runs the matrix after `pnpm ready`; release workflows remain unchanged. No UI/browser checks apply to this server-only contract.

## Opt-in safe errors

```ts
import { createServer, healthRoutes, safeErrorsPlugin } from "@littlejay/server";

const app = createServer({ bodyLimit: 16_384 });
app.register(safeErrorsPlugin);
app.register(healthRoutes, {
  prefix: "/api",
  checks: [async () => localDependencyIsReady()],
});
```

Register `safeErrorsPlugin` before the routes it should protect. `fastify-plugin` makes it apply to the registering scope and descendants, rather than an otherwise empty child scope. To limit its reach, register it inside an application plugin. Applications may deliberately override handlers in more-specific scopes.

Handled errors return `{ statusCode, error: { code, message } }`. Integer error status codes from 400 through 599 are preserved; other values become 500. Canonical client codes are `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), and `RATE_LIMITED` (429). Other 4xx errors use `REQUEST_FAILED`; 5xx errors use `INTERNAL_ERROR`. Messages are fixed, never copied from error messages, validation details, request URLs, bodies, or headers. The not-found handler is canonical too. Fastify remains responsible for validation, body limits, and request IDs.

The plugin does not log requests or errors, but it does not rewrite the app's logger configuration or sanitize logs emitted elsewhere. Automatic Fastify request logging can include raw URLs. The API example uses Fastify's current `LogController` API with `disableRequestLogging: true`, preserving startup logs while avoiding those request logs. Applications own logging/redaction and any safe diagnostic reporting, including custom request-ID settings. Low-level transport errors and explicit replies outside these handlers remain Fastify/app concerns. Do not put untrusted diagnostic messages into explicit application error responses.

## Explicit health/readiness routes

- `healthPath`: `/health` by default, or `false` to disable. Returns 200 `{ status: "ok" }` independently of readiness.
- `readinessPath`: `/ready` by default, or `false` to disable. Returns 200 `{ status: "ready" }` if all checks return exactly `true`.
- `checks`: readonly array of `() => boolean | Promise<boolean>`. Evaluated sequentially per request, stopping at the first false result or exception. Either failure returns 503 `{ status: "not_ready" }`, with no dependency names or exception details. No checks means ready.
- Fastify's normal registration `prefix` applies. Paths and checks are trusted application configuration. Checks own deadlines, resource cleanup, and any service connections; the library opens none.

## Concrete TypeBox example

`apps/api` registers the probes at `/api/health` and `/api/ready`; `/api/health` retains `{ status: "ok" }` and the default API port remains 5050.

`POST /api/text-preview` accepts `{ text: string }` with 1–4096 characters according to JSON Schema string length. It returns `{ characters: number, lines: number }`: Unicode code points and line count (CRLF counts as one break). It is stateless, performs no external calls, does not persist or execute text, and does not echo it. Invalid bodies use the canonical 400 response. Fastify's normal AJV coercion/removal defaults apply; this example does not change global compiler or format registries.

Schemas and inferred handler types use `@fastify/type-provider-typebox@6.3.0` and `typebox@1.4.4`, with the provider's `ajv-formats@3.0.1` peer installed explicitly. Provider 6 supports Fastify 5. No shared validation package or application-domain schemas are introduced.

Authoritative compatibility/API references consulted:

- https://github.com/fastify/fastify-type-provider-typebox#compatibility
- https://github.com/fastify/fastify-plugin#metadata
- https://fastify.dev/docs/latest/Reference/Logging/
