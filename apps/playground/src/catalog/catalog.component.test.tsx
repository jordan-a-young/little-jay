import { act, lazy, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createMemoryHistory, RouterContextProvider, RouterProvider } from "@tanstack/react-router";
import { createCatalogRouter } from "../router.js";
import { catalogRoutePath } from "./navigation.js";
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
  let router: ReturnType<typeof createCatalogRouter>;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("scrollTo", vi.fn());
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    router = createCatalogRouter(client, createMemoryHistory({ initialEntries: ["/"] }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: "ok" })),
    );
  });
  afterEach(async () => {
    await act(() => root.unmount());
    client.clear();
    router.history.destroy();
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderApp(hash = "#/button/default") {
    router.history.replace(hash.slice(1) || "/");
    await router.load();
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      ),
    );
  }

  it("reuses LoadingIndicator in one page-loading status without moving focus or remounting the shell", async () => {
    const page = catalogPages.find((candidate) => candidate.id === "button")!;
    const originalComponent = page.component;
    let finishLoading!: () => void;
    const loading = new Promise<{ default: () => ReactNode }>((resolve) => {
      finishLoading = () => resolve({ default: () => <p>Documentation ready.</p> });
    });
    page.component = lazy(() => loading);
    try {
      await renderApp();
      const status = Array.from(container.querySelectorAll('[role="status"]')).find(
        (region) => region.textContent === "Loading documentation…",
      )!;
      const indicator = status.querySelector(".lj-loading-indicator");
      expect(indicator).not.toBeNull();
      expect(container.querySelectorAll(".lj-loading-indicator")).toHaveLength(1);
      expect(indicator?.querySelector('[role="status"], [role="alert"]')).toBeNull();
      expect(
        indicator?.querySelector(".lj-loading-indicator-spinner")?.getAttribute("aria-hidden"),
      ).toBe("true");
      expect(status.querySelector("button, input, select, textarea, a, [tabindex]")).toBeNull();
      const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
      search.focus();
      await act(() => finishLoading());
      await vi.waitFor(() => expect(container.textContent).toContain("Documentation ready."));
      expect(container.querySelector(".lj-loading-indicator")).toBeNull();
      expect(container.textContent).not.toContain("Loading documentation…");
      expect(container.querySelector('input[type="search"]')).toBe(search);
      expect(document.activeElement).toBe(search);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      page.component = originalComponent;
    }
  });

  it("exposes named keyboard-focusable sidebar/content panes and retains the skip destination", async () => {
    await renderApp("#/tabs");
    const sidebar = container.querySelector<HTMLElement>(".catalog-sidebar")!;
    const main = container.querySelector<HTMLElement>("main")!;
    expect(sidebar.getAttribute("aria-label")).toBe("Catalog navigation");
    expect(sidebar.tabIndex).toBe(0);
    expect(main.getAttribute("aria-labelledby")).toBe(container.querySelector("h1")?.id);
    expect(main.tabIndex).toBe(0);
    const content = main.querySelector(".catalog-main-content")!;
    expect(content).not.toBeNull();
    expect(content.parentElement).toBe(main);
    expect(content.contains(container.querySelector("h1"))).toBe(true);
    expect(content.contains(container.querySelector(".catalog-document"))).toBe(true);
    expect(content.hasAttribute("tabindex")).toBe(false);
    await act(() => container.querySelector<HTMLAnchorElement>(".catalog-skip")!.click());
    expect(document.activeElement).toBe(main);
    expect(router.state.location.pathname).toBe("/tabs");
  });

  it("retains the native search input and separates empty results feedback, then restores navigation", async () => {
    await renderApp("#/button");
    const sidebar = container.querySelector(".catalog-sidebar")!;
    const search = sidebar.querySelector<HTMLInputElement>('input[type="search"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(() => {
      setter.call(search, "no-such-catalog-item");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const empty = sidebar.querySelector('[role="status"]')!;
    expect(empty.textContent).toBe("No matching components or guides.");
    expect(empty.classList.contains("catalog-search-empty")).toBe(true);
    expect(sidebar.querySelectorAll("nav a")).toHaveLength(0);
    await act(() => {
      setter.call(search, "");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(sidebar.querySelector('input[type="search"]')).toBe(search);
    expect(sidebar.querySelector('[role="status"]')).toBeNull();
    expect(sidebar.querySelectorAll("nav a")).toHaveLength(catalogPages.length);
  });

  it("gives preview settings, code panes, and workflow-state examples nameable roles", async () => {
    await renderApp("#/status-indicator");
    await vi.waitFor(() => expect(container.querySelector(".catalog-code pre")).not.toBeNull());
    expect(
      container
        .querySelector('.catalog-settings-popover[role="dialog"]')
        ?.getAttribute("aria-labelledby"),
    ).toBe(container.querySelector(".catalog-settings-heading h2")?.id);
    expect(
      container.querySelector(".catalog-page-header .catalog-settings-trigger")?.textContent,
    ).toBe("Settings");
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

  it.each([
    ["success", "Example saved", "text-success"],
    ["warning", "Review before continuing", "text-warning"],
  ])(
    "renders the %s Alert example with semantic styling and static announcement policy",
    async (tone, title, toneClass) => {
      await renderApp(`#/alert/${tone}`);
      await vi.waitFor(() =>
        expect(container.querySelector('.catalog-preview [role="note"]')).not.toBeNull(),
      );
      const alert = container.querySelector('.catalog-preview [role="note"]')!;
      expect(alert.className).toContain(toneClass);
      expect(alert.querySelector("strong")?.textContent).toBe(title);
      expect(alert.textContent).toContain("static example");
      expect(alert.querySelector("button")).toBeNull();
      expect(container.querySelector(".catalog-code")?.textContent).toContain(`tone="${tone}"`);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("lets the application dismiss and restore a local Alert with explicit focus restoration", async () => {
    await renderApp("#/alert/dismissible");
    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Dismiss local preview notice"]')).not.toBeNull(),
    );
    const close = container.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss local preview notice"]',
    )!;
    close.focus();
    await act(() => close.click());
    const showButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".catalog-preview button"),
    ).find((button) => button.textContent === "Show alert")!;
    expect(container.querySelector('[aria-label="Dismiss local preview notice"]')).toBeNull();
    expect(document.activeElement).toBe(showButton);
    expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toContain(
      "Notice dismissed",
    );
    await act(() => showButton.click());
    expect(container.querySelector('[aria-label="Dismiss local preview notice"]')).not.toBeNull();
    expect(document.activeElement).toBe(showButton);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps simulated loading app-owned with optional text and one announcement region", async () => {
    await renderApp("#/loading-indicator/local");
    await vi.waitFor(() =>
      expect(container.querySelector(".catalog-preview button")).not.toBeNull(),
    );
    const button = container.querySelector<HTMLButtonElement>(".catalog-preview button")!;
    button.focus();
    const status = container.querySelector('.catalog-preview [role="status"]')!;
    expect(status.textContent).toBe("Local preview is idle.");
    await act(() => button.click());
    expect(status.querySelector(".lj-loading-indicator")?.textContent).toBe(
      "Loading local preview…",
    );
    expect(container.querySelectorAll('.catalog-preview [role="status"]')).toHaveLength(1);
    expect(document.activeElement).toBe(button);
    await act(() => button.click());
    expect(status.querySelector(".lj-loading-indicator")).toBeNull();
    expect(status.textContent).toBe("Local preview is idle.");
    expect(fetch).not.toHaveBeenCalled();
    await renderApp("#/loading-indicator/default");
    await vi.waitFor(() =>
      expect(container.querySelectorAll(".catalog-preview .lj-loading-indicator")).toHaveLength(2),
    );
    expect(
      container.querySelector(".catalog-preview .lj-loading-indicator-label-hidden")?.textContent,
    ).toBe("Loading");
    expect(container.querySelector('.catalog-preview [role="status"]')).toBeNull();
  });

  it.each(["default", "query"])(
    "renders the hooks %s guide without starting the health query",
    async (example) => {
      await renderApp(`#/hooks/${example}`);
      await vi.waitFor(() => expect(container.querySelector(".catalog-preview")).not.toBeNull());
      expect(container.querySelector("h1")?.textContent).toBe("Hooks & data fetching");
      expect(container.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe(
        "/hooks",
      );
      expect(container.querySelector('.catalog-preview a[href="/api-connection"]')).not.toBeNull();
      expect(container.querySelector('.catalog-preview a[href="/workflow-form"]')).not.toBeNull();
      expect(
        container.querySelector(
          '.catalog-preview a[href="https://github.com/jordan-a-young/little-jay/blob/main/docs/HTTP.md"]',
        ),
      ).not.toBeNull();
      expect(container.querySelector('[aria-label="Usage code"]')?.textContent).toContain(
        "queryOptions",
      );
      expect(container.querySelector('[aria-label="Usage code"]')?.textContent).toContain(
        "queryFn: ({ signal })",
      );
      expect(container.querySelector('[aria-label="Usage code"]')?.textContent).toContain(
        "maxResponseBytes: 4096",
      );
      expect(container.textContent).toContain("QueryClientProvider");
      expect(container.textContent).toContain("useFormStatus");
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("renders alphabetical component navigation and preserves that order during search", async () => {
    await renderApp();
    const navigation = container.querySelector('nav[aria-label="Component catalog"]')!;
    const groups = Array.from(navigation.querySelectorAll("section"));
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
      "Foundations",
      "Components / Actions",
      "Components / Feedback",
      "Components / Forms",
      "Components / Inspection",
      "Patterns",
    ]);
    expect(
      groups.map((group) => Array.from(group.querySelectorAll("a"), (link) => link.textContent)),
    ).toEqual([
      ["Introduction", "Colors & themes", "Branding & Pebble", "Hooks & data fetching"],
      ["Button"],
      [
        "Alert",
        "EmptyState",
        "ErrorBoundary",
        "LoadingIndicator",
        "PebbleState",
        "StatusIndicator",
      ],
      [
        "Checkbox",
        "Combobox",
        "Field",
        "Input",
        "NativeSelect",
        "PasswordField",
        "Switch",
        "Textarea",
      ],
      [
        "Breadcrumb",
        "Card",
        "DescriptionList",
        "Dialog",
        "Disclosure",
        "IconButton",
        "Table",
        "Tabs",
        "TextBlock",
      ],
      ["Workflow form", "API connection"],
    ]);
    const search = container.querySelector('input[type="search"]')!;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        search,
        "feedback",
      );
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(
      Array.from(navigation.querySelectorAll("a"), (link) => link.getAttribute("href")),
    ).toEqual([
      "/alert",
      "/empty-state",
      "/error-boundary",
      "/loading-indicator",
      "/pebble-state",
      "/status-indicator",
    ]);
  });

  it.each(["default", "empty"])(
    "renders the Table %s deep link without requests",
    async (example) => {
      await renderApp(`#/table/${example}`);
      await vi.waitFor(() =>
        expect(container.querySelector(".catalog-preview table")).not.toBeNull(),
      );
      expect(container.querySelector("h1")?.textContent).toBe("Table");
      expect(container.querySelector(".catalog-preview caption")).not.toBeNull();
      expect(container.querySelector(".catalog-preview thead th")?.getAttribute("scope")).toBe(
        "col",
      );
      if (example === "default") {
        const button = container.querySelector<HTMLButtonElement>(".catalog-preview table button")!;
        button.focus();
        await act(() => button.click());
        expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toBe(
          "Local inspections: 1",
        );
        expect(document.activeElement).toBe(button);
      } else {
        expect(container.querySelector(".catalog-preview td")?.getAttribute("colspan")).toBe("2");
        expect(container.querySelector(".catalog-preview td")?.textContent).toContain(
          "No local drafts",
        );
      }
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("renders the local Combobox example with a selected ID in native FormData", async () => {
    await renderApp("#/combobox/default");
    await vi.waitFor(() =>
      expect(container.querySelector('.catalog-preview [role="combobox"]')).not.toBeNull(),
    );
    expect(container.querySelector("h1")?.textContent).toBe("Combobox");
    const input = container.querySelector<HTMLInputElement>('.catalog-preview [role="combobox"]')!;
    expect(input.value).toBe("Cedar");
    expect(input.labels?.[0]?.textContent).toContain("Choose a project");
    const form = container.querySelector<HTMLFormElement>(".catalog-preview form")!;
    expect(new FormData(form).get("project")).toBe("cedar");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders the local PasswordField example with a non-submit show/hide action and native reset", async () => {
    await renderApp("#/password-field/default");
    await vi.waitFor(() =>
      expect(container.querySelector('.catalog-preview input[type="password"]')).not.toBeNull(),
    );
    const input = container.querySelector<HTMLInputElement>(".catalog-preview input")!;
    const reveal = container.querySelector<HTMLButtonElement>(
      ".catalog-preview .lj-password-field button",
    )!;
    expect(container.querySelector("h1")?.textContent).toBe("PasswordField");
    expect(reveal.type).toBe("button");
    expect(reveal.textContent).toBe("Show password");
    const originalValue = input.value;
    await act(() => reveal.click());
    expect(container.querySelector(".catalog-preview input")).toBe(input);
    expect(input.type).toBe("text");
    expect(input.value).toBe(originalValue);
    expect(reveal.textContent).toBe("Hide password");
    await act(() =>
      container.querySelector<HTMLButtonElement>('.catalog-preview button[type="reset"]')!.click(),
    );
    expect(input.type).toBe("password");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["controlled", "states"])(
    "renders PasswordField %s without transmitting values",
    async (example) => {
      await renderApp(`#/password-field/${example}`);
      await vi.waitFor(() =>
        expect(container.querySelector(".catalog-preview .lj-password-field")).not.toBeNull(),
      );
      const input = container.querySelector<HTMLInputElement>(".catalog-preview input")!;
      if (example === "controlled") {
        expect(input.autocomplete).toBe("new-password");
        await act(() => {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
            input,
            "local-sample",
          );
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await act(() =>
          container
            .querySelector<HTMLButtonElement>(".catalog-preview .lj-password-field-toggle")!
            .click(),
        );
        expect(input.value).toBe("local-sample");
        await act(() =>
          container
            .querySelector<HTMLButtonElement>('.catalog-preview button[type="reset"]')!
            .click(),
        );
        expect(input.value).toBe("");
        expect(input.type).toBe("password");
      } else {
        expect(input.matches(":disabled")).toBe(true);
        expect(
          container
            .querySelector(".catalog-preview .lj-password-field-toggle")
            ?.matches(":disabled"),
        ).toBe(true);
        expect(
          container.querySelectorAll<HTMLInputElement>(".catalog-preview input")[1]!.readOnly,
        ).toBe(true);
        expect(
          container.querySelectorAll(".catalog-preview input")[2]?.getAttribute("aria-invalid"),
        ).toBe("true");
      }
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("shows real breadcrumb ancestors with one current page and no synthetic category links", async () => {
    await renderApp("#/button/disabled");
    await vi.waitFor(() =>
      expect(container.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull(),
    );
    const breadcrumb = container.querySelector('nav[aria-label="Breadcrumb"]')!;
    expect(breadcrumb.classList.contains("lj-breadcrumb")).toBe(true);
    expect(
      Array.from(breadcrumb.querySelectorAll("a"), (link) => [
        link.textContent,
        link.getAttribute("href"),
      ]),
    ).toEqual([
      ["Introduction", "/introduction"],
      ["Button", "/button"],
    ]);
    expect(breadcrumb.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent).toBe("Disabled");
    expect(breadcrumb.querySelector('[aria-current="page"]')?.tagName).toBe("SPAN");
    expect(breadcrumb.textContent).not.toContain("Components / Actions");
    const pageAncestor = breadcrumb.querySelectorAll<HTMLAnchorElement>("a")[1]!;
    pageAncestor.focus();
    await act(() => pageAncestor.click());
    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/button"));
    expect((document.activeElement as HTMLElement).id).toBe("catalog-page-title");
    expect(
      container.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')?.textContent,
    ).toBe("Button");
    expect(container.querySelector('nav[aria-label="Breadcrumb"] a[href="/button"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["default", "long"])(
    "renders the Breadcrumb %s deep link with native router-aware links",
    async (example) => {
      await renderApp(`#/breadcrumb/${example}`);
      await vi.waitFor(() =>
        expect(container.querySelector(".catalog-preview .lj-breadcrumb")).not.toBeNull(),
      );
      const breadcrumb = container.querySelector(".catalog-preview .lj-breadcrumb")!;
      expect(container.querySelector("h1")?.textContent).toBe("Breadcrumb");
      expect(breadcrumb.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      expect(breadcrumb.querySelector("a")?.getAttribute("href")).toBe("/introduction");
      expect(breadcrumb.querySelectorAll("ol > li")).toHaveLength(example === "default" ? 2 : 3);
      expect(
        Array.from(breadcrumb.querySelectorAll(".lj-breadcrumb-separator"), (separator) =>
          separator.getAttribute("aria-hidden"),
        ),
      ).toEqual(example === "default" ? ["true"] : ["true", "true"]);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(["ctrlKey", "metaKey", "shiftKey", "altKey"] as const)(
    "keeps modified breadcrumb %s clicks native without stealing focus",
    async (modifier) => {
      await renderApp("#/button/disabled");
      await vi.waitFor(() =>
        expect(
          container.querySelector('nav[aria-label="Breadcrumb"] a[href="/button"]'),
        ).not.toBeNull(),
      );
      const ancestor = container.querySelector<HTMLAnchorElement>(
        'nav[aria-label="Breadcrumb"] a[href="/button"]',
      )!;
      ancestor.focus();
      container.addEventListener("click", (event) => event.preventDefault(), { once: true });
      await act(() =>
        ancestor.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, [modifier]: true }),
        ),
      );
      expect(document.activeElement).toBe(ancestor);
      expect(router.state.location.pathname).toBe("/button/disabled");
    },
  );

  it.each([
    ["#/introduction", "Introduction", []],
    ["#/introduction/default", "Welcome", ["/introduction"]],
    ["#/button", "Button", ["/introduction"]],
    ["#/button/missing", "Example not found", ["/introduction", "/button"]],
    ["#/missing", "Page not found", ["/introduction"]],
  ] as const)("provides bounded breadcrumbs for %s", async (href, current, ancestorLinks) => {
    await renderApp(href);
    await vi.waitFor(() =>
      expect(container.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull(),
    );
    const breadcrumb = container.querySelector('nav[aria-label="Breadcrumb"]')!;
    expect(
      Array.from(breadcrumb.querySelectorAll("a"), (link) => link.getAttribute("href")),
    ).toEqual(ancestorLinks);
    expect(breadcrumb.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(breadcrumb.querySelector('[aria-current="page"]')?.textContent).toBe(current);
    expect(breadcrumb.textContent).not.toContain("missing");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses shared native Table primitives for the named keyboard-scrollable props reference", async () => {
    await renderApp();
    await vi.waitFor(() => expect(container.querySelector("table")).not.toBeNull());
    const scroll = container.querySelector('[aria-label="Props table"]')!;
    expect(scroll.classList.contains("lj-table-scroll")).toBe(true);
    expect(scroll.getAttribute("role")).toBe("region");
    expect((scroll as HTMLElement).tabIndex).toBe(0);
    expect(scroll.querySelector("table")?.classList.contains("lj-table")).toBe(true);
    expect(
      Array.from(scroll.querySelectorAll("thead th"), (header) => header.getAttribute("scope")),
    ).toEqual(["col", "col", "col"]);
    expect(scroll.querySelector("tbody th")?.getAttribute("scope")).toBe("row");
    expect(scroll.querySelector("tbody td")?.classList.contains("lj-table-cell")).toBe(true);
    expect(scroll.querySelector('[role="grid"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses Card and CardContent for the outer preview without adding a landmark or focus stop", async () => {
    await renderApp();
    await vi.waitFor(() => expect(container.querySelector(".catalog-preview")).not.toBeNull());
    const surface = container.querySelector(".catalog-preview-track")!;
    expect(surface.classList.contains("lj-card")).toBe(true);
    expect(surface.firstElementChild?.classList.contains("lj-card-content")).toBe(true);
    expect(surface.hasAttribute("role")).toBe(false);
    expect(surface.hasAttribute("tabindex")).toBe(false);
  });

  it.each(["default", "minimal"])(
    "renders the Card %s deep link without requests",
    async (example) => {
      await renderApp(`#/card/${example}`);
      await vi.waitFor(() =>
        expect(container.querySelector(".catalog-preview .lj-card")).not.toBeNull(),
      );
      expect(container.querySelector("h1")?.textContent).toBe("Card");
      expect(container.querySelector(".catalog-preview .lj-card")?.hasAttribute("role")).toBe(
        false,
      );
      expect(fetch).not.toHaveBeenCalled();
      if (example === "default") {
        const action = container.querySelector<HTMLButtonElement>(
          ".catalog-preview .lj-card-footer button",
        )!;
        action.focus();
        await act(() => action.click());
        expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toBe(
          "Local inspections: 1",
        );
        expect(document.activeElement).toBe(action);
      }
    },
  );

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

  it("demonstrates all theme variants without performing external actions", async () => {
    await renderApp("#/button/variants");
    await vi.waitFor(() =>
      expect(container.querySelector('[aria-label="Enabled button variants"]')).not.toBeNull(),
    );
    const enabled = container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Enabled button variants"] button',
    );
    const disabled = container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Disabled button variants"] button',
    );
    expect(Array.from(enabled, (button) => button.textContent)).toEqual([
      "Primary",
      "Secondary",
      "Outline",
      "Ghost",
      "Danger",
    ]);
    expect(disabled).toHaveLength(5);
    expect(Array.from(disabled).every((button) => button.disabled)).toBe(true);
    await act(() => enabled[4]!.click());
    expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toBe(
      "danger activated. Local demonstration only.",
    );
    expect(fetch).not.toHaveBeenCalled();
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
    await act(() =>
      router.navigate({
        to: catalogRoutePath,
        params: { pageId: "button", exampleId: "disabled" },
      }),
    );
    expect(container.querySelector<HTMLButtonElement>(".catalog-preview button")?.disabled).toBe(
      true,
    );
    await act(() =>
      router.navigate({ to: catalogRoutePath, params: { pageId: "input", exampleId: undefined } }),
    );
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Input"));
    expect(document.activeElement).toBe(container.querySelector("h1"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses underline example tabs with named panels and no cached inactive previews", async () => {
    await renderApp("#/button");
    await vi.waitFor(() => expect(container.textContent).toContain("Clicks: 0"));
    const tablist = container.querySelector('[role="tablist"][aria-label="Examples"]');
    expect(tablist).not.toBeNull();
    const selected = tablist!.querySelector('[role="tab"][aria-selected="true"]')!;
    expect(selected.textContent).toBe("Default / interactive");
    const panel = document.getElementById(selected.getAttribute("aria-controls")!)!;
    expect(panel.getAttribute("role")).toBe("tabpanel");
    expect(panel.getAttribute("aria-labelledby")).toBe(selected.id);
    expect(panel.querySelector(".catalog-preview")).not.toBeNull();
    expect(panel.querySelector(".catalog-code")).not.toBeNull();
    expect(container.querySelectorAll(".catalog-preview")).toHaveLength(1);
    expect(
      [...container.querySelectorAll("label")].map((label) => label.textContent),
    ).not.toContain("Example");
    await act(() => container.querySelector<HTMLButtonElement>(".catalog-preview button")!.click());
    expect(container.textContent).toContain("Clicks: 1");
    const tabs = [...tablist!.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    await act(() => tabs[1]!.click());
    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/button/variants"));
    expect(panel.querySelector(".catalog-preview")).toBeNull();
    expect(panel.hidden).toBe(true);
    await act(() => tabs[0]!.click());
    await vi.waitFor(() => expect(container.textContent).toContain("Clicks: 0"));
    expect(container.querySelectorAll(".catalog-preview")).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves example tabs, search, width and shell when changing examples and using history", async () => {
    await renderApp("#/button");
    await vi.waitFor(() => expect(container.textContent).toContain("Clicks: 0"));
    const tablist = container.querySelector('[role="tablist"][aria-label="Examples"]')!;
    const variants = [...tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (tab) => tab.textContent === "Theme variants",
    )!;
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        search,
        "button",
      );
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() => variants.focus());
    await act(() => variants.click());
    await vi.waitFor(() => expect(router.state.location.pathname).toBe("/button/variants"));
    expect(container.querySelector('[role="tablist"][aria-label="Examples"]')).toBe(tablist);
    expect(document.activeElement).toBe(variants);
    expect(variants.getAttribute("aria-selected")).toBe("true");
    expect(search.value).toBe("button");
    await act(() =>
      router.navigate({ to: catalogRoutePath, params: { pageId: "input", exampleId: undefined } }),
    );
    expect(document.activeElement).toBe(container.querySelector("h1"));
    expect(container.querySelector('input[type="search"]')).toBe(search);
    expect(search.value).toBe("button");
    await act(() => router.history.back());
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Button"));
    expect(router.state.location.pathname).toBe("/button/variants");
    expect(container.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe(
      "Theme variants",
    );
    await act(() => router.history.forward());
    await vi.waitFor(() => expect(container.querySelector("h1")?.textContent).toBe("Input"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shares the QueryClient with routes and retains fresh health data across navigation", async () => {
    await renderApp("#/api-connection");
    await vi.waitFor(() => expect(container.textContent).toContain("API is healthy"));
    expect(fetch).toHaveBeenCalledOnce();
    expect(router.options.context?.queryClient).toBe(client);
    expect(router.state.matches.at(-1)?.context.queryClient).toBe(client);
    expect(client.getQueryData(["api", "health"])).toBe("ok");
    await act(() =>
      router.navigate({ to: catalogRoutePath, params: { pageId: "hooks", exampleId: "query" } }),
    );
    await vi.waitFor(() =>
      expect(container.querySelector("h1")?.textContent).toBe("Hooks & data fetching"),
    );
    await act(() =>
      container
        .querySelector<HTMLAnchorElement>('.catalog-preview a[href="/api-connection"]')!
        .click(),
    );
    await vi.waitFor(() => expect(container.textContent).toContain("API is healthy"));
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("handles unknown pages and named examples with recovery navigation", async () => {
    await renderApp("#/missing");
    expect(container.textContent).toContain("Page not found");
    expect(container.querySelector('a[href="/introduction"]')).not.toBeNull();
    await act(() =>
      router.navigate({ to: catalogRoutePath, params: { pageId: "button", exampleId: "missing" } }),
    );
    await vi.waitFor(() => expect(container.textContent).toContain("Example not found"));
  });

  it("copies usage code and provides a manual fallback when clipboard access fails", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await act(() =>
      root.render(
        <RouterContextProvider router={router}>
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
          />
        </RouterContextProvider>,
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

  it("deep-links Tabs examples with local preserved drafts and caller-owned selection", async () => {
    await renderApp("#/tabs/default");
    await vi.waitFor(() =>
      expect(container.querySelector('.catalog-preview [role="tablist"]')).not.toBeNull(),
    );
    const draft = container.querySelector<HTMLInputElement>(".catalog-preview input")!;
    draft.value = "Unsaved local draft";
    const tab = (name: string) =>
      [...container.querySelectorAll<HTMLButtonElement>('.catalog-preview [role="tab"]')].find(
        (button) => button.textContent === name,
      )!;
    await act(() => tab("Preview").click());
    expect(
      container.querySelector('.catalog-preview [role="tabpanel"]:not([hidden])')?.textContent,
    ).toContain("Local preview only");
    await act(() => tab("Draft").click());
    expect(container.querySelector(".catalog-preview input")).toBe(draft);
    expect(draft.value).toBe("Unsaved local draft");
    await renderApp("#/tabs/controlled");
    await vi.waitFor(() =>
      expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toContain(
        "preview",
      ),
    );
    const external = [
      ...container.querySelectorAll<HTMLButtonElement>(".catalog-preview button"),
    ].find((button) => button.textContent === "Select draft externally")!;
    await act(() => external.click());
    expect(container.querySelector('.catalog-preview [role="status"]')?.textContent).toContain(
      "draft",
    );
    expect(fetch).not.toHaveBeenCalled();
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
            <RouterContextProvider router={router}>
              <PreviewContext value={{ width: "fluid", resetCount: 0 }}>
                <Page key={registration.id} pageId={registration.id} />
              </PreviewContext>
            </RouterContextProvider>
          </QueryClientProvider>,
        ),
      );
      expect(container.querySelector(".catalog-preview"), registration.id).not.toBeNull();
      expect(container.querySelector('[aria-label="Usage code"]'), registration.id).not.toBeNull();
      expect(container.textContent, registration.id).toContain("Accessibility & behavior");
    }
  });
});
