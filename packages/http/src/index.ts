const messages = {
  aborted: "Request canceled",
  timeout: "Request timed out",
  network: "Network request failed",
  status: "HTTP request failed",
  size: "Response exceeds the byte limit",
  content_type: "Expected a UTF-8 JSON response",
  json: "Invalid JSON response",
  decode: "Response did not match the expected schema",
} as const;

export type HttpErrorCode = keyof typeof messages;

/** Safe diagnostics only: no URL, response body, headers, abort reason, or original cause. */
export class HttpError extends Error {
  readonly code: HttpErrorCode;
  readonly status?: number;

  constructor(code: HttpErrorCode, status?: number) {
    super(messages[code]);
    this.name = "HttpError";
    this.code = code;
    this.status = status;
  }
}

export type FetchJsonOptions<T> = {
  decode: (value: unknown) => T | Promise<T>;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxResponseBytes?: number;
  request?: Omit<RequestInit, "signal">;
};

async function cancelBody(
  body: ReadableStream<Uint8Array> | ReadableStreamDefaultReader<Uint8Array>,
) {
  try {
    await body.cancel();
  } catch {
    return;
  }
}

function isJsonContentType(header: string | null) {
  const [mediaType, ...parameters] = (header ?? "").toLowerCase().split(";");
  if (!/^application\/(?:json|[a-z0-9!#$&^_.+-]+\+json)$/.test(mediaType?.trim() ?? ""))
    return false;
  return parameters.every((parameter) => {
    const [name, value, extra] = parameter.trim().split("=");
    return (
      name?.trim() !== "charset" ||
      (extra === undefined && /^(?:utf-8|"utf-8")$/.test(value?.trim() ?? ""))
    );
  });
}

/** One bounded JSON request. Apps own URLs, credentials, cache policy, retries, and decoding. */
export async function fetchJson<T>(url: string | URL, options: FetchJsonOptions<T>): Promise<T> {
  const { decode, signal, timeoutMs = 10_000, maxResponseBytes = 1_048_576 } = options;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647)
    throw new TypeError("timeoutMs must be an integer between 1 and 2147483647");
  if (!Number.isSafeInteger(maxResponseBytes) || maxResponseBytes < 1)
    throw new TypeError("maxResponseBytes must be a positive safe integer");
  if (signal?.aborted) throw new HttpError("aborted");

  const controller = new AbortController();
  let failure: HttpError | undefined;
  let rejectAbort: (error: HttpError) => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  function abort(code: "aborted" | "timeout") {
    if (failure) return;
    failure = new HttpError(code);
    rejectAbort(failure);
    controller.abort();
  }
  const onAbort = () => abort("aborted");
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => abort("timeout"), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  async function request() {
    const response = await (options.fetch ?? globalThis.fetch)(url, {
      ...options.request,
      signal: controller.signal,
    });
    if (failure) {
      if (response.body) void cancelBody(response.body);
      throw failure;
    }
    reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (failure) throw failure;
        if (chunk.done) break;
        byteLength += chunk.value.byteLength;
        if (byteLength > maxResponseBytes) throw new HttpError("size", response.status);
        if (response.ok && chunk.value.byteLength > 0) chunks.push(chunk.value);
      }
    }
    if (!response.ok) throw new HttpError("status", response.status);
    if (!isJsonContentType(response.headers.get("content-type")))
      throw new HttpError("content_type", response.status);
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw new HttpError("json", response.status);
    }
    try {
      return await decode(value);
    } catch {
      throw new HttpError("decode", response.status);
    }
  }

  try {
    return await Promise.race([request(), aborted]);
  } catch (error) {
    if (failure) throw failure;
    if (error instanceof HttpError) throw error;
    throw new HttpError("network");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    if (reader) {
      void cancelBody(reader);
      reader.releaseLock();
    }
  }
}
