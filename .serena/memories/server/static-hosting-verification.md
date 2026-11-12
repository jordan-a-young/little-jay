# Static-hosting verification lessons

- Verified 2026-11-12: `inject()` and WHATWG URL clients can normalize dot segments before routing. Use the owned raw `node:http` requests in `apps/api/src/examples/static-hosting/network.test.ts` for traversal/noncanonical-path evidence; injection alone did not establish those boundaries.
- Native static 416 errors carry `Content-Range` in exception metadata, but the canonical safe-error plugin intentionally does not forward arbitrary error headers. Preserve only validated metadata in the application scope; see `hosting.ts` and the range/header-isolation regressions under the same example. Keep the shared safe-response boundary intact.
- In this repository's `vi.mock("node:fs/promises", { spy: true })` setup, relying only on `vi.restoreAllMocks()` left a `readdir` implementation override affecting a later test. The later test passed alone but failed in the file; explicitly restoring the owned method spy fixed both orders. See the filesystem-spelling regression in `app.test.ts`.
- Authoritative behavior and ownership remain in `docs/SERVER.md#optional-static-hosting-example`; these notes grant no implementation or service-control permission.
