import { act, createRef, type MouseEvent as ReactMouseEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ButtonLink } from "../button-link/index.js";
import { Link } from "./index.js";

describe.each([
  ["Link", Link, "lj-link"],
  ["ButtonLink", ButtonLink, "lj-button-link"],
] as const)("%s native anchor contract", (_name, Component, semanticClass) => {
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

  it("renders an anchor with additive semantic classes and native attributes/ref/style", async () => {
    const ref = createRef<HTMLAnchorElement>();
    await act(() =>
      root.render(
        <Component
          href="/guide?section=links#usage"
          ref={ref}
          id="guide-link"
          className="consumer-link"
          style={{ marginInlineStart: "3px" }}
          title="Read the guide"
          aria-label="Read navigation guide"
          data-source="consumer"
          target="_blank"
          rel="noopener noreferrer"
          download="guide.html"
          aria-current="page"
        >
          {"<script>inert label</script>"}
        </Component>,
      ),
    );
    const anchor = container.querySelector("a")!;
    expect(container.children).toHaveLength(1);
    expect(container.querySelector("button")).toBeNull();
    expect(anchor.hasAttribute("role")).toBe(false);
    expect(anchor.hasAttribute("tabindex")).toBe(false);
    expect(anchor.hasAttribute("aria-disabled")).toBe(false);
    expect(ref.current).toBe(anchor);
    expect(anchor.id).toBe("guide-link");
    expect(anchor.classList.contains(semanticClass)).toBe(true);
    expect(anchor.classList.contains("consumer-link")).toBe(true);
    expect(anchor.style.marginInlineStart).toBe("3px");
    expect(anchor.getAttribute("href")).toBe("/guide?section=links#usage");
    expect(anchor.title).toBe("Read the guide");
    expect(anchor.getAttribute("aria-label")).toBe("Read navigation guide");
    expect(anchor.dataset.source).toBe("consumer");
    expect(anchor.target).toBe("_blank");
    expect(anchor.rel).toBe("noopener noreferrer");
    expect(anchor.download).toBe("guide.html");
    expect(anchor.getAttribute("aria-current")).toBe("page");
    expect(anchor.textContent).toBe("<script>inert label</script>");
    expect(anchor.querySelector("script")).toBeNull();
    anchor.focus();
    expect(document.activeElement).toBe(anchor);
  });

  it("forwards native hidden and preserves the same anchor when it is revealed", async () => {
    await act(() =>
      root.render(
        <Component href="#details" hidden>
          Details
        </Component>,
      ),
    );
    const anchor = container.querySelector("a")!;
    expect(anchor.hidden).toBe(true);
    expect(anchor.hasAttribute("hidden")).toBe(true);
    await act(() =>
      root.render(
        <Component href="#details" hidden={false}>
          Details
        </Component>,
      ),
    );
    expect(container.querySelector("a")).toBe(anchor);
    expect(anchor.hidden).toBe(false);
    expect(anchor.hasAttribute("hidden")).toBe(false);
  });

  it("leaves ordinary click cancellation to the caller", async () => {
    const initiallyPrevented: boolean[] = [];
    const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
      initiallyPrevented.push(event.defaultPrevented);
      event.preventDefault();
    });
    await act(() =>
      root.render(
        <Component href="#details" onClick={onClick}>
          Details
        </Component>,
      ),
    );
    const anchor = container.querySelector("a")!;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    await act(() => anchor.dispatchEvent(event));
    expect(onClick).toHaveBeenCalledOnce();
    expect(initiallyPrevented).toEqual([false]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("preserves an already-cancelled event for the caller", async () => {
    const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
      expect(event.defaultPrevented).toBe(true);
    });
    await act(() =>
      root.render(
        <Component href="#details" onClick={onClick}>
          Details
        </Component>,
      ),
    );
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    event.preventDefault();
    await act(() => container.querySelector("a")!.dispatchEvent(event));
    expect(onClick).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    ["Control", { ctrlKey: true }],
    ["Meta", { metaKey: true }],
    ["Shift", { shiftKey: true }],
    ["Alt", { altKey: true }],
  ] as const)("forwards %s-modified clicks without cancellation", async (_modifier, modifiers) => {
    const onClick = vi.fn();
    const onParentClick = vi.fn();
    await act(() =>
      root.render(
        <div onClick={onParentClick}>
          <Component href="#details" onClick={onClick}>
            Details
          </Component>
        </div>,
      ),
    );
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...modifiers });
    await act(() => container.querySelector("a")!.dispatchEvent(event));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onParentClick).toHaveBeenCalledOnce();
    expect(onClick.mock.calls[0]![0].nativeEvent).toBe(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("forwards middle auxiliary clicks without synthetic primary activation", async () => {
    const onClick = vi.fn();
    const onAuxClick = vi.fn();
    await act(() =>
      root.render(
        <Component href="#details" onClick={onClick} onAuxClick={onAuxClick}>
          Details
        </Component>,
      ),
    );
    const event = new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 });
    await act(() => container.querySelector("a")!.dispatchEvent(event));
    expect(onAuxClick).toHaveBeenCalledOnce();
    expect(onAuxClick.mock.calls[0]![0].button).toBe(1);
    expect(onClick).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it.each(["Enter", " "])(
    "does not synthesize button activation or cancel %j key events",
    async (key) => {
      const onClick = vi.fn();
      const onKeyDown = vi.fn();
      const onKeyUp = vi.fn();
      await act(() =>
        root.render(
          <Component href="#details" onClick={onClick} onKeyDown={onKeyDown} onKeyUp={onKeyUp}>
            Details
          </Component>,
        ),
      );
      const anchor = container.querySelector("a")!;
      anchor.focus();
      const keydown = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      const keyup = new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true });
      await act(() => {
        anchor.dispatchEvent(keydown);
        anchor.dispatchEvent(keyup);
      });
      expect(onKeyDown).toHaveBeenCalledOnce();
      expect(onKeyUp).toHaveBeenCalledOnce();
      expect(onClick).not.toHaveBeenCalled();
      expect(keydown.defaultPrevented).toBe(false);
      expect(keyup.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(anchor);
    },
  );
});
