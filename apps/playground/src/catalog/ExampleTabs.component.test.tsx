import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ExampleTabs } from "./ExampleTabs.js";

const examples = [
  { id: "first", title: "First example" },
  { id: "second", title: "A second example with a deliberately long descriptive title" },
  { id: "third / example", title: "Third example" },
];

describe("catalog ExampleTabs", () => {
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

  function tabs() {
    return [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  }

  async function renderTabs(selectedId: string | undefined = "first", onSelect = vi.fn()) {
    await act(() =>
      root.render(
        <>
          <ExampleTabs examples={examples} selectedId={selectedId} onSelect={onSelect}>
            <input aria-label="Active draft" defaultValue={selectedId} />
          </ExampleTabs>
          <button type="button">After tabs</button>
        </>,
      ),
    );
    return onSelect;
  }

  async function key(tab: HTMLButtonElement, value: string) {
    const event = new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true });
    await act(() => tab.dispatchEvent(event));
    return event;
  }

  it("names the tablist and links one selected tab to its focusable panel without changing selection", async () => {
    const select = await renderTabs();
    const list = container.querySelector('[role="tablist"]')!;
    expect(list.getAttribute("aria-label")).toBe("Examples");
    expect(list.getAttribute("aria-orientation")).toBe("horizontal");
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    for (const [index, tab] of tabs().entries()) {
      expect(tab.type).toBe("button");
      const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
      expect(panel.getAttribute("role")).toBe("tabpanel");
      expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
      expect(panel.hidden).toBe(index !== 0);
      expect(panel.tabIndex).toBe(index === 0 ? 0 : -1);
      expect(panel.querySelectorAll("input")).toHaveLength(index === 0 ? 1 : 0);
    }
    expect(select).not.toHaveBeenCalled();
    expect(container.querySelector(".catalog-example-tab")?.hasAttribute("aria-pressed")).toBe(
      false,
    );
  });

  it("moves roving focus with wrapping arrows/Home/End without selecting or consuming scroll/activation keys", async () => {
    const select = await renderTabs();
    await act(() => tabs()[0]!.focus());
    expect((await key(tabs()[0]!, "ArrowLeft")).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tabs()[2]);
    await key(tabs()[2]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[0]);
    await key(tabs()[0]!, "End");
    expect(document.activeElement).toBe(tabs()[2]);
    await key(tabs()[2]!, "Home");
    expect(document.activeElement).toBe(tabs()[0]);
    await key(tabs()[0]!, "ArrowRight");
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    for (const value of ["ArrowDown", "ArrowUp", "Tab", "Enter", " "]) {
      expect((await key(tabs()[1]!, value)).defaultPrevented).toBe(false);
    }
    expect(tabs()[0]!.getAttribute("aria-selected")).toBe("true");
    expect(select).not.toHaveBeenCalled();
    await act(() => tabs()[1]!.click());
    expect(select).toHaveBeenCalledExactlyOnceWith("second");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[0]!.getAttribute("aria-selected")).toBe("true");
  });

  it("follows computed RTL direction for horizontal arrows", async () => {
    await renderTabs();
    for (const tab of tabs()) tab.style.direction = "rtl";
    await act(() => tabs()[0]!.focus());
    await key(tabs()[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[2]);
    await key(tabs()[2]!, "ArrowLeft");
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it("retains the active draft for same selection, unmounts it on route changes and resets the tab stop on exit", async () => {
    const select = await renderTabs();
    const original = container.querySelector<HTMLInputElement>("input")!;
    original.value = "Edited local draft";
    await act(() => tabs()[0]!.click());
    expect(select).not.toHaveBeenCalled();
    await renderTabs("first", select);
    expect(container.querySelector("input")).toBe(original);
    expect(original.value).toBe("Edited local draft");
    await act(() => tabs()[2]!.focus());
    await renderTabs("second", select);
    expect(document.activeElement).toBe(tabs()[2]);
    expect(original.isConnected).toBe(false);
    expect(container.querySelectorAll("input")).toHaveLength(1);
    expect(tabs()[1]!.getAttribute("aria-selected")).toBe("true");
    await act(() =>
      container.querySelector<HTMLButtonElement>('button:not([role="tab"])')!.focus(),
    );
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);
    await renderTabs("first", select);
    expect(container.querySelector<HTMLInputElement>("input")!.value).toBe("first");
    expect(select).not.toHaveBeenCalled();
  });

  it("does not silently select a fallback for a missing route and leaves a keyboard recovery tab", async () => {
    const select = await renderTabs("missing");
    expect(tabs().every((tab) => tab.getAttribute("aria-selected") === "false")).toBe(true);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(container.querySelector("input")).toBeNull();
    expect(
      [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')].every(
        (panel) => panel.hidden,
      ),
    ).toBe(true);
    await act(() => tabs()[0]!.click());
    expect(select).toHaveBeenCalledExactlyOnceWith("first");
  });

  it("creates unique IDs across lists and renders labels as text", async () => {
    const items = [{ id: "safe / id", title: "<img src=x onerror=alert(1)>" }];
    await act(() =>
      root.render(
        <>
          <ExampleTabs examples={items} selectedId="safe / id" onSelect={vi.fn()}>
            First panel
          </ExampleTabs>
          <ExampleTabs examples={items} selectedId="safe / id" onSelect={vi.fn()}>
            Second panel
          </ExampleTabs>
        </>,
      ),
    );
    expect(new Set(tabs().map((tab) => tab.id)).size).toBe(2);
    expect(new Set(tabs().map((tab) => tab.getAttribute("aria-controls"))).size).toBe(2);
    expect(container.querySelector("img")).toBeNull();
    expect(tabs()[0]!.textContent).toBe(items[0]!.title);
  });
});
