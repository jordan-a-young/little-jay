import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { PasswordField } from "./index.js";
import { Field } from "../field/index.js";

describe("PasswordField", () => {
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

  function input() {
    return container.querySelector("input")!;
  }
  function toggle() {
    return container.querySelector<HTMLButtonElement>(".lj-password-field-toggle")!;
  }

  it("starts masked, forwards native input props/ref/className, and names a non-submit reveal action", async () => {
    const reference = createRef<HTMLInputElement>();
    await act(() =>
      root.render(
        <PasswordField
          ref={reference}
          id="standalone-password"
          name="password"
          autoComplete="current-password"
          defaultValue="sample-only"
          className="consumer-input"
          aria-label="Example password"
          readOnly
          data-source="test"
        />,
      ),
    );
    expect(reference.current).toBe(input());
    expect(input().type).toBe("password");
    expect(input().id).toBe("standalone-password");
    expect(input().name).toBe("password");
    expect(input().autocomplete).toBe("current-password");
    expect(input().readOnly).toBe(true);
    expect(input().classList.contains("consumer-input")).toBe(true);
    expect(input().getAttribute("data-source")).toBe("test");
    expect(toggle().type).toBe("button");
    expect(toggle().textContent).toBe("Show password");
    expect(toggle().getAttribute("aria-controls")).toBe(input().id);
    expect(toggle().hasAttribute("aria-pressed")).toBe(false);
    expect(container.querySelector('[role="status"], [role="alert"]')).toBeNull();
  });

  it("retains one native input, value, name and FormData through reveal without a submit or change event", async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const change = vi.fn();
    await act(() =>
      root.render(
        <form>
          <PasswordField name="password" defaultValue="sample-only" onChange={change} />
        </form>,
      ),
    );
    const form = container.querySelector("form")!;
    form.addEventListener("submit", submit);
    const native = input();
    toggle().focus();
    await act(() => toggle().click());
    expect(input()).toBe(native);
    expect(input().type).toBe("text");
    expect(input().value).toBe("sample-only");
    expect(new FormData(form).get("password")).toBe("sample-only");
    expect(toggle().textContent).toBe("Hide password");
    expect(document.activeElement).toBe(toggle());
    await act(() => toggle().click());
    expect(input()).toBe(native);
    expect(input().type).toBe("password");
    expect(change).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("preserves the selection range/direction without programmatically moving focus or intercepting paste", async () => {
    const paste = vi.fn();
    await act(() => root.render(<PasswordField defaultValue="sample-only" onPaste={paste} />));
    input().focus();
    input().setSelectionRange(1, 5, "backward");
    const native = input();
    await act(() => toggle().click());
    expect(document.activeElement).toBe(native);
    expect([native.selectionStart, native.selectionEnd, native.selectionDirection]).toEqual([
      1,
      5,
      "backward",
    ]);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    await act(() => native.dispatchEvent(event));
    expect(paste).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  it("reuses Field IDs, messages, invalid/required/disabled state and explicit native overrides", async () => {
    async function renderField(error?: string, disabled = true) {
      await act(() =>
        root.render(
          <>
            <p id="external-help">External guidance</p>
            <Field
              id="account-password"
              label="Password"
              description="Local example"
              error={error}
              required
              disabled={disabled}
            >
              <PasswordField
                id="ignored-child-id"
                defaultValue="sample-only"
                aria-describedby="external-help account-password-description"
              />
            </Field>
          </>,
        ),
      );
    }
    await renderField("Check this example");
    expect(input().id).toBe("account-password");
    expect(container.querySelector("label")?.control).toBe(input());
    expect(toggle().getAttribute("aria-controls")).toBe("account-password");
    expect(input().getAttribute("aria-describedby")).toBe(
      "external-help account-password-description account-password-error",
    );
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(input().required).toBe(true);
    expect(input().disabled).toBe(true);
    expect(toggle().disabled).toBe(true);
    await renderField(undefined, false);
    expect(input().getAttribute("aria-describedby")).toBe(
      "external-help account-password-description",
    );
    expect(input().hasAttribute("aria-invalid")).toBe(false);
    expect(input().value).toBe("sample-only");
    await act(() =>
      root.render(
        <Field label="Explicit override" required disabled error="Example error">
          <PasswordField disabled={false} required={false} aria-invalid={false} />
        </Field>,
      ),
    );
    expect(input().disabled).toBe(false);
    expect(toggle().disabled).toBe(false);
    expect(input().required).toBe(false);
    expect(input().getAttribute("aria-invalid")).toBe("false");
  });

  it("keeps the controlled value with the caller and forwards native edits", async () => {
    function Controlled() {
      const [value, setValue] = useState("sample-only");
      return (
        <PasswordField
          name="controlled"
          value={value}
          autoComplete="new-password"
          onChange={(event) => setValue(event.currentTarget.value)}
        />
      );
    }
    await act(() => root.render(<Controlled />));
    const native = input();
    await act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        native,
        "updated-sample",
      );
      native.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() => toggle().click());
    expect(input()).toBe(native);
    expect(native.value).toBe("updated-sample");
    expect(native.autocomplete).toBe("new-password");
    expect(container.textContent).not.toContain("updated-sample");
  });

  it("restores an uncontrolled native default and masks on an uncancelled form reset", async () => {
    await act(() =>
      root.render(
        <form>
          <PasswordField name="password" defaultValue="sample-only" />
        </form>,
      ),
    );
    const native = input();
    native.value = "updated-sample";
    await act(() => toggle().click());
    await act(() => container.querySelector("form")!.reset());
    expect(input()).toBe(native);
    expect(native.value).toBe("sample-only");
    expect(native.type).toBe("password");
    expect(toggle().textContent).toBe("Show password");
  });

  it("does not change visibility or value when the application cancels reset", async () => {
    await act(() =>
      root.render(
        <form onReset={(event) => event.preventDefault()}>
          <PasswordField defaultValue="sample-only" />
        </form>,
      ),
    );
    input().value = "updated-sample";
    await act(() => toggle().click());
    await act(() => container.querySelector("form")!.reset());
    expect(input().type).toBe("text");
    expect(input().value).toBe("updated-sample");
  });

  it("uses the current external form owner and ignores unrelated resets", async () => {
    async function renderOwner(formId: string) {
      await act(() =>
        root.render(
          <>
            <form id="first-form" />
            <form id="second-form" />
            <PasswordField form={formId} defaultValue="sample-only" />
          </>,
        ),
      );
    }
    await renderOwner("first-form");
    await act(() => toggle().click());
    await act(() => container.querySelector<HTMLFormElement>("#second-form")!.reset());
    expect(input().type).toBe("text");
    await renderOwner("second-form");
    await act(() => container.querySelector<HTMLFormElement>("#first-form")!.reset());
    expect(input().type).toBe("text");
    await act(() => container.querySelector<HTMLFormElement>("#second-form")!.reset());
    expect(input().type).toBe("password");
  });

  it.each(["prop", "field", "fieldset"] as const)(
    "keeps %s-disabled controls inert and out of FormData",
    async (source) => {
      const control = (
        <PasswordField
          name="password"
          disabled={source === "prop" ? true : undefined}
          defaultValue="sample-only"
        />
      );
      await act(() =>
        root.render(
          <form>
            {source === "field" ? (
              <Field label="Password" disabled>
                {control}
              </Field>
            ) : source === "fieldset" ? (
              <fieldset disabled>
                <legend>Unavailable</legend>
                {control}
              </fieldset>
            ) : (
              control
            )}
          </form>,
        ),
      );
      expect(input().matches(":disabled")).toBe(true);
      expect(toggle().matches(":disabled")).toBe(true);
      await act(() => toggle().click());
      expect(input().type).toBe("password");
      expect(new FormData(container.querySelector("form")!).has("password")).toBe(false);
    },
  );

  it("uses unique generated input IDs and hides the complete composed control", async () => {
    await act(() =>
      root.render(
        <>
          <PasswordField hidden />
          <PasswordField />
        </>,
      ),
    );
    const controls = [...container.querySelectorAll("input")];
    expect(controls[0]!.id).not.toBe(controls[1]!.id);
    expect(container.querySelector(".lj-password-field")?.hasAttribute("hidden")).toBe(true);
    expect(controls[0]!.hidden).toBe(true);
    expect(
      container.querySelectorAll(".lj-password-field-toggle")[1]?.getAttribute("aria-controls"),
    ).toBe(controls[1]!.id);
  });

  it("supports custom action labels and rejects blank accessible actions", () => {
    expect(
      renderToStaticMarkup(<PasswordField showLabel="Reveal example" hideLabel="Mask example" />),
    ).toContain("Reveal example");
    expect(() => renderToStaticMarkup(<PasswordField showLabel=" " />)).toThrow("nonblank");
    expect(() => renderToStaticMarkup(<PasswordField hideLabel="" />)).toThrow("nonblank");
  });

  it("cleans up its reset listener and cancels a queued reset update when unmounted", async () => {
    const removeListener = vi.spyOn(document, "removeEventListener");
    try {
      await act(() =>
        root.render(
          <form>
            <PasswordField />
          </form>,
        ),
      );
      await act(() => toggle().click());
      await act(() => {
        container.querySelector("form")!.reset();
        root.unmount();
      });
      expect(removeListener).toHaveBeenCalledWith("reset", expect.any(Function), true);
    } finally {
      removeListener.mockRestore();
    }
  });
});
