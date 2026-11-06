import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, RouterContextProvider } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createCatalogRouter } from "../../router.js";
import FormsPage from "./page.js";

vi.mock("../../use-theme.js", () => ({
  useTheme: () => ({ theme: "light", preference: "system", setPreference: vi.fn() }),
}));

describe("Switch catalog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let router: ReturnType<typeof createCatalogRouter>;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient();
    router = createCatalogRouter(client, createMemoryHistory({ initialEntries: ["/switch"] }));
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    client.clear();
    router.history.destroy();
    vi.unstubAllGlobals();
  });

  async function renderExample(exampleId: string) {
    await act(() =>
      root.render(
        <RouterContextProvider router={router}>
          <FormsPage pageId="switch" exampleId={exampleId} />
        </RouterContextProvider>,
      ),
    );
  }

  it("documents the public API and demonstrates caller-owned on/off state", async () => {
    await renderExample("controlled");
    const control = container.querySelector('[role="switch"]') as HTMLInputElement;
    expect(control.checked).toBe(false);
    expect(container.textContent).toContain("Notifications: Off");
    expect(container.textContent).toContain("checked / defaultChecked");
    await act(() => control.click());
    expect(control.checked).toBe(true);
    expect(container.textContent).toContain("Notifications: On");
  });

  it("provides enabled and disabled native examples", async () => {
    await renderExample("default");
    expect((container.querySelector('[role="switch"]') as HTMLInputElement).checked).toBe(true);
    await renderExample("disabled");
    const controls = [...container.querySelectorAll<HTMLInputElement>('[role="switch"]')];
    expect(controls.map((control) => control.disabled)).toEqual([true, true]);
    expect(controls.map((control) => control.checked)).toEqual([true, false]);
  });
});
