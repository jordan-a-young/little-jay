# Bounded JSON transport

- `docs/HTTP.md` is the behavioral contract. Keep this package platform-fetch based and usable in both browser and Node; do not add React, application schemas, auth policy, retries, or caching.
- Decoders receive `unknown` and validate at runtime. Preserve size bounds on success and error bodies, content-type/UTF-8 checks, whole-operation deadlines, and cancellation during fetch/read/decode.
- Cancel bodies, release reader locks, and clean up timers/listeners on every relevant exit path. Do not leak abort reasons or raw URL/body/header/decoder diagnostics into `HttpError`.
- Extend `src/index.test.ts` for changed behavior, including failure and cleanup cases; use injected fetch/streams rather than external services. Run `pnpm test packages/http/src` from the root.
- For contract changes, update docs and isolated consumer coverage; do not silently change error codes, defaults, or precedence.
