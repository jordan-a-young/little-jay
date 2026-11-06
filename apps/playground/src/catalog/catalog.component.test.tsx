import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { CatalogApp } from "../CatalogApp.js";
import { DocumentationPage } from "./DocumentationPage.js";
import { PreviewContext } from "../shell/PreviewFrame.js";
import ButtonPage from "./button/page.js";
import FormsPage from "./forms/page.js";
import FeedbackPage from "./feedback/page.js";
import FoundationsPage from "./foundations/page.js";
import PatternsPage from "./patterns/page.js";
import InspectionPage from "./inspection/page.js";
import { catalogPages } from "./registry.js";

vi.mock("../use-theme.js", () => ({
  useTheme: () => ({ theme: "light", preference: "system", setPreference: vi.fn() }),
}));

describe("component catalog", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    window.location.hash = "";
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ok" })),
    );
  });
  afterEach(async () => {
    await act(() => root.unmount());
    client.clear();
    container.remove();
    window.location.hash = "";
    vi.unstubAllGlobals();
  });

  async function renderApp(hash = "#/button/default") {
    window.location.hash = hash;
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <CatalogApp />
        </QueryClientProvider>,
      ),
    );
  }

  it("gives preview settings, code panes, and workflow-state examples nameable roles", async () => {
    await renderApp("#/status-indicator");
    await vi.waitFor(() => expect(container.querySelector(".catalog-code pre")).not.toBeNull());
    expect(
      container.querySelector('.catalog-toolbar[role="group"]')?.getAttribute("aria-label"),
    ).toBe("Preview settings");
    expect(container.querySelectorAll('.catalog-code pre[role="region"][aria-label]')).toHaveLength(
      2,
    );
    expect(
      container.querySelector('[aria-label="Example workflow states"]')?.getAttribute("role"),
    ).toBe("group");
  });

  it("announces empty-state action completion without announcing its static initial content", async () => {
    await renderApp("#/empty-state");
    await vi.waitFor(() =>
      expect(container.querySelector(".catalog-preview button")).not.toBeNull(),
    );
    const status = container.querySelector('.catalog-preview [role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent).toBe("");
    expect(status?.textContent).not.toContain("No checkpoints yet");
    await act(() => container.querySelector<HTMLButtonElement>(".catalog-preview button")!.click());
    expect(container.querySelector('.catalog-preview [role="status"]')).toBe(status);
    expect(status?.textContent).toBe("Example ready. Simulated only. No record was created.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses identical explicit SVG geometry for enabled and disabled refresh examples", async () => {
    await renderApp("#/icon-button");
    await vi.waitFor(() => expect(container.querySelectorAll(".lj-icon-button")).toHaveLength(2));
    const icons = container.querySelectorAll(".lj-icon-button svg");
    expect(icons).toHaveLength(2);
    expect(icons[0]?.outerHTML).toBe(icons[1]?.outerHTML);
    expect(icons[0]?.getAttribute("width")).toBe("20");
    expect(icons[0]?.getAttribute("height")).toBe("20");
  });

  it("renders docs, API reference, named examples, and search without mounting the health query", async () => {
    await renderApp();
    await vi.waitFor(() => expect(container.textContent).toContain("Clicks: 0"));
    expect(container.querySelector('a[aria-current="page"]')?.textContent).toBe("Button");
    expect(container.textContent).toContain("Accessibility & behavior");
    expect(container.querySelector("table")?.textContent).toContain("disabled");
    expect(fetch).not.toHaveBeenCalled();
    const search = container.querySelector('input[type="search"]')!;
    await act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(search, "pebble");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const links = container.querySelector('nav[aria-label="Component catalog"]')?.textContent;
    expect(links).toContain("PebbleState");
    expect(links).not.toContain("Button");
  });

  it("keeps preview state on width changes, resets it explicitly, and navigates by hash", async () => {
    await renderApp();
    await vi.waitFor(() => expect(container.textContent).toContain("Clicks: 0"));
    const clickButton = () =>
      Array.from(container.querySelectorAll("button")).find(
        (button) => button.textContent === "Continue",
      )!;
    await act(() => clickButton().click());
    expect(container.textContent).toContain("Clicks: 1");
    const width = Array.from(container.querySelectorAll("select")).find((select) =>
      select.textContent?.includes("640 px"),
    )!;
    await act(() => {
      width.value = "320";
      width.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.textContent).toContain("Clicks: 1");
    expect(container.querySelector<HTMLElement>(".catalog-preview")?.style.width).toBe("320px");
    await act(() =>
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Reset preview")!
        .click(),
    );
    expect(container.textContent).toContain("Clicks: 0");
    await act(() => {
      window.location.hash = "#/button/disabled";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.querySelector<HTMLButtonElement>(".catalog-preview button")?.disabled).toBe(
      true,
    );
    await act(() => {
      window.location.hash = "#/input";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Input"));
    expect(document.activeElement).toBe(container.querySelector("h1"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("handles unknown pages and named examples with recovery navigation", async () => {
    await renderApp("#/missing");
    expect(container.textContent).toContain("Page not found");
    expect(container.querySelector('a[href="#/introduction"]')).not.toBeNull();
    await act(() => {
      window.location.hash = "#/button/missing";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await vi.waitFor(() => expect(container.textContent).toContain("Example not found"));
  });

  it("copies usage code and provides a manual fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await act(() =>
      root.render(
        <DocumentationPage
          pageId="example"
          document={{
            overview: "Example",
            usage: "import example",
            props: [],
            accessibility: ["A note"],
            examples: [
              {
                id: "default",
                title: "Default",
                component: () => <p>Preview</p>,
                code: "<Example />",
              },
            ],
          }}
        />,
      ),
    );
    const copy = Array.from(container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Copy usage code",
    )!;
    await act(async () => copy.click());
    expect(writeText).toHaveBeenCalledWith("import example");
    expect(container.textContent).toContain("Copied.");
    writeText.mockRejectedValueOnce(new Error("Clipboard blocked"));
    await act(async () => copy.click());
    expect(container.textContent).toContain("Select and copy the code below");
  });

  it("keeps every registered page connected to documentation and a renderable default example", async () => {
    const pages = {
      Foundations: FoundationsPage,
      "Components / Actions": ButtonPage,
      "Components / Forms": FormsPage,
      "Components / Feedback": FeedbackPage,
      "Components / Inspection": InspectionPage,
      Patterns: PatternsPage,
    };
    for (const registration of catalogPages) {
      const Page = pages[registration.group];
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <PreviewContext value={{ width: "fluid", resetCount: 0 }}>
              <Page key={registration.id} pageId={registration.id} />
            </PreviewContext>
          </QueryClientProvider>,
        ),
      );
      expect(container.querySelector(".catalog-preview"), registration.id).not.toBeNull();
      expect(container.querySelector('[aria-label="Usage code"]'), registration.id).not.toBeNull();
      expect(container.textContent, registration.id).toContain("Accessibility & behavior");
    }
  });
});
