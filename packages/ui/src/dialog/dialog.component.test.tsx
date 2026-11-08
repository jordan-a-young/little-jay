import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "./index.js";

describe("modal dialog and sheet", () => {
  let container: HTMLDivElement;
  let root: Root;
  let portalForm: HTMLFormElement | undefined;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    portalForm?.remove();
    portalForm = undefined;
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
    expect(close.textContent).toBe("Close");
    expect(close.hasAttribute("aria-label")).toBe(false);
    expect(close.disabled).toBe(false);
    expect(close.type).toBe("button");
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

  it("disables only the built-in action and reenables non-submit dismissal with native props and refs", async () => {
    const changes = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    const contentRef = createRef<HTMLDivElement>();
    const form = document.createElement("form");
    portalForm = form;
    form.dataset.theme = "dark";
    form.addEventListener("submit", submit);
    document.body.append(form);
    async function renderDialog(closeDisabled: boolean) {
      await act(() =>
        root.render(
          <Dialog defaultOpen onOpenChange={changes}>
            <DialogContent
              title="Local draft"
              closeDisabled={closeDisabled}
              closeLabel="Close local draft"
              portalContainer={form}
              ref={contentRef}
              data-local="draft"
              className="custom-dialog"
            />
          </Dialog>,
        ),
      );
    }
    await renderDialog(true);
    const modal = form.querySelector<HTMLElement>('[role="dialog"]')!;
    const close = modal.querySelector("button")!;
    expect(contentRef.current).toBe(modal);
    expect(modal.dataset.local).toBe("draft");
    expect(modal.classList.contains("custom-dialog")).toBe(true);
    expect(modal.closest('[data-theme="dark"]')).toBe(form);
    expect(close.disabled).toBe(true);
    expect(modal.hasAttribute("closedisabled")).toBe(false);
    expect(modal.hasAttribute("closelabel")).toBe(false);
    expect(close.type).toBe("button");
    expect(close.form).toBe(form);
    expect(close.textContent).toBe("Close");
    expect(close.getAttribute("aria-label")).toBe("Close local draft");
    await act(() => close.click());
    expect(changes).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(form.querySelector('[role="dialog"]')).toBe(modal);
    await renderDialog(false);
    expect(close.disabled).toBe(false);
    await act(() => close.click());
    expect(changes.mock.calls).toEqual([[false]]);
    expect(submit).not.toHaveBeenCalled();
    expect(form.querySelector('[role="dialog"]')).toBeNull();
  });

  it.each(["", " \n\t"])("rejects a supplied blank closeLabel %j", (closeLabel) => {
    expect(() =>
      renderToStaticMarkup(
        <Dialog>
          <DialogContent title="Preview" closeLabel={closeLabel} />
        </Dialog>,
      ),
    ).toThrow("nonblank closeLabel");
  });

  it.each(["escape", "outside"])(
    "preserves caller cancellation and default %s dismissal when Close is disabled",
    async (dismissal) => {
      const changes = vi.fn();
      let preventDismissal = true;
      const escape = vi.fn((event: KeyboardEvent) => {
        if (preventDismissal) event.preventDefault();
      });
      const outside = vi.fn((event: Event) => {
        if (preventDismissal) event.preventDefault();
      });
      await act(() =>
        root.render(
          <Dialog defaultOpen onOpenChange={changes}>
            <DialogContent
              title="Preview"
              closeDisabled
              onEscapeKeyDown={escape}
              onInteractOutside={outside}
            />
          </Dialog>,
        ),
      );
      const dismiss = () => {
        if (dismissal === "escape") {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
          );
        } else {
          const overlay = document.querySelector<HTMLElement>(".lj-dialog-overlay")!;
          overlay.dispatchEvent(
            new PointerEvent("pointerdown", {
              pointerType: "mouse",
              button: 0,
              bubbles: true,
              cancelable: true,
            }),
          );
          overlay.click();
        }
      };
      await vi.waitFor(async () => {
        await act(dismiss);
        expect(dismissal === "escape" ? escape : outside).toHaveBeenCalled();
      });
      expect(changes).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      preventDismissal = false;
      await act(dismiss);
      expect(changes.mock.calls).toEqual([[false]]);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    },
  );

  it.each(["Close", "Done"])(
    "supports controlled sheet dismissal with %s and optional descriptions without broken references",
    async (action) => {
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
      await act(() =>
        Array.from(modal.querySelectorAll("button"))
          .find((button) => button.textContent === action)!
          .click(),
      );
      expect(changes.mock.calls).toEqual([[true], [false]]);
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    },
  );
});
