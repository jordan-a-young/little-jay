# @littlejay/http

ESM bounded JSON transport for browsers and Node with platform-compatible fetch, AbortController, and Web Streams, prepared for public npm distribution. No React, CommonJS entry point, or CSS setup is required. The repository validates Node 26.13.1; other runtimes need consumer verification. Public exports and declarations are listed in [package.json](package.json).

OpenCode and Codex: have the consuming project's `AGENTS.md` explicitly request this installed README for transport tasks. See the [shared setup/template](https://github.com/jordan-a-young/little-jay/blob/main/docs/CONSUMER-AGENTS.md); installation alone does not activate agent instructions.

## Imports

```ts
import { fetchJson, HttpError } from "@littlejay/http";

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

The charset may be absent or quoted/unquoted `UTF-8`. Quoted extension parameters respect backslash escapes and may contain semicolons or charset-like text: `application/json; profile="https://example.test/schema;charset=utf-16"` is accepted. An actual unsupported charset parameter, including one after a quoted extension, or an unterminated quoted value produces `content_type`.

`HttpError.code` is `aborted`, `timeout`, `network`, `status`, `size`, `content_type`, `json`, or `decode`; `status` is available for response-related failures. Messages are fixed and omit URL, headers, bodies, abort reasons, and decoder diagnostics. A size failure takes precedence over an unsuccessful HTTP status when its body exceeds the limit. Do not expect an original cause or raw server message.

## Application policy

Applications own method/body/headers, credentials, authentication/CSRF, redirect and cache policy, domain validation, retries, and query caches. This transport does not retry writes or install a cache. Defaults of the selected fetch implementation apply when request options are omitted. Use application cancellation signals and map safe error codes to accessible user-facing copy; never expose raw diagnostics or secrets. This package renders no UI and supplies no live announcements or theme.

## Optimization guidance

- Set response-byte and timeout budgets for the endpoint instead of increasing limits to hide slow/oversized responses. `fetchJson` buffers and parses a complete bounded JSON value; it is not an incremental JSON, download, or event-stream API. Use pagination or a suitable streaming API for large/unbounded data, without removing validation or bounds.
- Pass the caller's `signal`, including a query library's supplied signal, so abandoned work can stop. Keep decoding bounded and side-effect-free; a timeout cannot interrupt synchronous parsing/validation or forcibly stop an already-running decoder.
- Reuse the application's existing request cache/lifecycle layer, such as TanStack Query when already present. Choose query keys, stale windows, deduplication, invalidation and read retries there; do not add a second cache or a retry loop around mutations. Reuse the platform fetch implementation rather than adding a client just to call this helper.
- Measure request count, transferred/decoded bytes, end-to-end latency and decoding cost for a representative flow before and after changes. Do not log private URLs, headers, payloads or decoder diagnostics as benchmark evidence. Test cancellation and failure paths as well as success.

## Verification

Use the application's tests with injected fetch/streams to check decoding, limits, cancellation, safe errors, and any retry/cache policy. Validate required Web APIs in the deployment runtime. The detailed maintainer contract is `docs/HTTP.md` in the source repository, not a file shipped with this package.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Preserve applicable third-party notices.
