import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { WorkflowForm } from "./WorkflowForm.js";

describe("workflow validation feedback", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(() => root.render(<WorkflowForm />));
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function edit(name: string, value: string) {
    const control = container.querySelector(`[name="${name}"]`)!;
    const prototype =
      control instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : control instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    await act(() => {
      Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(control, value);
      control.dispatchEvent(
        new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }),
      );
    });
  }
  async function validate() {
    const form = container.querySelector("form")!;
    await act(() => form.requestSubmit());
    expect(form.getAttribute("aria-busy")).toBe("true");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(form.getAttribute("aria-busy")).toBe("false");
  }

  it.each([
    { name: "Li", target: '[name="name"]' },
    { name: "Valid workflow", target: 'button[type="submit"]' },
  ])("recovers keyboard focus after validating $name", async ({ name, target }) => {
    await edit("name", name);
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submit.focus();
    await act(() => submit.click());
    const temporaryFocusTarget = document.createElement("button");
    document.body.append(temporaryFocusTarget);
    temporaryFocusTarget.focus();
    temporaryFocusTarget.remove();
    expect(document.activeElement).toBe(document.body);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(document.activeElement).toBe(container.querySelector(target));
  });

  it("does not take focus back when the user leaves the pending form", async () => {
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    try {
      const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      submit.focus();
      await act(() => submit.click());
      elsewhere.focus();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 450));
      });
      expect(document.activeElement).toBe(elsewhere);
    } finally {
      elsewhere.remove();
    }
  });

  it("composes pending activity with one status outside the busy form while retaining drafts", async () => {
    await edit("name", "Pending draft");
    const form = container.querySelector("form")!;
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const status = container.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(status.closest("form")).toBeNull();
    expect(status.textContent).toBe("");
    await act(() => form.requestSubmit());
    expect(form.getAttribute("aria-busy")).toBe("true");
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute("aria-label")).toBe("Validating configuration");
    expect(submit.querySelector(".lj-loading-indicator")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    expect(status.textContent).toBe("Validating configuration locally…");
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe("Pending draft");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });
    expect(form.getAttribute("aria-busy")).toBe("false");
    expect(submit.disabled).toBe(false);
    expect(submit.getAttribute("aria-label")).toBe("Validate configuration");
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(container.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1);
    expect(status.textContent).toContain("Configuration validated locally.");
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe("Pending draft");
  });

  it("marks a successful validation outdated after edits and refreshes it on revalidation", async () => {
    await validate();
    expect(container.textContent).toContain("Configuration validated locally.");
    await edit("name", "Li");
    expect(container.textContent).not.toContain("Configuration validated locally.");
    expect(container.textContent).toContain(
      "Configuration changed. Validate again to check the current draft.",
    );
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe("Li");
    await edit("name", "Updated workflow");
    await validate();
    expect(container.textContent).toContain("Configuration validated locally.");
    expect(container.textContent).not.toContain("Configuration changed.");
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe(
      "Updated workflow",
    );
  });

  it("clears only an edited field's stale error without claiming the correction is valid", async () => {
    await edit("name", "Li");
    await edit("prompt", "short");
    await validate();
    expect(container.querySelector('[name="name"]')?.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[name="prompt"]')?.getAttribute("aria-invalid")).toBe("true");
    await edit("name", "Corrected workflow");
    expect(container.querySelector('[name="name"]')?.hasAttribute("aria-invalid")).toBe(false);
    expect(container.textContent).not.toContain("Use a name with 3–80 characters.");
    expect(container.querySelector('[name="prompt"]')?.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Describe the task using 10–2000 characters.");
    expect(container.textContent).not.toContain("Configuration validated locally.");
    expect(container.textContent).toContain("Configuration changed.");
  });

  it("tracks select and checkbox edits without resetting uncontrolled drafts", async () => {
    await validate();
    await edit("mode", "review");
    expect(container.textContent).toContain("Configuration changed.");
    const checkbox = container.querySelector<HTMLInputElement>('[name="requireReview"]')!;
    await act(() => checkbox.click());
    expect(checkbox.checked).toBe(true);
    expect(container.querySelector<HTMLSelectElement>('[name="mode"]')?.value).toBe("review");
    await validate();
    expect(container.textContent).toContain("Configuration validated locally.");
    expect(container.querySelector<HTMLInputElement>('[name="requireReview"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLSelectElement>('[name="mode"]')?.value).toBe("review");
  });
});
