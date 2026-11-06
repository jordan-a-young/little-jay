import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { LoadingIndicator } from "./index.js";

describe("LoadingIndicator", () => {
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

  it("needs no visible text and includes hidden accessible loading text", async () => {
    await act(() => root.render(<LoadingIndicator />));
    const indicator = container.firstElementChild!;
    expect(indicator.textContent).toBe("Loading");
    expect(indicator.querySelector(".lj-loading-indicator-label-hidden")?.textContent).toBe(
      "Loading",
    );
    expect(
      indicator.querySelector('.lj-loading-indicator-spinner[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(indicator.hasAttribute("role")).toBe(false);
    expect(indicator.hasAttribute("aria-live")).toBe(false);
    expect(indicator.hasAttribute("aria-busy")).toBe(false);
    expect(indicator.hasAttribute("tabindex")).toBe(false);
  });

  it("shows optional text safely without forwarding the label prop", async () => {
    await act(() => root.render(<LoadingIndicator label="Checking <example>…" />));
    expect(container.textContent).toBe("Checking <example>…");
    expect(container.querySelector("example")).toBeNull();
    expect(container.querySelector(".lj-loading-indicator-label-hidden")).toBeNull();
    expect(container.firstElementChild?.hasAttribute("label")).toBe(false);
  });

  it("treats blank labels as icon-only rather than exposing an unnamed indicator", async () => {
    await act(() => root.render(<LoadingIndicator label="  " />));
    expect(container.querySelector(".lj-loading-indicator-label-hidden")?.textContent).toBe(
      "Loading",
    );
  });

  it("preserves native refs, classes and caller-owned announcement or decorative policy", async () => {
    const ref = createRef<HTMLSpanElement>();
    await act(() =>
      root.render(
        <LoadingIndicator
          ref={ref}
          label="Checking…"
          role="status"
          aria-live="polite"
          id="activity"
          className="project-loading"
          data-source="test"
        />,
      ),
    );
    expect(ref.current).toBe(container.firstElementChild);
    expect(ref.current?.tagName).toBe("SPAN");
    expect(ref.current?.id).toBe("activity");
    expect(ref.current?.className).toContain("project-loading");
    expect(ref.current?.getAttribute("role")).toBe("status");
    expect(ref.current?.getAttribute("aria-live")).toBe("polite");
    expect(ref.current?.getAttribute("data-source")).toBe("test");
    await act(() => root.render(<LoadingIndicator aria-hidden="true" />));
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("updates the label without taking focus from application controls", async () => {
    async function renderIndicator(label?: string) {
      await act(() =>
        root.render(
          <>
            <button type="button">Keep focus</button>
            <LoadingIndicator label={label} />
          </>,
        ),
      );
    }
    await renderIndicator();
    const control = container.querySelector("button")!;
    control.focus();
    await renderIndicator("Refreshing…");
    expect(container.querySelector(".lj-loading-indicator")?.textContent).toBe("Refreshing…");
    expect(document.activeElement).toBe(control);
  });
});
