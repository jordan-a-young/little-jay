import { act, createRef, useState, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Alert } from "./index.js";
import { renderToStaticMarkup } from "react-dom/server";

describe("Alert dismissal", () => {
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

  it("is non-dismissible by default and does not forward dismissal-only props", async () => {
    await act(() => root.render(<Alert dismissLabel="Dismiss notice">Saved</Alert>));
    expect(container.querySelector("button")).toBeNull();
    expect(container.firstElementChild?.hasAttribute("dismissLabel")).toBe(false);
    expect(container.firstElementChild?.getAttribute("role")).toBe("status");
  });

  it("requests dismissal once per click without hiding itself, submitting, or moving focus", async () => {
    const ref = createRef<HTMLDivElement>();
    const onDismiss = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    await act(() =>
      root.render(
        <form onSubmit={onSubmit}>
          <Alert
            ref={ref}
            tone="danger"
            title="Connection lost"
            id="connection"
            className="project-alert"
            data-source="test"
            aria-label="Connection status"
            onDismiss={onDismiss}
            action={<a href="#retry">Retry connection</a>}
          >
            Saved data remains available.
          </Alert>
        </form>,
      ),
    );
    const alert = container.querySelector('[role="alert"]')!;
    const close = alert.querySelector<HTMLButtonElement>("button")!;
    expect(ref.current).toBe(alert);
    expect(alert.id).toBe("connection");
    expect(alert.className).toContain("project-alert");
    expect(alert.className).toContain("text-danger");
    expect(alert.getAttribute("data-source")).toBe("test");
    expect(alert.getAttribute("aria-label")).toBe("Connection status");
    expect(alert.textContent).toContain("Connection lost");
    expect(alert.textContent).toContain("Saved data remains available.");
    expect(alert.querySelector("a")?.textContent).toBe("Retry connection");
    expect(close.type).toBe("button");
    expect(close.getAttribute("aria-label")).toBe("Dismiss alert");
    expect(close.querySelector('[aria-hidden="true"]')).not.toBeNull();
    close.focus();
    await act(() => close.click());
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(ref.current).toBe(alert);
    expect(document.activeElement).toBe(close);
    await act(() => close.click());
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("supports custom close labels and removing the opt-in on rerender", async () => {
    const onDismiss = vi.fn();
    await act(() =>
      root.render(
        <Alert role="note" onDismiss={onDismiss} dismissLabel="Dismiss cached snapshot">
          Cached
        </Alert>,
      ),
    );
    expect(container.firstElementChild?.getAttribute("role")).toBe("note");
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Dismiss cached snapshot",
    );
    await act(() => root.render(<Alert role="note">Cached</Alert>));
    expect(container.querySelector("button")).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("lets the application remove the Alert", async () => {
    function ControlledAlert() {
      const [visible, setVisible] = useState(true);
      return visible ? <Alert onDismiss={() => setVisible(false)}>Saved</Alert> : <p>Dismissed</p>;
    }
    await act(() => root.render(<ControlledAlert />));
    await act(() => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).toBe("Dismissed");
  });

  it("rejects blank dismissal labels only when the close control is enabled", () => {
    expect(() =>
      renderToStaticMarkup(
        <Alert onDismiss={() => {}} dismissLabel="  ">
          Saved
        </Alert>,
      ),
    ).toThrow("nonblank label");
    expect(() => renderToStaticMarkup(<Alert dismissLabel="  ">Saved</Alert>)).not.toThrow();
  });
});
