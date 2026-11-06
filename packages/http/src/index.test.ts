import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { fetchJson, HttpError } from "./index.js";

const decode = (value: unknown) => {
  if (typeof value !== "object" || value === null || !("ok" in value) || value.ok !== true)
    throw new Error("private schema input");
  return value.ok;
};
const injected = (response: Response) => vi.fn<typeof fetch>().mockResolvedValue(response);

afterEach(() => vi.useRealTimers());

describe("bounded JSON transport", () => {
  it("decodes in browser/Node fetch and leaves request policy to the caller", async () => {
    const request = injected(Response.json({ ok: true }));
    expect(
      await fetchJson("https://example.test", {
        decode,
        fetch: request,
        request: { method: "POST", body: "{}", credentials: "omit", cache: "no-store" },
      }),
    ).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      credentials: "omit",
      cache: "no-store",
    });
    expect(request.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("does not start preaborted requests or expose abort reasons", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(
      fetchJson("/secret", { decode, fetch: request, signal: AbortSignal.abort("secret") }),
    ).rejects.toMatchObject({ code: "aborted", message: "Request canceled" });
    expect(request).not.toHaveBeenCalled();
  });

  it.each(["aborted", "timeout"] as const)(
    "settles %s even when injected fetch ignores cancellation",
    async (code) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const request = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
      const result = fetchJson("/health", {
        decode,
        fetch: request,
        signal: controller.signal,
        timeoutMs: 20,
      });
      const assertion = expect(result).rejects.toMatchObject({ code });
      if (code === "aborted") controller.abort(new Error("private reason"));
      else await vi.advanceTimersByTimeAsync(20);
      await assertion;
      expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("cancels and unlocks an unfinished response body on caller abort", async () => {
    const canceled = vi.fn();
    const controller = new AbortController();
    const response = new Response(new ReadableStream({ cancel: canceled }));
    const result = fetchJson("/health", {
      decode,
      fetch: injected(response),
      signal: controller.signal,
    });
    const assertion = expect(result).rejects.toMatchObject({ code: "aborted" });
    await vi.waitFor(() => expect(response.body?.locked).toBe(true));
    controller.abort();
    await assertion;
    expect(canceled).toHaveBeenCalledTimes(1);
    expect(response.body?.locked).toBe(false);
  });

  it("times out stalled body reads and asynchronous decoders without leaking timers", async () => {
    vi.useFakeTimers();
    const canceled = vi.fn();
    const response = new Response(new ReadableStream({ cancel: canceled }));
    const bodyResult = fetchJson("/health", { decode, fetch: injected(response), timeoutMs: 20 });
    const bodyAssertion = expect(bodyResult).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(20);
    await bodyAssertion;
    expect(canceled).toHaveBeenCalledTimes(1);
    expect(response.body?.locked).toBe(false);
    const decodeResult = fetchJson("/health", {
      fetch: injected(Response.json({ ok: true })),
      decode: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    const decodeAssertion = expect(decodeResult).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(20);
    await decodeAssertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels late response bodies even if injected fetch ignores an earlier abort", async () => {
    const canceled = vi.fn();
    const response = new Response(new ReadableStream({ cancel: canceled }));
    let resolveFetch: (response: Response) => void = () => {};
    const request = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const controller = new AbortController();
    const result = fetchJson("/health", { decode, fetch: request, signal: controller.signal });
    const assertion = expect(result).rejects.toMatchObject({ code: "aborted" });
    controller.abort();
    await assertion;
    resolveFetch(response);
    await vi.waitFor(() => expect(canceled).toHaveBeenCalledTimes(1));
    expect(response.body?.locked).toBe(false);
  });

  it.each([200, 500])(
    "bounds streamed status %s regardless of a false Content-Length",
    async (status) => {
      const canceled = vi.fn();
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(new Uint8Array(5));
        },
        cancel: canceled,
      });
      const response = new Response(body, {
        status,
        headers: { "content-length": "1", "content-type": "application/json" },
      });
      await expect(
        fetchJson("/private", { decode, fetch: injected(response), maxResponseBytes: 8 }),
      ).rejects.toMatchObject({ code: "size", status });
      expect(canceled).toHaveBeenCalledTimes(1);
      expect(body.locked).toBe(false);
    },
  );

  it("accepts a byte-exact boundary, split UTF-8, and structured JSON media types", async () => {
    const bytes = new TextEncoder().encode('{"text":"é"}');
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
          controller.close();
        },
      }),
      { headers: { "content-type": 'application/problem+json; charset="UTF-8"' } },
    );
    expect(
      await fetchJson("/health", {
        decode: (value) => value,
        fetch: injected(response),
        maxResponseBytes: bytes.length,
      }),
    ).toEqual({ text: "é" });
    expect(response.body?.locked).toBe(false);
  });

  it.each([
    ["json", () => new Response("<secret>", { headers: { "content-type": "application/json" } })],
    [
      "json",
      () => new Response(Uint8Array.of(0xff), { headers: { "content-type": "application/json" } }),
    ],
    ["decode", () => Response.json({ secret: "private schema input" })],
    [
      "content_type",
      () => new Response('{"ok":true}', { headers: { "content-type": "text/html" } }),
    ],
    [
      "content_type",
      () =>
        new Response('{"ok":true}', {
          headers: { "content-type": "application/json; charset=utf-16" },
        }),
    ],
    ["status", () => new Response("private response", { status: 401 })],
  ] as const)("returns safe %s errors", async (code, response) => {
    try {
      await fetchJson("https://secret.test/token", { decode, fetch: injected(response()) });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ code });
      expect(String(error) + JSON.stringify(error)).not.toMatch(/secret|private|token/);
      expect((error as Error).cause).toBeUndefined();
    }
  });

  it("sanitizes network and asynchronous decoder failures and never retries writes", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("secret URL"));
    await expect(
      fetchJson("/write", { fetch: request, decode, request: { method: "POST" } }),
    ).rejects.toMatchObject({ code: "network" });
    expect(request).toHaveBeenCalledTimes(1);
    await expect(
      fetchJson("/health", {
        fetch: injected(Response.json({})),
        decode: async () => {
          throw new Error("secret");
        },
      }),
    ).rejects.toMatchObject({ code: "decode" });
  });

  it("cleans deadlines/listeners after success and rejects invalid limits before fetching", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    await fetchJson("/health", {
      fetch: injected(Response.json({ ok: true })),
      decode,
      signal: controller.signal,
    });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    const request = vi.fn<typeof fetch>();
    for (const limit of [0, -1, NaN, Infinity, 1.5]) {
      await expect(
        fetchJson("/health", { fetch: request, decode, maxResponseBytes: limit }),
      ).rejects.toBeInstanceOf(TypeError);
      await expect(
        fetchJson("/health", { fetch: request, decode, timeoutMs: limit }),
      ).rejects.toBeInstanceOf(TypeError);
    }
    expect(request).not.toHaveBeenCalled();
  });
});
