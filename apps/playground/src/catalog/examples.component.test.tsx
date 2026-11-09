import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { InteractiveButton, SubmitButton } from "./button/examples.js";
import {
  DisabledCheckbox,
  DisabledInput,
  DisabledSelect,
  DisabledTextarea,
  InvalidField,
  NumericInputExample,
  ControlledNumericInput,
} from "./forms/examples.js";
import {
  BoundaryExample,
  EmptyPebble,
  ErrorAlert,
  ErrorPebble,
  LoadingPebble,
  SuccessPebble,
} from "./feedback/examples.js";
import { IconExample, SheetExample } from "./inspection/examples.js";

describe("catalog example behavior", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onCaughtError = vi.fn<(error: unknown, errorInfo: unknown) => void>();

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
    vi.stubGlobal("fetch", vi.fn());
    container = document.createElement("div");
    document.body.append(container);
    onCaughtError.mockReset();
    root = createRoot(container, { onCaughtError });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("disables and re-enables the interactive button without losing its click count", async () => {
    await act(() => root.render(<InteractiveButton />));
    const button = container.querySelector("button")!;
    const select = container.querySelector("select")!;
    await act(() => button.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Clicks: 1");
    await act(() => {
      select.value = "true";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(button.disabled).toBe(true);
    await act(() => button.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Clicks: 1");
    await act(() => {
      select.value = "false";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(button.disabled).toBe(false);
    await act(() => button.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Clicks: 2");
  });

  it("counts local submissions while canceling native form navigation", async () => {
    await act(() => root.render(<SubmitButton />));
    const form = container.querySelector("form")!;
    const submissions: Event[] = [];
    form.addEventListener("submit", (event) => submissions.push(event));
    const button = container.querySelector("button")!;
    expect(button.type).toBe("submit");
    await act(() => button.click());
    await act(() => button.click());
    expect(submissions).toHaveLength(2);
    expect(submissions.every((event) => event.defaultPrevented)).toBe(true);
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "Local submissions: 2. Nothing is saved.",
    );
  });

  it("demonstrates integer commits, invalid restoration and local FormData without requests", async () => {
    await act(() => root.render(<NumericInputExample />));
    const input = container.querySelector<HTMLInputElement>('input[name="duration"]')!;
    const form = container.querySelector("form")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    expect(input.labels?.[0]?.textContent).toContain("Slideshow duration in seconds");
    await act(() => {
      input.focus();
      setter.call(input, "60");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector('[role="status"]')?.textContent).toContain("30 seconds");
    await act(() =>
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    expect(container.querySelector('[role="status"]')?.textContent).toContain("60 seconds");
    await act(() => {
      setter.call(input, "4000");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.validity.rangeOverflow).toBe(true);
    await act(() => input.blur());
    expect(input.value).toBe("60");
    expect(input.checkValidity()).toBe(true);
    await act(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(container.textContent).toContain("Submitted duration: 60");
    await act(() => container.querySelector<HTMLButtonElement>('button[type="reset"]')!.click());
    expect(input.value).toBe("30");
    expect(container.textContent).toContain("No local submission yet.");
  });

  it("preserves the controlled numeric draft during the example's same-value app rerender", async () => {
    await act(() => root.render(<ControlledNumericInput />));
    const input = container.querySelector<HTMLInputElement>('input[name="controlled-duration"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(() => {
      input.focus();
      setter.call(input, "75");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "F2", bubbles: true }));
    });
    expect(input.value).toBe("75");
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("30 seconds");
    expect(container.textContent).toContain("Unrelated renders: 1");
    await act(() => container.querySelector<HTMLButtonElement>('button[type="button"]')!.click());
    expect(input.value).toBe("90");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("90 seconds");
  });

  it.each([
    { Example: DisabledInput, selector: "input", label: "Project name", value: "Unavailable" },
    {
      Example: DisabledTextarea,
      selector: "textarea",
      label: "Instructions",
      value: "Unavailable",
    },
    { Example: DisabledSelect, selector: "select", label: "Mode", value: "plan" },
    { Example: DisabledCheckbox, selector: "input", label: "Require review", value: "on" },
  ])(
    "keeps the disabled $label example labeled and non-editable",
    async ({ Example, selector, label, value }) => {
      await act(() => root.render(<Example />));
      const control = container.querySelector<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >(selector)!;
      expect(control.disabled).toBe(true);
      expect(control.labels?.[0]?.textContent).toBe(label);
      expect(control.value).toBe(value);
      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        await act(() => control.click());
        expect(control.checked).toBe(true);
      }
    },
  );

  it("associates the invalid draft's error with its required control", async () => {
    await act(() => root.render(<InvalidField />));
    const input = container.querySelector("input")!;
    expect(input.value).toBe("Li");
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.labels?.[0]?.textContent).toContain("Project name");
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Use at least three characters.",
    );
  });

  it("recovers a simulated panel failure without removing the surrounding controls", async () => {
    await act(() => root.render(<BoundaryExample />));
    const simulate = container.querySelector("button")!;
    expect(container.textContent).toContain("No checkpoints yet");
    await act(() => simulate.click());
    expect(onCaughtError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Intentional playground panel failure" }),
      expect.anything(),
    );
    expect(simulate.disabled).toBe(true);
    expect(container.textContent).toContain("The catalog controls remain available");
    expect(container.textContent).not.toContain("Intentional playground panel failure");
    const retry = container.querySelector<HTMLButtonElement>('[role="alert"] button')!;
    expect(retry).not.toBeNull();
    await act(() => retry.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("No checkpoints yet");
    expect(simulate.disabled).toBe(false);
  });

  it("presents the disconnected error example as a static note rather than a live alert", async () => {
    await act(() => root.render(<ErrorAlert />));
    expect(container.querySelector('[role="note"]')?.textContent).toContain("Connection lost");
    expect(container.textContent).toContain("This is a static example, not a live error.");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it.each([
    { Example: LoadingPebble, state: "loading", heading: "Loading your projects…" },
    { Example: SuccessPebble, state: "success", heading: "Your project is ready." },
    { Example: ErrorPebble, state: "error", heading: "We couldn’t load your projects." },
    { Example: EmptyPebble, state: "empty", heading: "No projects yet." },
  ])(
    "uses the matching decorative illustration for the static $state example",
    async ({ Example, state, heading }) => {
      await act(() => root.render(<Example />));
      const illustration = container.querySelector("img")!;
      expect(illustration.getAttribute("src")).toBe(
        `${import.meta.env.BASE_URL}branding/states/pebble-${state}.png`,
      );
      expect(illustration.alt).toBe("");
      expect(container.textContent).toContain(heading);
      expect(container.querySelector('[role="alert"], [role="status"], [aria-live]')).toBeNull();
    },
  );

  it("counts enabled local refreshes but ignores the unavailable refresh action", async () => {
    await act(() => root.render(<IconExample />));
    const refresh = container.querySelector<HTMLButtonElement>(
      '[aria-label="Refresh local preview"]',
    )!;
    const unavailable = container.querySelector<HTMLButtonElement>(
      '[aria-label="Refresh unavailable"]',
    )!;
    expect(unavailable.disabled).toBe(true);
    await act(() => refresh.click());
    await act(() => unavailable.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Local refreshes: 1");
    await act(() => refresh.click());
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Local refreshes: 2");
  });

  it("dismisses and reopens the controlled metadata sheet with its accessible description", async () => {
    await act(() => root.render(<SheetExample />));
    const trigger = container.querySelector("button")!;
    trigger.focus();
    await act(() => trigger.click());
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.classList.contains("lj-dialog-sheet")).toBe(true);
    expect(container.contains(dialog)).toBe(false);
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Checkpoint metadata",
    );
    expect(document.getElementById(dialog.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Read-only local example.",
    );
    expect(dialog.querySelector("dl")?.textContent).toContain("Saved draft");
    await vi.waitFor(() => expect(document.activeElement).toBe(dialog));
    await act(() =>
      dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    await act(() => trigger.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
