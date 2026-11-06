import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PebbleStateShowcase } from "./PebbleStateShowcase.js";

describe("Pebble state showcase", () => {
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

  it("shows four static states without announcing initial examples", async () => {
    await act(() => root.render(<PebbleStateShowcase />));
    expect(container.querySelectorAll("img")).toHaveLength(4);
    for (const text of [
      "Loading your projects…",
      "Your project is ready.",
      "We couldn’t load your projects.",
      "No projects yet.",
    ])
      expect(container.textContent).toContain(text);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
    expect(container.querySelector('[role="alert"], [aria-busy]')).toBeNull();
  });

  it("retries, creates, and resets only local demo state", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await act(() => root.render(<PebbleStateShowcase />));
    const buttons = Array.from(container.querySelectorAll("button"));
    const retry = buttons.find((button) => button.textContent === "Retry")!;
    const create = buttons.find((button) => button.textContent === "Create project")!;
    const reset = buttons.find((button) => button.textContent === "Reset simulated examples")!;
    await act(() => retry.click());
    expect(retry.disabled).toBe(true);
    expect(container.textContent).not.toContain("We couldn’t load your projects.");
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "Simulated retry complete",
    );
    await act(() => create.click());
    expect(create.disabled).toBe(true);
    expect(container.textContent).not.toContain("No projects yet.");
    expect(container.querySelectorAll('img[src$="pebble-success.png"]')).toHaveLength(3);
    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      "No real record was created",
    );
    await act(() => reset.click());
    expect(retry.disabled).toBe(false);
    expect(create.disabled).toBe(false);
    expect(container.textContent).toContain("No projects yet.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
