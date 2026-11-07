import { act, type ReactNode, type MouseEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./index.js";

describe("Breadcrumb", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([
    [Breadcrumb, "nav", "lj-breadcrumb"],
    [BreadcrumbList, "ol", "lj-breadcrumb-list"],
    [BreadcrumbItem, "li", "lj-breadcrumb-item"],
    [BreadcrumbSeparator, "span", "lj-breadcrumb-separator"],
    [BreadcrumbPage, "span", "lj-breadcrumb-page"],
  ] as const)(
    "forwards native props/ref and additive styling with %s",
    async (Component, tag, className) => {
      let reference: HTMLElement | null = null;
      const onClick = vi.fn();
      let element: ReactNode = (
        <Component
          ref={(value: HTMLElement | null) => {
            reference = value;
          }}
          id="native-breadcrumb"
          className="consumer-class"
          data-source="test"
          hidden
          onClick={onClick}
        >
          {"<script>inert text</script>"}
        </Component>
      );
      if (tag === "li") element = <ol>{element}</ol>;
      await act(() => root.render(element));
      const native = container.querySelector<HTMLElement>("#native-breadcrumb")!;
      expect(reference).toBe(native);
      expect(native.tagName.toLowerCase()).toBe(tag);
      expect(native.classList.contains(className)).toBe(true);
      expect(native.classList.contains("consumer-class")).toBe(true);
      expect(native.getAttribute("data-source")).toBe("test");
      expect(native.hidden).toBe(true);
      expect(native.textContent).toBe("<script>inert text</script>");
      expect(native.querySelector("script")).toBeNull();
      await act(() => native.click());
      expect(onClick).toHaveBeenCalledOnce();
    },
  );

  it("composes a named navigation landmark, ordered list, native ancestors and one plain current item", async () => {
    const navigate = vi.fn((event: MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    await act(() =>
      root.render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <a href="/home" onClick={navigate}>
                Home
              </a>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbPage>Current page</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>,
      ),
    );
    const nav = container.querySelector("nav")!;
    expect(nav.getAttribute("aria-label")).toBe("Breadcrumb");
    expect(nav.querySelector("ol")?.getAttribute("role")).toBe("list");
    expect(nav.querySelectorAll("ol > li")).toHaveLength(2);
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    const page = nav.querySelector('[aria-current="page"]')!;
    expect(page.tagName).toBe("SPAN");
    expect(page.hasAttribute("tabindex")).toBe(false);
    expect(page.hasAttribute("aria-disabled")).toBe(false);
    const separator = nav.querySelector(".lj-breadcrumb-separator")!;
    expect(separator.getAttribute("aria-hidden")).toBe("true");
    expect(separator.textContent).toBe("/");
    expect(separator.closest("li")).toBe(page.closest("li"));
    const link = nav.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/home");
    link.focus();
    await act(() => link.click());
    expect(navigate).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(link);
  });

  it("supports a single current item, custom names and custom decorative separators without a provider", async () => {
    await act(() =>
      root.render(
        <Breadcrumb aria-label="Document location">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Home</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>,
      ),
    );
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Document location");
    expect(container.querySelector("a, .lj-breadcrumb-separator")).toBeNull();
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Home");
    await act(() =>
      root.render(
        <>
          <h2 id="location">Location</h2>
          <Breadcrumb aria-labelledby="location">
            <BreadcrumbList>
              <BreadcrumbItem>
                <a href="/home">Home</a>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbSeparator>›</BreadcrumbSeparator>
                <BreadcrumbPage>Notes</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </>,
      ),
    );
    expect(container.querySelector("nav")?.getAttribute("aria-labelledby")).toBe("location");
    expect(container.querySelector(".lj-breadcrumb-separator")?.textContent).toBe("›");
    expect(container.querySelector(".lj-breadcrumb-separator")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
  });
});
