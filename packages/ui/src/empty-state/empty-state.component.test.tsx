import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { EmptyState, type EmptyStateProps } from "./index.js";

describe("EmptyState", () => {
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
    vi.restoreAllMocks();
  });

  it("retains a direct strong title and no implicit announcement or heading by default", async () => {
    await act(() => root.render(<EmptyState title="No checkpoints yet" />));
    const panel = container.firstElementChild!;
    const title = panel.firstElementChild!;
    expect(panel.tagName).toBe("DIV");
    expect(title.tagName).toBe("STRONG");
    expect(title.textContent).toBe("No checkpoints yet");
    expect(title.classList.contains("block")).toBe(true);
    expect(title.classList.contains("font-semibold")).toBe(true);
    expect(panel.children).toHaveLength(1);
    expect(container.querySelector("h1, h2, h3, h4, h5, h6, [role], [aria-live]")).toBeNull();
  });

  it.each([1, 2, 3, 4, 5, 6] as const)(
    "renders level %s as a direct native heading without strong nesting or leaked props",
    async (titleLevel) => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      await act(() =>
        root.render(
          <EmptyState title={<span>No checkpoints yet</span>} titleLevel={titleLevel}>
            Supporting copy
          </EmptyState>,
        ),
      );
      const panel = container.firstElementChild!;
      const title = panel.firstElementChild!;
      expect(title.tagName).toBe(`H${titleLevel}`);
      expect(title.textContent).toBe("No checkpoints yet");
      expect(title.firstElementChild?.tagName).toBe("SPAN");
      expect(title.classList.contains("lj-empty-state-title")).toBe(true);
      expect(title.classList.contains("font-semibold")).toBe(true);
      expect(panel.querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(1);
      expect(panel.querySelector("strong")).toBeNull();
      expect(panel.hasAttribute("titleLevel")).toBe(false);
      expect(panel.hasAttribute("title")).toBe(false);
      expect(panel.hasAttribute("role")).toBe(false);
      expect(panel.hasAttribute("aria-live")).toBe(false);
      expect(consoleError).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, 2] as const)(
    "preserves root refs, native props, additive styling, body and actions with level %s",
    async (titleLevel) => {
      const ref = createRef<HTMLDivElement>();
      const onAction = vi.fn();
      await act(() =>
        root.render(
          <EmptyState
            ref={ref}
            title="No checkpoints yet"
            titleLevel={titleLevel}
            id="checkpoints"
            className="project-empty-state"
            style={{ maxWidth: "320px", fontSize: "18px" }}
            data-source="local"
            role="note"
            aria-label="Checkpoint availability"
            action={<button onClick={onAction}>Create local example</button>}
          >
            <p>Saved checkpoints will appear here.</p>
          </EmptyState>,
        ),
      );
      const panel = container.firstElementChild as HTMLDivElement;
      expect(ref.current).toBe(panel);
      expect(panel.id).toBe("checkpoints");
      expect(panel.getAttribute("data-source")).toBe("local");
      expect(panel.getAttribute("role")).toBe("note");
      expect(panel.getAttribute("aria-label")).toBe("Checkpoint availability");
      expect(panel.className).toContain("project-empty-state");
      expect(panel.className).toContain("bg-surface");
      expect(panel.className).toContain("text-content");
      expect(panel.style.maxWidth).toBe("320px");
      expect(panel.style.fontSize).toBe("18px");
      expect(panel.children).toHaveLength(3);
      expect(panel.children[1]?.className).toContain("break-words text-muted");
      expect(panel.children[1]?.querySelector("p")?.textContent).toBe(
        "Saved checkpoints will appear here.",
      );
      const button = panel.querySelector("button")!;
      expect(button.parentElement).toBe(panel.lastElementChild);
      await act(() => button.click());
      expect(onAction).toHaveBeenCalledOnce();
      expect(ref.current).toBe(panel);
    },
  );

  it.each([undefined, 1, 2, 3, 4, 5, 6] as const)(
    "retains long title/body strings as inert text with level %s",
    (titleLevel) => {
      const title = `<script>not executable</script>${"checkpoint".repeat(80)}`;
      const body = `<img src=x onerror=alert(1)>${"saved".repeat(100)}`;
      container.innerHTML = renderToStaticMarkup(
        <EmptyState title={title} titleLevel={titleLevel}>
          {body}
        </EmptyState>,
      );
      const panel = container.firstElementChild!;
      expect(panel.firstElementChild?.textContent).toBe(title);
      expect(panel.lastElementChild?.textContent).toBe(body);
      expect(panel.firstElementChild?.classList.contains("lj-empty-state-title")).toBe(true);
      expect(container.querySelector("script, img")).toBeNull();
    },
  );

  it.each([0, 7, -1, 2.5, "2", "h2", "script", "toString", null, {}, NaN])(
    "safely falls back to strong for unsupported JavaScript titleLevel %j",
    (titleLevel) => {
      container.innerHTML = renderToStaticMarkup(
        <EmptyState
          title="No checkpoints yet"
          titleLevel={titleLevel as EmptyStateProps["titleLevel"]}
        />,
      );
      const panel = container.firstElementChild!;
      expect(panel.firstElementChild?.tagName).toBe("STRONG");
      expect(panel.children).toHaveLength(1);
      expect(panel.hasAttribute("titleLevel")).toBe(false);
      expect(container.querySelector("h1, h2, h3, h4, h5, h6, script")).toBeNull();
    },
  );

  it("keeps the title choice restricted to six numeric levels without polymorphism", () => {
    expectTypeOf<EmptyStateProps["titleLevel"]>().toEqualTypeOf<
      1 | 2 | 3 | 4 | 5 | 6 | undefined
    >();
    expectTypeOf<"as" extends keyof EmptyStateProps ? true : false>().toEqualTypeOf<false>();
    expectTypeOf<"asChild" extends keyof EmptyStateProps ? true : false>().toEqualTypeOf<false>();
  });
});
