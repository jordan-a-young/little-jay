import { act, createRef, StrictMode, useState, type MouseEvent } from "react";
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
    vi.stubGlobal("CSS", {
      ...globalThis.CSS,
      escape: (value: string) =>
        Array.from(
          String(value),
          (character) => `\\${(character.codePointAt(0) || 0xfffd).toString(16)} `,
        ).join(""),
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    portalForm?.remove();
    portalForm = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("portals named/described content, traps focus, escapes, and restores trigger focus", async () => {
    await act(() =>
      root.render(
        <Dialog>
          <DialogTrigger>Inspect</DialogTrigger>
          <DialogContent title="Preview" description="Local text only">
            <input aria-label="Draft" autoFocus />
          </DialogContent>
        </Dialog>,
      ),
    );
    const trigger = container.querySelector("button")!;
    trigger.focus();
    await act(() => trigger.click());
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(modal.tagName).toBe("SECTION");
    expect(modal.parentElement?.className).toBe("lj-dialog-modal");
    expect(modal.parentElement?.dataset.variant).toBe("dialog");
    expect(modal.parentElement?.parentElement?.className).toBe("lj-dialog-overlay");
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
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("disables only the built-in action and reenables non-submit dismissal with native props and refs", async () => {
    const changes = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    const contentRef = createRef<HTMLElement>();
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

  it.each(["", " \n\t"])("rejects a blank visible title %j", (title) => {
    expect(() =>
      renderToStaticMarkup(
        <Dialog>
          <DialogContent title={title} />
        </Dialog>,
      ),
    ).toThrow("nonblank title");
  });

  it.each(["escape", "outside"])(
    "independently controls %s dismissal while the built-in Close is disabled",
    async (dismissal) => {
      const changes = vi.fn();
      async function renderDismissal(enabled: boolean) {
        await act(() =>
          root.render(
            <Dialog defaultOpen onOpenChange={changes}>
              <DialogContent
                title="Preview"
                closeDisabled
                dismissOnEscape={dismissal === "escape" && enabled}
                dismissOnOutsidePress={dismissal === "outside" && enabled}
              />
            </Dialog>,
          ),
        );
      }
      await renderDismissal(false);
      const dismiss = () => {
        if (dismissal === "escape") {
          document.activeElement!.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
          );
        } else {
          const overlay = document.querySelector<HTMLElement>(".lj-dialog-overlay")!;
          for (const type of ["pointerdown", "pointerup"])
            overlay.dispatchEvent(
              new PointerEvent(type, {
                pointerType: "mouse",
                isPrimary: true,
                button: 0,
                bubbles: true,
                cancelable: true,
              }),
            );
          overlay.click();
        }
      };
      await act(dismiss);
      expect(changes).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();
      await renderDismissal(true);
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
      expect(modal.parentElement?.className).toBe("lj-dialog-modal");
      expect((modal.parentElement as HTMLElement).dataset.variant).toBe("sheet");
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

  it("honors native trigger/close cancellation, disabled state, refs and explicit submit types", async () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const closeRef = createRef<HTMLButtonElement>();
    const changes = vi.fn();
    const triggerClick = vi.fn((event: MouseEvent<HTMLButtonElement>) => {
      if (cancelTrigger) event.preventDefault();
    });
    const closeClick = vi.fn((event: MouseEvent<HTMLButtonElement>) => {
      if (cancelClose) event.preventDefault();
    });
    let cancelTrigger = true;
    let cancelClose = true;
    const form = document.createElement("form");
    form.id = "dialog-button-form";
    portalForm = form;
    const submit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener("submit", submit);
    document.body.append(form);
    async function renderControls(disabled: boolean) {
      await act(() =>
        root.render(
          <Dialog onOpenChange={changes}>
            <DialogTrigger
              ref={triggerRef}
              disabled={disabled}
              type="submit"
              form={form.id}
              onClick={triggerClick}
            >
              Open
            </DialogTrigger>
            <DialogContent title="Actions" portalContainer={form} closeDisabled>
              <DialogClose ref={closeRef} disabled={disabled} type="submit" onClick={closeClick}>
                Done
              </DialogClose>
            </DialogContent>
          </Dialog>,
        ),
      );
    }
    await renderControls(true);
    await act(() => triggerRef.current!.click());
    expect(triggerClick).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
    await renderControls(false);
    triggerRef.current!.focus();
    await act(() => triggerRef.current!.click());
    expect(triggerClick).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    cancelTrigger = false;
    await act(() => triggerRef.current!.click());
    expect(triggerRef.current!.type).toBe("submit");
    expect(triggerRef.current!.getAttribute("aria-expanded")).toBe("true");
    expect(triggerRef.current!.getAttribute("aria-haspopup")).toBe("dialog");
    expect(changes.mock.calls).toEqual([[true]]);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(closeRef.current!.type).toBe("submit");
    expect(closeRef.current!.form).toBe(form);
    await act(() => closeRef.current!.click());
    expect(closeClick).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls).toEqual([[true]]);
    expect(submit).toHaveBeenCalledTimes(1);
    await renderControls(true);
    await act(() => closeRef.current!.click());
    expect(closeClick).toHaveBeenCalledTimes(1);
    await renderControls(false);
    cancelClose = false;
    await act(() => closeRef.current!.click());
    expect(changes.mock.calls).toEqual([[true], [false]]);
    expect(submit).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps a declined controlled close open, uses the latest callback, and emits nothing for owner updates or unmount", async () => {
    const previous = vi.fn();
    const latest = vi.fn();
    async function renderControlled(open: boolean, onOpenChange: (open: boolean) => void) {
      await act(() =>
        root.render(
          <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent title="Controlled" />
          </Dialog>,
        ),
      );
    }
    await renderControlled(true, previous);
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    await vi.waitFor(() => expect(document.activeElement).toBe(modal));
    await renderControlled(true, latest);
    await act(() => modal.querySelector("button")!.click());
    expect(previous).not.toHaveBeenCalled();
    expect(latest.mock.calls).toEqual([[false]]);
    expect(document.querySelector('[role="dialog"]')).toBe(modal);
    await renderControlled(false, latest);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await renderControlled(true, latest);
    await act(() => root.render(null));
    expect(latest.mock.calls).toEqual([[false]]);
  });

  it("uses defaultOpen only at initialization and preserves native content IDs and attributes", async () => {
    const contentRef = createRef<HTMLElement>();
    async function renderDefault(defaultOpen: boolean) {
      await act(() =>
        root.render(
          <Dialog defaultOpen={defaultOpen}>
            <DialogTrigger aria-controls="custom-dialog">Inspect</DialogTrigger>
            <DialogContent
              id="custom-dialog"
              title="Metadata"
              ref={contentRef}
              lang="en"
              description="   "
            />
          </Dialog>,
        ),
      );
    }
    await renderDefault(false);
    await renderDefault(true);
    expect(contentRef.current).toBeNull();
    const trigger = container.querySelector("button")!;
    trigger.focus();
    await act(() => trigger.click());
    expect(contentRef.current?.id).toBe("custom-dialog");
    expect(contentRef.current?.tagName).toBe("SECTION");
    expect(contentRef.current?.lang).toBe("en");
    expect(contentRef.current?.hasAttribute("aria-describedby")).toBe(false);
    expect(trigger.getAttribute("aria-controls")).toBe(contentRef.current?.id);
  });

  it("forwards native section events and attributes without replacing dialog behavior", async () => {
    const events: string[] = [];
    const focus = vi.fn();
    const blur = vi.fn();
    await act(() =>
      root.render(
        <Dialog defaultOpen>
          <DialogContent
            title="Native props"
            aria-busy="true"
            tabIndex={0}
            onKeyDownCapture={() => events.push("capture")}
            onKeyDown={() => events.push("bubble")}
            onFocus={focus}
            onBlur={blur}
          >
            <input aria-label="Native child" />
          </DialogContent>
        </Dialog>,
      ),
    );
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(modal.getAttribute("aria-busy")).toBe("true");
    expect(modal.tabIndex).toBe(0);
    await vi.waitFor(() => expect(document.activeElement).toBe(modal));
    expect(focus).toHaveBeenCalled();
    await act(() => modal.dispatchEvent(new KeyboardEvent("keydown", { key: "x", bubbles: true })));
    expect(events).toEqual(["capture", "bubble"]);
    await act(() => modal.querySelector("input")!.focus());
    expect(blur).toHaveBeenCalled();
    expect(modal.contains(document.activeElement)).toBe(true);
    await act(() =>
      modal
        .querySelector("input")!
        .dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
        ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("dismisses on outside press by default even when only the built-in Close is disabled", async () => {
    const changes = vi.fn();
    await act(() =>
      root.render(
        <Dialog defaultOpen onOpenChange={changes}>
          <DialogContent title="Outside" closeDisabled />
        </Dialog>,
      ),
    );
    const overlay = document.querySelector<HTMLElement>(".lj-dialog-overlay")!;
    await act(() => {
      for (const type of ["pointerdown", "pointerup"])
        overlay.dispatchEvent(
          new PointerEvent(type, {
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            bubbles: true,
            cancelable: true,
          }),
        );
      overlay.click();
    });
    expect(changes.mock.calls).toEqual([[false]]);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps custom Close independent of dismissal flags and built-in Close", async () => {
    await act(() =>
      root.render(
        <Dialog defaultOpen>
          <DialogContent
            title="Explicit action"
            closeDisabled
            dismissOnEscape={false}
            dismissOnOutsidePress={false}
          >
            <DialogClose>Done</DialogClose>
          </DialogContent>
        </Dialog>,
      ),
    );
    const done = document.querySelector('[role="dialog"] button') as HTMLButtonElement;
    expect(done.disabled).toBe(false);
    expect(done.type).toBe("button");
    await act(() => done.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("restores each actual trigger across repeated open and close cycles", async () => {
    await act(() =>
      root.render(
        <Dialog>
          <DialogTrigger>First card</DialogTrigger>
          <DialogTrigger>Second card</DialogTrigger>
          <DialogContent title="Shared details" />
        </Dialog>,
      ),
    );
    for (const trigger of container.querySelectorAll("button")) {
      trigger.focus();
      await act(() => trigger.click());
      const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
      await vi.waitFor(() => expect(document.activeElement).toBe(modal));
      await act(() => modal.querySelector("button")!.click());
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    }
  });

  it.each(["close", "unmount"])(
    "restores the actual origin without a DialogTrigger after %s",
    async (action) => {
      const origin = document.createElement("button");
      origin.textContent = "Card";
      container.append(origin);
      origin.focus();
      const host = document.createElement("div");
      container.append(host);
      const modalRoot = createRoot(host);
      try {
        await act(() =>
          modalRoot.render(
            <Dialog open>
              <DialogContent title="Card details" />
            </Dialog>,
          ),
        );
        await vi.waitFor(() =>
          expect(document.activeElement).toBe(document.querySelector('[role="dialog"]')),
        );
        await act(() =>
          modalRoot.render(
            action === "close" ? (
              <Dialog open={false}>
                <DialogContent title="Card details" />
              </Dialog>
            ) : null,
          ),
        );
        await vi.waitFor(() => expect(document.activeElement).toBe(origin));
      } finally {
        await act(() => modalRoot.unmount());
      }
    },
  );

  it("preserves the active modal through StrictMode replay and rapid close/reopen", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const origin = document.createElement("button");
    const nextOrigin = document.createElement("button");
    container.append(origin, nextOrigin);
    const host = document.createElement("div");
    container.append(host);
    const modalRoot = createRoot(host);
    async function renderOpen(open: boolean) {
      await act(() =>
        modalRoot.render(
          <StrictMode>
            <Dialog open={open}>
              <DialogContent title="Replay">
                <input aria-label="Draft" autoFocus />
              </DialogContent>
            </Dialog>
          </StrictMode>,
        ),
      );
    }
    try {
      origin.focus();
      await renderOpen(true);
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(document.querySelector('[aria-label="Draft"]'));
      await renderOpen(false);
      nextOrigin.focus();
      await renderOpen(true);
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(document.querySelector('[aria-label="Draft"]'));
      await act(() => modalRoot.render(null));
      await act(() => vi.runAllTimersAsync());
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement).toBe(nextOrigin);
    } finally {
      await act(() => modalRoot.unmount());
    }
  });

  it("does not replace deliberate external focus when queued upstream restoration runs", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const origin = document.createElement("button");
    const destination = document.createElement("button");
    container.append(origin, destination);
    const host = document.createElement("div");
    container.append(host);
    const modalRoot = createRoot(host);
    try {
      origin.focus();
      await act(() =>
        modalRoot.render(
          <Dialog defaultOpen>
            <DialogContent title="External focus" />
          </Dialog>,
        ),
      );
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'));
      await act(() => modalRoot.render(null));
      destination.focus();
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(destination);
    } finally {
      await act(() => modalRoot.unmount());
    }
  });

  it("leaves a removed origin's fallback to the surviving owner", async () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
    const origin = document.createElement("button");
    const fallback = document.createElement("button");
    container.append(origin, fallback);
    const host = document.createElement("div");
    container.append(host);
    const modalRoot = createRoot(host);
    try {
      origin.focus();
      await act(() =>
        modalRoot.render(
          <Dialog defaultOpen>
            <DialogContent title="Removed card" />
          </Dialog>,
        ),
      );
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'));
      origin.remove();
      await act(() => modalRoot.render(null));
      await act(() => vi.runAllTimersAsync());
      expect(document.activeElement).toBe(document.body);
      fallback.focus();
      expect(document.activeElement).toBe(fallback);
    } finally {
      await act(() => modalRoot.unmount());
    }
  });

  it("restores a nested modal to its parent control, then the outer modal to its actual origin", async () => {
    const origin = document.createElement("button");
    container.append(origin);
    const host = document.createElement("div");
    container.append(host);
    const modalRoot = createRoot(host);
    try {
      origin.focus();
      await act(() =>
        modalRoot.render(
          <Dialog defaultOpen>
            <DialogContent title="Outer">
              <Dialog>
                <DialogTrigger>Open inner</DialogTrigger>
                <DialogContent title="Inner" />
              </Dialog>
            </DialogContent>
          </Dialog>,
        ),
      );
      const outer = document.querySelector<HTMLElement>('[role="dialog"]')!;
      const innerTrigger = outer.querySelector("button")!;
      innerTrigger.focus();
      await act(() => innerTrigger.click());
      const inner = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).find(
        (element) => element !== outer,
      )!;
      await vi.waitFor(() => expect(document.activeElement).toBe(inner));
      await act(() =>
        inner.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
        ),
      );
      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      await vi.waitFor(() => expect(document.activeElement).toBe(innerTrigger));
      await act(() =>
        innerTrigger.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
        ),
      );
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      await vi.waitFor(() => expect(document.activeElement).toBe(origin));
    } finally {
      await act(() => modalRoot.unmount());
    }
  });
});
