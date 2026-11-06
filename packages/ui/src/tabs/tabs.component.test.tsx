import { act, createRef, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Tabs, type TabsItem } from "./index.js";

const items: readonly TabsItem[] = [
  { value: "notes", label: "Notes", content: <input aria-label="Draft" defaultValue="Original" /> },
  { value: "unavailable", label: "Unavailable", content: "Unavailable content", disabled: true },
  { value: "preview", label: "Preview", content: "Local preview" },
  { value: "history", label: "History", content: "Local history" },
];

describe("Tabs", () => {
  let container: HTMLDivElement;
  let root: Root;
  const tabs = () => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = () => [...container.querySelectorAll<HTMLDivElement>('[role="tabpanel"]')];
  const key = async (button: HTMLButtonElement, value: string) => {
    await act(() =>
      button.dispatchEvent(
        new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
      ),
    );
  };

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

  it("links named horizontal tabs to panels and forwards root props/ref without submitting", async () => {
    const ref = createRef<HTMLDivElement>();
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    await act(() =>
      root.render(
        <form onSubmit={submit}>
          <Tabs
            label="Local views"
            items={items}
            ref={ref}
            className="project-tabs"
            data-source="fixture"
          />
        </form>,
      ),
    );
    expect(ref.current?.className).toContain("project-tabs");
    expect(ref.current?.getAttribute("data-source")).toBe("fixture");
    expect(container.querySelector('[role="tablist"]')?.getAttribute("aria-label")).toBe(
      "Local views",
    );
    expect(container.querySelector('[role="tablist"]')?.getAttribute("aria-orientation")).toBe(
      "horizontal",
    );
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(tabs().map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
      "false",
    ]);
    expect(tabs()[1]!.disabled).toBe(true);
    tabs().forEach((tab, index) => {
      expect(tab.type).toBe("button");
      expect(tab.getAttribute("aria-controls")).toBe(panels()[index]!.id);
      expect(panels()[index]!.getAttribute("aria-labelledby")).toBe(tab.id);
    });
    expect(panels().map((panel) => panel.hidden)).toEqual([false, true, true, true]);
    expect(panels()[0]!.tabIndex).toBe(0);
    await act(() => tabs()[2]!.click());
    expect(submit).not.toHaveBeenCalled();
    expect(panels()[2]!.hidden).toBe(false);
  });

  it("moves focus manually with wrapping arrows/Home/End, skips disabled tabs, and leaves unrelated keys alone", async () => {
    const change = vi.fn();
    await act(() => root.render(<Tabs label="Views" items={items} onValueChange={change} />));
    await act(() => tabs()[0]!.focus());
    await key(tabs()[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[2]);
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([-1, -1, 0, -1]);
    expect(tabs()[0]!.getAttribute("aria-selected")).toBe("true");
    expect(panels()[2]!.textContent).toBe("");
    await key(tabs()[2]!, "End");
    expect(document.activeElement).toBe(tabs()[3]);
    await key(tabs()[3]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[0]);
    await key(tabs()[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(tabs()[3]);
    await key(tabs()[3]!, "Home");
    expect(document.activeElement).toBe(tabs()[0]);
    await key(tabs()[0]!, "ArrowDown");
    expect(document.activeElement).toBe(tabs()[0]);
    expect(change).not.toHaveBeenCalled();
    await act(() => tabs()[2]!.click());
    expect(change).toHaveBeenCalledExactlyOnceWith("preview");
    await act(() => tabs()[2]!.click());
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("returns the tab stop to the selected tab after focus leaves the list", async () => {
    await act(() => root.render(<Tabs label="Views" items={items} />));
    await act(() => tabs()[0]!.focus());
    await key(tabs()[0]!, "End");
    await act(() => panels()[0]!.focus());
    expect(tabs().map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
  });

  it("respects RTL horizontal arrow direction", async () => {
    await act(() => root.render(<Tabs label="Views" items={items} />));
    tabs().forEach((tab) => {
      tab.style.direction = "rtl";
    });
    await act(() => tabs()[0]!.focus());
    await key(tabs()[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(tabs()[2]);
    await key(tabs()[2]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it("lazily mounts content on activation and preserves visited panel state and DOM", async () => {
    const mounted = vi.fn();
    function LazyContent() {
      mounted();
      return <input aria-label="Lazy draft" defaultValue="Lazy" />;
    }
    const localItems = [items[0]!, { value: "lazy", label: "Lazy", content: <LazyContent /> }];
    await act(() => root.render(<Tabs label="Views" items={localItems} />));
    expect(mounted).not.toHaveBeenCalled();
    const draft = container.querySelector<HTMLInputElement>('[aria-label="Draft"]')!;
    draft.value = "Unsaved edits";
    await act(() => tabs()[1]!.click());
    const lazy = container.querySelector<HTMLInputElement>('[aria-label="Lazy draft"]')!;
    lazy.value = "Lazy edits";
    await act(() => tabs()[0]!.click());
    expect(container.querySelector('[aria-label="Draft"]')).toBe(draft);
    expect(draft.value).toBe("Unsaved edits");
    expect(panels()[1]!.hidden).toBe(true);
    await act(() => tabs()[1]!.click());
    expect(container.querySelector('[aria-label="Lazy draft"]')).toBe(lazy);
    expect(lazy.value).toBe("Lazy edits");
  });

  it("forgets removed panels so unselected reinsertion does not restart their mount effects", async () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function RemovableContent() {
      useEffect(() => {
        mounted();
        return () => {
          unmounted();
        };
      }, []);
      return <input aria-label="Removable draft" defaultValue="Fresh mount" />;
    }
    const removable = { value: "removable", label: "Removable", content: <RemovableContent /> };
    const localItems = [items[0]!, removable];
    await act(() => root.render(<Tabs label="Views" items={localItems} />));
    await act(() => tabs()[1]!.click());
    expect(mounted).toHaveBeenCalledTimes(1);
    await act(() => tabs()[0]!.click());
    await act(() => root.render(<Tabs label="Views" items={[items[0]!]} />));
    expect(unmounted).toHaveBeenCalledTimes(1);
    await act(() => root.render(<Tabs label="Views" items={localItems} />));
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[aria-label="Removable draft"]')).toBeNull();
    await act(() => tabs()[1]!.click());
    expect(mounted).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[aria-label="Removable draft"]')).not.toBeNull();
  });

  it("requests controlled changes without changing selection until the caller accepts", async () => {
    const change = vi.fn();
    await act(() =>
      root.render(<Tabs label="Views" items={items} value="notes" onValueChange={change} />),
    );
    await act(() => tabs()[2]!.click());
    expect(change).toHaveBeenCalledExactlyOnceWith("preview");
    expect(panels()[0]!.hidden).toBe(false);
    await act(() =>
      root.render(<Tabs label="Views" items={items} value="preview" onValueChange={change} />),
    );
    expect(panels()[2]!.hidden).toBe(false);
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("supports caller-owned state and an initial uncontrolled selection", async () => {
    function Controlled() {
      const [value, setValue] = useState("history");
      return <Tabs label="Views" items={items} value={value} onValueChange={setValue} />;
    }
    await act(() => root.render(<Controlled />));
    expect(panels()[3]!.hidden).toBe(false);
    await act(() => tabs()[0]!.click());
    expect(panels()[0]!.hidden).toBe(false);
    await act(() =>
      root.render(<Tabs key="uncontrolled" label="Views" items={items} defaultValue="preview" />),
    );
    expect(panels()[2]!.hidden).toBe(false);
  });

  it("falls back to the first enabled item for removed/disabled/unknown selections without emitting a command", async () => {
    const change = vi.fn();
    await act(() =>
      root.render(
        <Tabs label="Views" items={items} defaultValue="missing" onValueChange={change} />,
      ),
    );
    expect(panels()[0]!.hidden).toBe(false);
    await act(() => tabs()[2]!.click());
    const modified = items
      .filter((item) => item.value !== "preview")
      .map((item) => (item.value === "notes" ? { ...item, disabled: true } : item));
    await act(() => root.render(<Tabs label="Views" items={modified} onValueChange={change} />));
    expect(tabs().at(-1)?.getAttribute("aria-selected")).toBe("true");
    expect(change).toHaveBeenCalledTimes(1);
    await act(() =>
      root.render(<Tabs label="Views" items={items} value="unavailable" onValueChange={change} />),
    );
    expect(panels()[0]!.hidden).toBe(false);
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("handles empty and all-disabled lists without a selected/focusable panel", async () => {
    await act(() => root.render(<Tabs label="Empty" items={[]} />));
    expect(tabs()).toHaveLength(0);
    await act(() =>
      root.render(
        <Tabs label="Disabled" items={items.map((item) => ({ ...item, disabled: true }))} />,
      ),
    );
    expect(
      tabs().every(
        (tab) =>
          tab.disabled && tab.tabIndex === -1 && tab.getAttribute("aria-selected") === "false",
      ),
    ).toBe(true);
    expect(panels().every((panel) => panel.hidden)).toBe(true);
  });

  it("keeps unique stable associations across instances, reordering and unusual values", async () => {
    const local = [{ value: "a b/#", label: "Special", content: "Special content" }, items[0]!];
    await act(() =>
      root.render(
        <>
          <Tabs label="First" items={local} />
          <Tabs label="Second" items={local} />
        </>,
      ),
    );
    const identifiers = tabs().map((tab) => tab.id);
    expect(new Set(identifiers).size).toBe(4);
    const firstId = identifiers[0];
    await act(() =>
      root.render(
        <>
          <Tabs label="First" items={[...local].reverse()} />
          <Tabs label="Second" items={local} />
        </>,
      ),
    );
    expect(tabs()[1]!.id).toBe(firstId);
    tabs().forEach((tab) =>
      expect(
        document
          .getElementById(tab.getAttribute("aria-controls")!)
          ?.getAttribute("aria-labelledby"),
      ).toBe(tab.id),
    );
  });

  it("rejects blank names and blank/duplicate item values", () => {
    expect(() => renderToStaticMarkup(<Tabs label="  " items={items} />)).toThrow("nonblank label");
    expect(() =>
      renderToStaticMarkup(
        <Tabs label="Views" items={[{ value: " ", label: "Blank", content: null }]} />,
      ),
    ).toThrow("unique nonblank");
    expect(() =>
      renderToStaticMarkup(<Tabs label="Views" items={[items[0]!, items[0]!]} />),
    ).toThrow("unique nonblank");
  });
});
