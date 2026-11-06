# @ljay/http

Private ESM bounded JSON transport for browsers and Node with platform-compatible fetch, AbortController, and Web Streams. No React, CommonJS entry point, or CSS setup is required. The repository validates Node 26.13.0; other runtimes need consumer verification. Public exports and declarations are listed in [package.json](package.json).

## Imports

```ts
import { fetchJson, HttpError } from "@ljay/http";

const status = await fetchJson("https://example.test/api/health", {
  timeoutMs: 10_000,
  maxResponseBytes: 4096,
  decode(value) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("status" in value) ||
      value.status !== "ok"
    ) {
      throw new Error("Unexpected health payload");
    }
    return value.status;
  },
});
```

Use an application URL, not the illustrative host. Node requires absolute URLs; browser-relative URLs use native fetch semantics. `decode` is required and receives `unknown`; TypeScript types do not validate JSON at runtime. Optional `fetch` injects a platform-compatible implementation, `signal` cancels work, and `request` forwards RequestInit options except its signal.

## Transport boundaries

The default whole-operation timeout is 10,000 ms; `timeoutMs` must be an integer from 1 through 2,147,483,647. The default response limit is 1,048,576 bytes; `maxResponseBytes` must be a positive safe integer. Invalid limits throw TypeError before I/O. The byte bound applies to actual fetch stream bytes on success **and error**, not just Content-Length; one delivered chunk can exceed the bound before rejection. Error bodies are discarded, not reflected.

Success requires UTF-8 JSON (`application/json` or `application/*+json`). Empty/204 bodies, invalid UTF-8/JSON, and decoder failures are errors. Cancellation/deadlines cover fetching, reading, and awaiting an async decoder, but cannot interrupt synchronous JS or stop an already-running decoder. Keep decoders bounded, side-effect-free, and responsible for their own resources.

`HttpError.code` is `aborted`, `timeout`, `network`, `status`, `size`, `content_type`, `json`, or `decode`; `status` is available for response-related failures. Messages are fixed and omit URL, headers, bodies, abort reasons, and decoder diagnostics. A size failure takes precedence over an unsuccessful HTTP status when its body exceeds the limit. Do not expect an original cause or raw server message.

## Application policy

Applications own method/body/headers, credentials, authentication/CSRF, redirect and cache policy, domain validation, retries, and query caches. This transport does not retry writes or install a cache. Defaults of the selected fetch implementation apply when request options are omitted. Use application cancellation signals and map safe error codes to accessible user-facing copy; never expose raw diagnostics or secrets. This package renders no UI and supplies no live announcements or theme.

## Verification

Use the application's tests with injected fetch/streams to check decoding, limits, cancellation, safe errors, and any retry/cache policy. Validate required Web APIs in the deployment runtime. The detailed maintainer contract is `docs/HTTP.md` in the private source repository, not a file shipped with this package.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Preserve applicable third-party notices.
