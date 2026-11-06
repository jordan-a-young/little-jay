import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { healthQueryOptions } from "../../health.js";
import { ApiConnectionExample } from "./examples.js";

describe("API connection example", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const request = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    request.mockReset();
    request.mockImplementation(async () => Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", request);
    onlineManager.setOnline(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    client.clear();
    onlineManager.setOnline(true);
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderExample() {
    await act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <ApiConnectionExample />
        </QueryClientProvider>,
      ),
    );
  }

  async function expectText(text: string) {
    await vi.waitFor(async () => {
      await act(async () => {});
      expect(container.textContent).toContain(text);
    });
  }

  it("disables refresh during the initial request and enables it after a healthy response", async () => {
    let resolveResponse!: (response: Response) => void;
    request.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    await renderExample();
    const refresh = container.querySelector("button")!;
    expect(refresh.textContent).toBe("Checking…");
    expect(refresh.disabled).toBe(true);
    expect(container.textContent).toContain("Checking API…");
    await act(() => refresh.click());
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => resolveResponse(Response.json({ status: "ok" })));
    await expectText("API is healthy");
    expect(refresh.textContent).toBe("Refresh API");
    expect(refresh.disabled).toBe(false);
  });

  it("shows a safe error and allows a successful explicit refresh without automatic retries", async () => {
    request.mockRejectedValueOnce(new Error("Private transport diagnostic"));
    await renderExample();
    await expectText("Unable to reach the API");
    expect(container.textContent).not.toContain("Private transport diagnostic");
    expect(request).toHaveBeenCalledTimes(1);
    const refresh = container.querySelector("button")!;
    expect(refresh.disabled).toBe(false);
    await act(() => refresh.click());
    await expectText("API is healthy");
    expect(request).toHaveBeenCalledTimes(2);
    expect(container.textContent).not.toContain("Unable to reach the API");
  });

  it.each([false, true])(
    "explains an offline paused check with cached result=%s and resumes on reconnect",
    async (cached) => {
      if (cached) client.setQueryData(healthQueryOptions.queryKey, "ok");
      await client.invalidateQueries({ queryKey: healthQueryOptions.queryKey });
      onlineManager.setOnline(false);
      await renderExample();
      await expectText(
        cached
          ? "API check paused while offline; the last successful result is cached."
          : "API check paused while offline; no successful result yet.",
      );
      const refresh = container.querySelector("button")!;
      expect(refresh.textContent).toBe("Waiting for connection…");
      expect(refresh.disabled).toBe(true);
      expect(request).not.toHaveBeenCalled();
      await act(() => refresh.click());
      expect(request).not.toHaveBeenCalled();
      await act(async () => onlineManager.setOnline(true));
      await expectText("API is healthy");
      expect(request).toHaveBeenCalledTimes(1);
      expect(refresh.disabled).toBe(false);
    },
  );
});
