import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Toolbar } from "./Toolbar.js";

const appearance = vi.hoisted(() => ({
  theme: "light" as "light" | "dark",
  preference: "system" as "system" | "light" | "dark",
  setPreference: vi.fn(),
}));
vi.mock("../use-theme.js", () => ({ useTheme: () => appearance }));

describe("preview settings popover", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    appearance.theme = "light";
    appearance.preference = "system";
    appearance.setPreference.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  const onWidthChange = vi.fn();
  const onReset = vi.fn();
  async function renderToolbar(width: "fluid" | "640" | "320" = "fluid") {
    await act(() =>
      root.render(<Toolbar width={width} onWidthChange={onWidthChange} onReset={onReset} />),
    );
  }
  it("connects a quiet Settings button to a named, dismissible native popover", async () => {
    await renderToolbar();
    const button = container.querySelector("button")!;
    const popover = container.querySelector('[popover="auto"]')!;
    expect(button.textContent).toBe("Settings");
    expect(button.type).toBe("button");
    expect(button.getAttribute("popovertarget")).toBe(popover.id);
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(popover.getAttribute("role")).toBe("dialog");
    expect(document.getElementById(popover.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Preview settings",
    );
    expect(popover.querySelector('button[popovertargetaction="hide"]')?.textContent).toBe("Close");
  });
  it("uses one theme selector for all preferences and follows external preference changes", async () => {
    await renderToolbar();
    const theme = container.querySelector<HTMLSelectElement>('select[name="theme"]')!;
    expect(theme.value).toBe("system");
    expect(Array.from(theme.options, (option) => option.value)).toEqual([
      "system",
      "light",
      "dark",
    ]);
    for (const preference of ["light", "dark", "system"]) {
      await act(() => {
        theme.value = preference;
        theme.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(appearance.setPreference).toHaveBeenLastCalledWith(preference);
    }
    appearance.preference = "dark";
    await renderToolbar();
    expect(theme.value).toBe("dark");
  });
  it("preserves width selection and exposes reset without submitting a form", async () => {
    onWidthChange.mockClear();
    onReset.mockClear();
    await renderToolbar("640");
    const width = container.querySelector<HTMLSelectElement>('select[name="preview-width"]')!;
    expect(width.value).toBe("640");
    await act(() => {
      width.value = "320";
      width.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onWidthChange).toHaveBeenLastCalledWith("320");
    const reset = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Reset preview",
    )!;
    expect(reset.type).toBe("button");
    await act(() => reset.click());
    expect(onReset).toHaveBeenCalledOnce();
    expect(container.querySelector(".catalog-toolbar-note")?.textContent).toContain(
      "media queries follow the browser viewport",
    );
  });
});
