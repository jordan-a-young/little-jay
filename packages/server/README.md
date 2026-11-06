# @littlejay/server

Node ESM Fastify foundations prepared for public npm distribution, currently using Fastify 5.12.8 and fastify-plugin 6.0.1. The repository validates Node 26.13.0; verify other supported Fastify runtimes in your application. No browser runtime, React, CSS, or CommonJS entry point is provided. See [package.json](package.json) and shipped declarations for public exports and Fastify types.

## Imports

```ts
import { createServer, healthRoutes, safeErrorsPlugin } from "@littlejay/server";

const app = createServer({ bodyLimit: 16_384 });
app.register(safeErrorsPlugin);
app.register(healthRoutes, { prefix: "/api", checks: [async () => true] });
app.get("/example", async () => ({ ok: true }));

try {
  const response = await app.inject("/api/health");
  console.log(response.statusCode);
} finally {
  await app.close();
}
```

The readiness check above is illustrative: replace it with bounded application checks. `createServer` only creates an ordinary Fastify instance. It does not listen, install routes/plugins automatically, attach signal handlers, or open service connections.

## Safe errors and probes

Register `safeErrorsPlugin` before the routes it should protect. It applies to its registering scope and descendants; register inside an application plugin to limit its scope. More-specific handlers may override it. Handled errors and not-found responses use `{ statusCode, error: { code, message } }`, with fixed canonical messages, never raw diagnostics. Integer error statuses 400–599 are preserved; others become 500. Canonical codes cover common client errors, other 4xx use `REQUEST_FAILED`, and 5xx use `INTERNAL_ERROR`.

The plugin does not sanitize existing logs or explicit application replies. Fastify validation, body limits, request IDs, low-level transport errors, and application logging/redaction remain separate concerns. Automatic request logs can include raw URLs; configure logging deliberately.

`healthRoutes` registers independent liveness at `/health` (200 `{ status: "ok" }`) and readiness at `/ready`. Override `healthPath`/`readinessPath`, or set either to `false`; normal Fastify registration prefixes apply. Readiness runs `checks` sequentially per request and returns 200 `{ status: "ready" }` only when every check returns exactly `true`. The first false result or exception returns 503 `{ status: "not_ready" }` without diagnostic details. No checks means ready. Checks own their deadlines, connections, and cleanup.

## Application policy

Applications own listening addresses, startup/shutdown, process signals, logging, authentication/authorization, schemas, domain routes, persistence, and service lifecycle. Safe error messages are not an authorization boundary or a guarantee that arbitrary replies/logs are safe. Keep private request data and exception diagnostics out of public responses. This package has no UI, accessibility announcements, or theme responsibilities.

## Verification

Use application tests with `app.inject()` rather than opening listeners where possible, and always close test instances. Check plugin encapsulation/order, protected routes, safe errors, and failing/timed-out readiness dependencies. Validate real lifecycle/logging policy at the application boundary. The detailed maintainer contract is `docs/SERVER.md` in the private source repository, not an installed file.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Preserve Fastify and other dependency notices.
