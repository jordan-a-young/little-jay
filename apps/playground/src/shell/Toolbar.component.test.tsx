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

describe("theme action label", () => {
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
  async function renderToolbar() {
    await act(() =>
      root.render(<Toolbar width="fluid" onWidthChange={vi.fn()} onReset={vi.fn()} />),
    );
  }
  it("describes the next action and follows the resolved appearance, including system mode", async () => {
    await renderToolbar();
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("Switch to dark theme");
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    await act(() => button.click());
    expect(appearance.setPreference).toHaveBeenLastCalledWith("dark");
    appearance.theme = "dark";
    await renderToolbar();
    expect(button.textContent).toBe("Switch to light theme");
    await act(() => button.click());
    expect(appearance.setPreference).toHaveBeenLastCalledWith("light");
    expect(container.querySelector('button[aria-pressed="true"]')?.textContent).toBe(
      "Use system theme",
    );
  });
});
