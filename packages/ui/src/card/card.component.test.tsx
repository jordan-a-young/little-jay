import { act, createRef } from "react";
import { readFile } from "node:fs/promises";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Card, CardHeader, CardContent, CardFooter } from "./index.js";
import { Button } from "../button/index.js";

const stylesheet = await readFile("packages/ui/src/styles.css", "utf8");
const footerRules = [...stylesheet.matchAll(/\.lj-card-footer(?::not\(\[hidden\]\))?\s*\{[^}]+\}/g)]
  .map((match) => match[0])
  .join("\n");

describe("Card", () => {
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
    [Card, "lj-card"],
    [CardHeader, "lj-card-header"],
    [CardContent, "lj-card-content"],
    [CardFooter, "lj-card-footer"],
  ] as const)(
    "forwards native div props and refs with %s styling",
    async (Component, className) => {
      const ref = createRef<HTMLDivElement>();
      const onClick = vi.fn();
      await act(() =>
        root.render(
          <Component
            ref={ref}
            id="native-card"
            className="project-card"
            data-source="test"
            onClick={onClick}
          >
            {"<script>inert text</script>"}
          </Component>,
        ),
      );
      const element = container.firstElementChild!;
      expect(ref.current).toBe(element);
      expect(element.tagName).toBe("DIV");
      expect(element.id).toBe("native-card");
      expect(element.classList.contains(className)).toBe(true);
      expect(element.classList.contains("project-card")).toBe(true);
      expect(element.getAttribute("data-source")).toBe("test");
      expect(element.textContent).toBe("<script>inert text</script>");
      expect(element.querySelector("script")).toBeNull();
      expect(element.hasAttribute("role")).toBe(false);
      expect(element.hasAttribute("tabindex")).toBe(false);
      await act(() => (element as HTMLDivElement).click());
      expect(onClick).toHaveBeenCalledOnce();
    },
  );

  it("composes explicit headings, named regions and actions without adding form behavior", async () => {
    const onAction = vi.fn();
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    await act(() =>
      root.render(
        <form>
          <Card role="region" aria-labelledby="card-title">
            <CardHeader>
              <h3 id="card-title">Draft notes</h3>
            </CardHeader>
            <CardContent>
              <input aria-label="Notes" defaultValue="Keep this draft" />
            </CardContent>
            <CardFooter>
              <Button onClick={onAction}>Inspect locally</Button>
            </CardFooter>
          </Card>
        </form>,
      ),
    );
    container.querySelector("form")!.addEventListener("submit", onSubmit);
    const card = container.querySelector(".lj-card")!;
    const button = container.querySelector("button")!;
    expect(card.getAttribute("aria-labelledby")).toBe("card-title");
    expect(card.children).toHaveLength(3);
    expect(container.querySelector("h3")?.textContent).toBe("Draft notes");
    button.focus();
    await act(() => button.click());
    expect(onAction).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
    expect(container.querySelector("input")?.value).toBe("Keep this draft");
  });

  it("preserves native hidden behavior without a reset and restores footer flex when shown", async () => {
    const style = document.createElement("style");
    style.textContent = footerRules;
    document.head.append(style);
    try {
      async function renderFooter(hidden: boolean) {
        await act(() =>
          root.render(
            <CardFooter hidden={hidden}>
              <Button>Optional action</Button>
            </CardFooter>,
          ),
        );
      }
      await renderFooter(true);
      const footer = container.querySelector<HTMLDivElement>(".lj-card-footer")!;
      const action = container.querySelector("button")!;
      expect(footer.hidden).toBe(true);
      expect(getComputedStyle(footer).display).toBe("none");
      await renderFooter(false);
      expect(container.querySelector("button")).toBe(action);
      expect(footer.hasAttribute("hidden")).toBe(false);
      expect(getComputedStyle(footer).display).toBe("flex");
    } finally {
      style.remove();
    }
  });

  it("allows a minimal surface without required sections or generated landmarks", async () => {
    await act(() => root.render(<Card>Plain content</Card>));
    expect(container.firstElementChild?.textContent).toBe("Plain content");
    expect(container.querySelector("header, footer, [role], [tabindex]")).toBeNull();
    await act(() =>
      root.render(
        <Card>
          <CardContent>Updated content</CardContent>
        </Card>,
      ),
    );
    expect(container.querySelector(".lj-card-content")?.textContent).toBe("Updated content");
  });
});
