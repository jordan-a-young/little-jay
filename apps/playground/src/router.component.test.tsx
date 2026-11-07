import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createCatalogRouter } from "./router.js";
import { catalogRoutePath } from "./catalog/navigation.js";

vi.mock("./use-theme.js", () => ({
  useTheme: () => ({ theme: "light", preference: "system", setPreference: vi.fn() }),
}));

describe("catalog routing compatibility", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let router: ReturnType<typeof createCatalogRouter>;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("scrollTo", vi.fn());
    vi.stubGlobal("fetch", vi.fn());
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient();
  });
  afterEach(async () => {
    await act(() => root.unmount());
    router?.history.destroy();
    client.clear();
    container.remove();
    window.history.replaceState(null, "", "/");
    vi.unstubAllGlobals();
  });

  async function renderRouter() {
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      ),
    );
  }

  it.each([
    ["/", "Introduction", undefined],
    ["", "Introduction", undefined],
    ["/button", "Button", undefined],
    ["/button/", "Button", undefined],
    ["/button/disabled", "Button", "Disabled"],
    ["pebble-states", "PebbleState", "All states / local demos"],
    ["/pebble-states", "Page not found", undefined],
    ["/%62utton/disabled", "Button", "Disabled"],
    ["/%ZZ", "Page not found", undefined],
    ["/%E0%A4", "Page not found", undefined],
    ["/button/default/extra", "Page not found", undefined],
    ["/button//extra", "Page not found", undefined],
    ["/%25", "Page not found", undefined],
    ["/button/%25", "Button", "Example not found"],
    ["/button/%2F", "Button", "Example not found"],
    ["/missing", "Page not found", undefined],
  ])("handles entry %s without starting requests", async (path, title, example) => {
    router = createCatalogRouter(client, createMemoryHistory({ initialEntries: [path] }));
    await renderRouter();
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe(title));
    if (example) {
      await vi.waitFor(() => {
        if (example === "Example not found") {
          expect(container.querySelector('[role="tab"][aria-selected="true"]')).toBeNull();
          expect(container.querySelector(".catalog-preview")).toBeNull();
          expect(container.textContent).toContain(example);
        } else {
          expect(
            container.querySelector('.catalog-example-tabs [aria-selected="true"]')?.textContent,
          ).toBe(example);
        }
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves prefixed hash links, legacy state and manual hash navigation", async () => {
    window.history.replaceState(
      { marker: "preserved" },
      "",
      "/little-jay/?preview=1#pebble-states",
    );
    router = createCatalogRouter(client);
    await renderRouter();
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("PebbleState"));
    expect(window.history.state.marker).toBe("preserved");
    expect(window.location.hash).toBe("#pebble-states");
    expect(container.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe(
      "/little-jay/?preview=1#/pebble-state",
    );
    await vi.waitFor(() =>
      expect(container.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull(),
    );
    expect(
      Array.from(container.querySelectorAll('nav[aria-label="Breadcrumb"] a'), (link) =>
        link.getAttribute("href"),
      ),
    ).toEqual(["/little-jay/?preview=1#/introduction", "/little-jay/?preview=1#/pebble-state"]);
    await act(async () => {
      window.location.hash = "#/button/disabled";
    });
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Button"));
    await act(async () => {
      window.location.hash = "#/%ZZ";
    });
    await vi.waitFor(() =>
      expect(container.querySelector("h1")?.textContent).toBe("Page not found"),
    );
    await act(() =>
      router.navigate({ to: catalogRoutePath, params: { pageId: "hooks", exampleId: undefined } }),
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")?.textContent).toBe("Hooks & data fetching"),
    );
    expect(window.location.pathname).toBe("/little-jay/");
    expect(window.location.search).toBe("?preview=1");
    expect(window.location.hash).toBe("#/hooks");
    expect(fetch).not.toHaveBeenCalled();
  });
});
