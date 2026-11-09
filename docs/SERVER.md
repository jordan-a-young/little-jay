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

## Async application and local demo

`apps/api/src/examples/async-app/` demonstrates an application-owned async factory without changing `@littlejay/server` or the original `apps/api/src/server.ts` startup. The existing TypeBox routes above remain available in both entry points. From a local clone using the pinned toolchain:

```sh
pnpm install --frozen-lockfile
pnpm dev:server
```

This builds the server library and starts only the demo watcher. In another terminal:

```sh
curl http://127.0.0.1:5050/api/health
curl http://127.0.0.1:5050/api/example
```

`/api/example` returns only `sampledAt` (injected clock timestamp), `transportAvailable` (a synthetic boolean) and `localEntries` (a bounded count), never raw dependency contents. These defaults do not access files or external services; the boolean is not evidence of real connectivity. The catalog starts separately with `pnpm dev` and makes no requests to this server. Ctrl+C stops the demo independently. For built startup, run `pnpm --filter '@littlejay/api...' build`, then `pnpm --filter @littlejay/api start:demo`. The original watcher/start scripts remain `dev` and `start` in the API workspace.

- `configuration.ts` uses app-local `zod@4.6.7` to parse explicit unknown input without environment access or resource acquisition. Invalid values produce fixed error messages. Application settings are strict: integer `sampleLimit` 1–100 (default 5), boolean `backgroundWork` (default false).
- `createApp(configuration, dependencies)` revalidates configuration before construction, returns a native Fastify instance only after `ready()`, and never listens, reads environment variables or installs process handlers. Limits are body size 16,384 bytes, request timeout 15,000 ms and `trustProxy: false`; safe errors and disabled automatic request logging are preserved. Demo logging is disabled.
- Inject `clock`, async `transport` and async `readLocal(limit)` explicitly. Dependencies are caller-owned and must bound their own work; summary truncation is not a memory/I/O limit on an injected implementation. Factory instances share no mutable state.
- Optional `startBackground` is never invoked while disabled. When enabled it must return an async cleanup function after acquiring a bounded resource; the app invokes it on close. The starter owns rollback if acquisition fails before it returns. This is not a production scheduler or comprehensive lifecycle framework. Startup failure closes the partially initialized app; combined startup/cleanup failures preserve both causes internally, without exposing them through the CLI.
- `startup.ts` parses only `HOST` and `PORT` from its explicit environment argument before constructing the app. Defaults are `127.0.0.1:5050`; host is restricted to `127.0.0.1` or `::1`, and port to integers 1–65535. It owns listening and its two signal handlers, removes only those handlers, and provides an idempotent awaited `stop()`. `server.ts` is the process entry point and prints only the listener origin or fixed failure messages.

For isolated bindings, use `HOST=127.0.0.1 PORT=5051 pnpm dev:server` on Unix, or set those environment variables in PowerShell before running the command. See [isolated application startup](../apps/AGENTS.md#isolated-development). Tests under the example directory use synthetic dependencies and Fastify injection; the real startup/shutdown check must also verify listener and process cessation.

## Native application policy example

`apps/api/src/examples/policy-app/` is a sibling injectable example for native security hooks and application-defined validation/errors. It is **not** a production identity system, a shared authentication library or part of either existing server startup. `pnpm dev:server`, its async factory and the original API/TypeBox routes remain unchanged. The frontend catalog still requires no backend.

From a local clone, build prerequisites, then run the executable example regressions:

```sh
pnpm --filter "@littlejay/api..." build
pnpm test apps/api/src/examples/policy-app
```

`createPolicyApp(parsePolicyConfiguration(input), dependencies)` returns a ready, non-listening native Fastify instance. Configuration is revalidated before construction; imports/factory read no environment or install process handlers. Body limit is 16,384 bytes, request timeout 15,000 ms and `trustProxy: false`. Logging is disabled. The caller owns any listener, dependency deadlines/resources and `close()`; partially failed readiness attempts are closed. No real authentication provider, session database, background job or external service is included.

### Explicit policy and hook ownership

- Configuration requires bounded `allowedHosts` and `allowedOrigins` lists (1–8 entries each). Hosts are exact authorities including the configured port; origins are canonical HTTP(S) origins, without credentials, paths or wildcards. Incoming values are compared directly, not normalized into an allowed value or replaced by forwarded headers.
- `csrfHeader` defaults to `x-policy-csrf`; custom names are lowercase `x-*` header tokens and cannot be forwarded-host/protocol/address fields. Session-bound CSRF values are bounded base64url-style strings (16–128 ASCII characters). Comparison validates encoding and equal byte lengths before `timingSafeEqual`.
- `sessionCookie` is strict: `name`, `path`, boolean `secure`/`httpOnly`, `sameSite` and bounded `maxAgeSeconds` (1–86400). Defaults are `policy-session`, `/api/policy`, secure, HttpOnly, SameSite Strict and 1800 seconds. No Domain or arbitrary serializer options are accepted. SameSite None and case-insensitive cookie prefixes enforce their Secure/HttpOnly/path constraints; the configured cookie spelling is preserved. Explicit insecure/HttpOnly-disabled settings are demonstrable synthetic policy, not recommended production defaults.
- Inject `clock()` (epoch milliseconds), `findSession(identifier)`, `preview(text, subject)` and `readAudit(subject)`. Session lookup returns unknown data: the example validates subject, member/admin role, CSRF token and finite expiry, rejecting expiry at `expiresAt <= now`. Native request-local decorators carry the validated identity; no global session state or type assertion substitutes for runtime validation. Optional `observe(stage, requestId)` receives only stage names and generated request IDs, not request/session contents; it has no default logging destination.

The native scoped order is:

1. `@fastify/cookie@11.1.3` parses cookies in `onRequest` before the application hooks. Compatibility is exercised with the API's exact Fastify 5.12.8, not asserted for every plugin/runtime version.
2. Policy `onRequest` sets `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` and `Cache-Control: no-store`, then checks exactly one raw Host/Origin field. Present unapproved Origin values (including `null`) are denied; absent Origin is allowed only for GET/HEAD. There is no permissive CORS or successful preflight promise.
3. Protected `onRequest` resolves one unambiguous configured session cookie and validates its session. Invalid boundaries never reach lookup; missing/invalid sessions never reach protected services.
4. After Fastify parsing, protected `preValidation` checks CSRF for non-GET/HEAD requests. Parser errors can therefore precede CSRF errors; neither may call protected services.
5. Protected `preHandler` enforces authentication, and the nested admin scope adds its role check. Async denials terminate by throwing a designated application error. Authorization never performs response/data projection.

Application handlers and not-found handlers are installed separately in the policy, private and admin prefixes. Unknown routes and wrong methods retain the corresponding scope's protections; adjacent original routes keep their canonical contract. Low-level HTTP parser/routing failures can occur outside this scoped lifecycle and are not promised its response shape or headers.

### Routes, projection and error compatibility

| Example route                         | Behavior                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/policy/public`              | Deliberately public `{ access: "public" }`, still subject to boundary checks.                                                                                                                                                                                                        |
| `POST /api/policy/validate`           | Public stateless handler-level Zod `.parse()` example; returns only a character count and requires an allowed Origin.                                                                                                                                                                |
| `GET /api/policy/private/profile`     | Authenticated allowlisted subject/role projection, never the session record.                                                                                                                                                                                                         |
| `POST /api/policy/private/preview`    | Authenticated/CSRF-checked service-level `.parse()` validation, injected preview and fresh `{ characters }` projection.                                                                                                                                                              |
| `POST /api/policy/private/session`    | Refreshes only the current authenticated cookie, never a body/query-supplied identifier. Returns `{ refreshed: true }`. Cookie expiry is capped by remaining server-side session lifetime; this does not extend that lifetime. Projection must succeed before scheduling the cookie. |
| `GET /api/policy/private/admin/audit` | Requires admin; calls its service only after authorization and returns only `{ entries }`.                                                                                                                                                                                           |

The native application error handler returns exactly `{ error: string }`, without changing the opt-in canonical library plugin. Zod request/service-input errors and malformed/empty JSON map to fixed 400 copy; native body limits map to 413, unsupported media types to 415, and scoped missing routes to 404. Explicit `ApplicationError` instances preserve integer 400–599 statuses; bounded trusted 4xx copy is application-supplied, while all 5xx copy is fixed. An optional integer Retry-After of 0–86400 seconds is preserved. Never construct this class from raw exception messages or client input. Unrecognized thrown values/statuses, invalid service output and mutated invalid error settings fail closed with fixed 500 copy. Successful response shapes are not enveloped or rewritten.

Tests assert exact status/headers/bodies, early-denial service counts, scope inheritance, concurrent request isolation, cookie attributes/lifetime and safe projection. The network test creates only task-owned ephemeral loopback listeners, exercises duplicate raw headers, closes the app and proves its port can be rebound and released. Injection/emitted cookie attributes do **not** prove browser cookie acceptance, SameSite enforcement or actual network timeout behavior. Independent security/contract review remains required for changes to these boundaries.

Authoritative compatibility/API references consulted:

- https://github.com/fastify/fastify-type-provider-typebox#compatibility
- https://github.com/fastify/fastify-plugin#metadata
- https://fastify.dev/docs/latest/Reference/Logging/
- https://fastify.dev/docs/latest/Reference/Hooks/
- https://fastify.dev/docs/latest/Reference/Server/#setnotfoundhandler
- https://github.com/fastify/fastify-cookie/tree/v11.1.3
- https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-name-prefixes-2
