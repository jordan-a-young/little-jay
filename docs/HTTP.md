# JSON transport

`@ljay/http` is a private ESM browser/Node package with one operation, `fetchJson`, and a structured `HttpError`. The playground's health query is its first consumer.

```ts
import { fetchJson, HttpError } from "@ljay/http";

const status = await fetchJson("/api/health", {
  signal,
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

## Contract

- `url` is a string or URL. Native fetch interprets it; Node requires an absolute URL. `fetch` optionally injects a platform-compatible implementation; the global fetch is resolved at call time.
- `decode` is required and receives `unknown`. Return a validated value or throw/reject. Synchronous and asynchronous decoders are supported. The library never evaluates response text as code or assumes TypeScript provides runtime validation.
- `signal` cancels fetching, reading, or awaiting a decoder. Preaborted requests do not call fetch. The transport uses an internal signal, so signal identity differs from the caller's signal. Private abort reasons are not propagated.
- `timeoutMs` defaults to 10,000 and must be an integer from 1 through 2,147,483,647. It covers fetch, body reading, and asynchronous decoding. No JS timeout can interrupt synchronous decoder work; applications must keep decoders bounded. An in-progress decoder cannot be forcibly stopped, so it should be side-effect-free.
- `maxResponseBytes` defaults to 1,048,576 and must be a positive safe integer. The transport counts actual stream bytes for success **and error** responses, independent of Content-Length. Bodies are canceled and reader locks released on failure; deadlines and caller listeners are cleaned up. The bound applies to bytes exposed by fetch (normally decompressed), not compressed wire bytes. One already-delivered chunk may exceed the limit before it can be rejected.
- Successful responses require `application/json` or `application/*+json`, with absent charset or UTF-8 charset. Invalid UTF-8, malformed JSON, empty bodies (including 204), and invalid decoded schemas fail. Error-status bodies are bounded and discarded without parsing or reflection.
- `request` forwards native RequestInit options except `signal`. Applications own method/body/headers, credentials, redirects, cache policy, and any retries. Platform defaults apply when omitted. No retry, cache, auth, CSRF, or domain-specific schema layer is added.

`HttpError.code` is one of `aborted`, `timeout`, `network`, `status`, `size`, `content_type`, `json`, or `decode`. `message` is fixed by that code; `status` is available for response-related failures. There is no original cause, URL, response body, response headers, or raw decoder message. The ordinary Error stack describes the local call path, not a server-provided stack. Invalid local limits throw TypeError before I/O. A size error takes precedence over an unsuccessful status when the body exceeds its bound.

TanStack Query continues to own the playground's query key, 30-second stale window, cancellation, offline pause/resume, cache, and explicit refresh. Its health query sets `retry: false`; the transport never retries writes. Applications may map safe error codes to user-facing copy without showing raw diagnostics.
