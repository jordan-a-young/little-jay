import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "./index.js";

describe("modal dialog and sheet", () => {
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

  it("portals named/described content, traps focus, escapes, and restores trigger focus", async () => {
    await act(() =>
      root.render(
        <Dialog>
          <DialogTrigger>Inspect</DialogTrigger>
          <DialogContent title="Preview" description="Local text only">
            <input aria-label="Draft" />
          </DialogContent>
        </Dialog>,
      ),
    );
    const trigger = container.querySelector("button")!;
    trigger.focus();
    await act(() => trigger.click());
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(container.contains(modal)).toBe(false);
    expect(document.getElementById(modal.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Preview",
    );
    expect(document.getElementById(modal.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Local text only",
    );
    const input = modal.querySelector("input")!;
    const close = modal.querySelector("button")!;
    expect(document.activeElement).toBe(input);
    close.focus();
    await act(() =>
      close.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      ),
    );
    expect(document.activeElement).toBe(input);
    await act(() =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(document.activeElement).toBe(close);
    await act(() =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("supports controlled sheet dismissal and optional descriptions without broken references", async () => {
    const changes = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            changes(next);
            setOpen(next);
          }}
        >
          <DialogTrigger>Sheet</DialogTrigger>
          <DialogContent variant="sheet" title="Metadata">
            <DialogClose>Done</DialogClose>
          </DialogContent>
        </Dialog>
      );
    }
    await act(() => root.render(<Example />));
    await act(() => container.querySelector("button")!.click());
    const modal = document.querySelector('[role="dialog"]')!;
    expect(modal.classList.contains("lj-dialog-sheet")).toBe(true);
    expect(modal.hasAttribute("aria-describedby")).toBe(false);
    await act(() => modal.querySelector("button")!.click());
    expect(changes.mock.calls).toEqual([[true], [false]]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
