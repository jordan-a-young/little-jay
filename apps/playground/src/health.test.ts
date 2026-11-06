import { QueryClient, isCancelledError, onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { healthQueryOptions } from "./health.js";

afterEach(() => vi.unstubAllGlobals());

describe("playground health query", () => {
  it("retains cached results while offline and resumes through Query on reconnect", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", request);
    const client = new QueryClient();
    client.mount();
    try {
      await client.fetchQuery(healthQueryOptions);
      await client.invalidateQueries({ queryKey: healthQueryOptions.queryKey });
      onlineManager.setOnline(false);
      const result = client.fetchQuery(healthQueryOptions);
      expect(client.getQueryState(healthQueryOptions.queryKey)?.fetchStatus).toBe("paused");
      expect(client.getQueryData(healthQueryOptions.queryKey)).toBe("ok");
      expect(request).toHaveBeenCalledTimes(1);
      onlineManager.setOnline(true);
      expect(await result).toBe("ok");
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      onlineManager.setOnline(true);
      client.unmount();
      client.clear();
    }
  });
  it("reuses fresh results and fetches again after invalidation", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", request);
    const client = new QueryClient();
    try {
      expect(await client.fetchQuery(healthQueryOptions)).toBe("ok");
      expect(await client.fetchQuery(healthQueryOptions)).toBe("ok");
      expect(request).toHaveBeenCalledTimes(1);
      await client.invalidateQueries({ queryKey: healthQueryOptions.queryKey });
      expect(await client.fetchQuery(healthQueryOptions)).toBe("ok");
      expect(request).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  });

  it("rejects unexpected responses without retries or treating them as healthy", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ status: "unexpected" }));
    vi.stubGlobal("fetch", request);
    const client = new QueryClient();
    try {
      await expect(client.fetchQuery(healthQueryOptions)).rejects.toThrow(
        "Response did not match the expected schema",
      );
      expect(request).toHaveBeenCalledTimes(1);
      expect(client.getQueryData(healthQueryOptions.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  });

  it("passes query cancellation to the native fetch request", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), {
            once: true,
          });
        }),
    );
    vi.stubGlobal("fetch", request);
    const client = new QueryClient();
    try {
      const result = client.fetchQuery(healthQueryOptions).catch((error: unknown) => error);
      await client.cancelQueries({ queryKey: healthQueryOptions.queryKey });
      expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(isCancelledError(await result)).toBe(true);
    } finally {
      client.clear();
    }
  });
});
