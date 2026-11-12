# Server contracts

`@littlejay/server` exports `createServer`, `safeErrorsPlugin`, and `healthRoutes`, their option/response types, and the existing Fastify types. The factory only creates Fastify: routes, listener startup, shutdown, and process listeners remain app-owned.

## Consumer-owned Fastify and compatibility

Fastify is a `~5.12.7` peer dependency, not a bundled/runtime dependency; consumers declare their compatible Fastify installation directly. Development retains exactly 5.12.8 and fastify-plugin 6.0.1. Existing factory, plugin and safe-response contracts are unchanged. The [installed server guide](../packages/server/README.md#compatibility) describes installation and the migration from transitive Fastify ownership.

`pnpm test:server-compat` packs the current built server library and checks isolated ESM/strict NodeNext consumers against Fastify 5.12.7 and 5.12.8 on Node 24.18.0 and 26.13.1. The fixture uses Node-major-specific typings (24.19.2 / 26.6.6), does not skip declaration checking, and checks shared Fastify resolution, native plugins and augmentation, typed requests/replies/decorators, hooks, readiness, injection, closing and an application-owned loopback listener. Its logging fixture exercises disabled/configured/injected native logging, serializers/redaction, disabled automatic request logging and safe operational events across request outcomes. Its static fixture stages and hashes the actual application-owned hosting/configuration modules, installs consumer-owned `@fastify/static@10.1.7`, and checks assets, fallback exclusions, protected misses, response headers and native file serving. Both fixtures verify listener release after closing. This is compatibility evidence for these combinations, not a production deployment or all-version guarantee.

Build first using the repository's pinned Node 26.13.1/pnpm 12.18.0 toolchain. Set `LITTLEJAY_NODE24` to the absolute path of an already-installed Node 24.18.0 executable:

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
- `startDemo(environment, dependencies?, createApplication?)` in `startup.ts` parses only `HOST` and `PORT` from its explicit environment argument before constructing the app. Defaults are `127.0.0.1:5050`; host is restricted to `127.0.0.1` or `::1`, and port to integers 1–65535. An optional ready, non-listening factory composes another application, including the operational example, without replacing the default async demo; `dependencies` applies only to the default factory. A supplied factory owns initialization rollback until it returns.
- The runner installs its two signal handlers before initialization and retains them through listening and cleanup. SIGINT, SIGTERM and repeated `stop()` calls converge on one awaited shutdown. A signal during initialization prevents later listening; a signal while listening is being established waits for startup settlement before closing. Only the runner's handlers are removed, after cleanup settles. A startup interrupted before listening can return an already-closed app; the process entry point does not announce it as listening. Initialization/listen and cleanup failures retain internal causes, while the CLI emits fixed diagnostics and sets a failing exit status. Cancellation is cooperative; nonsettling initialization or cleanup can delay shutdown.
- `server.ts` alone loads an optional `.env` from the process working directory before validation (`apps/api/` when invoked through the workspace scripts). Only a missing file is ignored; other loading failures stop startup with fixed safe diagnostics. Imports of `startup.ts` or either factory never load environment files or install handlers. The process entry point prints only the listener origin or fixed failure messages; optional `.env` loading does not change the original API entry point.

For isolated bindings, use `HOST=127.0.0.1 PORT=5051 pnpm dev:server` on Unix, or set those environment variables in PowerShell before running the command. See [isolated application startup](../apps/AGENTS.md#isolated-development). Build with `pnpm --filter '@littlejay/api...' build` before standalone API tests: `async-app/process.test.ts` executes compiled application modules in task-owned child processes. Injection, real loopback and child-process tests use synthetic data; process checks verify exit status, safe output and listener release. Built-demo and watcher checks must also verify application/wrapper cessation, not merely disappearance of a wrapper PID.

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

## Operational logging and resource example

`apps/api/src/examples/operational-app/` composes application-owned native logging and injected resource cleanup in one ready, non-listening factory. It preserves the canonical safe-error and TypeBox contracts, independent liveness/readiness, both existing startup entry points and the frontend-only catalog. It is not mounted by either startup command. The policy example remains separate; this is not the final combined security/static-hosting consumer or a production resource framework.

Build prerequisites, then run the focused examples from the root:

```sh
pnpm --filter '@littlejay/api...' build
pnpm test apps/api/src/examples/operational-app
```

### Explicit ownership and configuration

- `parseOperationalConfiguration(input)` accepts a strict object: boolean `backgroundWork` (default false), integer `workIntervalMs` 10–60000 (default 100) and integer `readinessTimeoutMs` 1–5000 (default 100). Invalid settings produce fixed diagnostics before acquisition. No environment variables or process handlers are read/installed by imports or factories.
- `createOperationalApp(configuration, dependencies, logging?)` revalidates configuration, registers safe errors and probes, starts the lifecycle during readiness, and returns a native Fastify instance only after successful initialization. Body limit is 16384 bytes, request timeout 15000 ms and `trustProxy: false`. Logging and background work default to disabled. The caller owns listening, signals, exit status and closing after listen failure.
- Initialization remains owned even if the native Fastify readiness-hook timeout fires first. Failed startup awaits that initialization's settlement and rollback/cleanup before rejecting; a late successful lifecycle is closed rather than orphaned, and closing prevents a later readiness hook from starting new acquisition. Cancellation remains cooperative, so a nonsettling callback can also delay this failed-startup handoff.
- Inject `acquire`, an ordered list of resource factories, optional `runWork(signal)` and optional `operation()`. A resource exposes `check(signal)` and async `close()`. Acquisitions run in dependency order; successful handles are released in reverse order. Each factory owns rollback for partial acquisition before it returns its handle. No database, filesystem data, external service, queue or credentials are supplied.
- `/api/operation` returns only a validated boolean `{ completed }`, never resource or dependency contents. `/api/text-preview` retains the existing bounded stateless contract. `/api/health` remains independent; `/api/ready` uses the lifecycle's bounded boolean checks and returns fixed safe status bodies.

### Logging and cancellation boundaries

`logging.ts` demonstrates native configured logging and fixed allowlisted operational-event reporting. Tests cover disabled logging, configured options/serializers/redaction and compatible injected loggers. Automatic request logging stays disabled: redaction alone is not a safe policy for raw URLs, arbitrary payloads or exception diagnostics. Operational events contain no request, configuration or caught exception data. Caller-supplied logging code and plugins remain application policy; the example does not sanitize arbitrary logs emitted elsewhere.

The supported native recipes use `logger` for configured options or `loggerInstance` for an injected compatible logger, plus `new LogController({ disableRequestLogging: true })`. Omit `logger` when supplying `loggerInstance`. Tests obtain a genuine compatible logger through a separate native Fastify instance's `.log`, rather than importing a transitive Pino dependency; that owner is closed separately. The application policy sets `requestIdHeader: false` so caller-supplied request IDs do not enter native log bindings. The destination's asynchronous errors, flushing, shutdown and delivery guarantees remain caller-owned. The packed matrix checks the two exact Fastify patch versions above; it does not claim every future version in the peer range has been exercised.

`lifecycle.ts` defensively validates a maximum of eight resources, strict background-work settings and bounded deadlines/intervals. Background work starts only when enabled and does not overlap itself. Cleanup first prevents further scheduling/checks, aborts and awaits active work/checks, then attempts all dependent-resource closes even if an individual close fails. Cleanup is idempotent, including a rejected cleanup result. Initialization/readiness failure rolls back acquired handles. Reporter failures must not prevent cleanup.

Callbacks must cooperate with cancellation and settle within their application-owned bounds. A deadline requests cancellation; it cannot forcibly terminate an arbitrary promise or third-party driver. Outstanding callbacks remain owned until settlement, so shutdown may wait for a non-cooperative implementation rather than pretend resources are safe to close. The synthetic tests demonstrate these ownership rules, not universal driver cancellation guarantees.

The example's combined regressions exercise successful/rejected/missing/validation/error requests, nonempty safe logs and exclusion of configured synthetic private markers, independent probes, disabled/active jobs, rollback and cleanup failures. `runner.test.ts` composes the real operational factory with the async runner over loopback, including repeated use, listener failure, startup signals and native-timeout rollback. `async-app/process.test.ts` adds actual child-process signal/failure/cleanup checks against built modules. Default commands still use the async demo; neither this runner seam nor separate passing examples establish the final combined security/static-hosting consumer. Packed runtime compatibility and independent security/lifecycle review remain separate verification gates; a passing focused suite does not substitute for them.

## Optional static hosting example

`apps/api/src/examples/static-hosting/` demonstrates application-owned optional hosting with `@fastify/static@10.1.7`. It does not add a shared hosting API, mount the policy or operational examples, replace either server entry point, or make the catalog depend on a backend. The static-plugin version is an exercised example target, not a universal consumer pin.

Build prerequisites and run its focused regressions from the root:

```sh
pnpm --filter '@littlejay/api...' build
pnpm test apps/api/src/examples/static-hosting
```

From an application-owned module under `apps/api/src/`, compose the ready non-listening demonstration factory:

```ts
import { createStaticHostingApp } from "./examples/static-hosting/app.js";

const app = await createStaticHostingApp(
  { enabled: true, root: "/absolute/canonical/public", entry: "index.html" },
  { cacheControl: "no-store", contentSecurityPolicy: "default-src 'self'; frame-ancestors 'none'" },
);
```

Call `createStaticHostingApp()` for API-only operation. The demonstration preserves the existing probes and stateless text-preview route. It does not start a listener: its caller owns `listen()` and `close()`, or can explicitly supply this factory to the existing `startDemo` seam. Existing startup commands still use their original factories.

For another application composition, `registerStaticHosting(app, configuration)` from `hosting.ts` registers a root-prefixed child after the caller's safe-error plugin and before `ready()`. It uses native `sendFile` without wildcard routes, retaining more-specific API not-found scopes. The registration seam does not install the demonstration's response-header policy or own readiness-failure cleanup. `parseStaticHostingConfiguration` and `parseStaticResponsePolicy` in `configuration.ts` validate explicit settings without filesystem access.

### Hosting and fallback boundaries

- API-only operation does not require or inspect a static root. Hosting is an explicit application choice, not an environment lookup or import side effect.
- Enabled hosting requires an absolute, canonical public-build root and a usable regular SPA entry file. Root and ancestor symlinks are rejected, as are relative, non-normalized and filesystem-root settings. Invalid or unavailable inputs fail startup with fixed safe diagnostics; filesystem paths and caught exception messages do not become client responses or CLI output.
- SPA fallback is limited to eligible extensionless frontend `GET` misses explicitly accepting `text/html` with positive quality. Missing Accept, wildcard-only Accept and explicit HTML rejection do not opt into fallback. Query strings do not change path eligibility.
- `/api` and its descendants, asset-like paths, blocked file paths and unsupported methods never receive SPA fallback. Existing assets support native bodyless `HEAD`; missing frontend `HEAD` requests do not receive the entry file. Static files must not shadow API routes or protected API misses.
- This example's conservative path profile rejects empty/dot-leading segments, trailing slashes except `/`, trailing dots/spaces, backslashes, ambiguous/double encoding and noncanonical percent spelling. Canonically encoded Unicode and internal spaces remain supported. A missing frontend path containing a dot in any segment is asset-like and cannot trigger fallback; an existing public file may still be served. Accept permits an explicit `text/html` range with only an optional valid `q` parameter; malformed/duplicate quality parameters, unsupported parameters or an explicit HTML zero-quality range fail closed. This is a documented example policy, not a claim to host every SPA URL convention unchanged.
- Public output must not contain dotfiles or escaping symlinks. Traversal, noncanonical request paths and filesystem escapes are denied rather than normalized into frontend navigation. Use a dedicated, trusted build-output directory, never a checkout, upload directory or secret/configuration root. Treat the served build as immutable while the application runs; these example checks are not protection from a hostile process concurrently replacing filesystem entries.
- Applications own CSP, security headers and caching. The example keeps conservative policy explicit and verifies headers on assets, fallback, API replies and errors; it does not prescribe immutable asset caching or weaken CSP for arbitrary applications.
- The demonstration defaults to `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` and a CSP permitting only same-origin external scripts/styles/images, with no inline execution. Native validators/automatic cache policy are disabled. Static 416 responses preserve only a validated native `Content-Range: bytes */<size>` header alongside the canonical safe body, not arbitrary error headers; the shared/API error handler is unchanged. Normal denied paths use canonical safe JSON; if a previously checked file disappears immediately before native delivery, the native sender returns fixed plain-text `404 Not Found` instead. These are Fastify lifecycle responses, not a promise about low-level parser failures outside that lifecycle.

The caller owns listening and closing. Existing runner composition remains opt-in and factories do not load environment files or install process handlers. Injection and owned-loopback checks exercise API/static separation and listener release; a targeted browser check additionally exercises external assets and a frontend deep-link reload.

Packed compatibility uses the existing `pnpm test:server-compat` matrix, with static hosting resolved through the packed server library and consumer-owned Fastify/static-plugin dependencies. It is separate from the repository's ordinary five-package consumer gate. Neither static hosting nor separate policy/operational suites establish the combined security/Zod/resource/SQLite consumer required by [#36](https://github.com/jordan-a-young/little-jay/issues/36), or actual Vision migration compatibility.

Authoritative compatibility/API references consulted:

- https://github.com/fastify/fastify-type-provider-typebox#compatibility
- https://github.com/fastify/fastify-plugin#metadata
- https://fastify.dev/docs/latest/Reference/Logging/
- https://fastify.dev/docs/latest/Reference/Hooks/
- https://fastify.dev/docs/latest/Reference/Server/#setnotfoundhandler
- https://github.com/fastify/fastify-cookie/tree/v11.1.3
- https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html#name-cookie-name-prefixes-2
- https://github.com/fastify/fastify-static/tree/v10.1.7
