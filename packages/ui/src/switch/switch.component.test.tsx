import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Switch } from "./index.js";
import { Field } from "../field/index.js";
import { Switch as RootSwitch } from "../index.js";

describe("Switch", () => {
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

  function getSwitch() {
    const control = container.querySelector('input[role="switch"]');
    if (!(control instanceof HTMLInputElement)) throw new Error("Missing switch");
    return control;
  }

  it("exports the same component at the root and forwards native props and ref", async () => {
    const ref = createRef<HTMLInputElement>();
    await act(() =>
      root.render(
        <Switch
          ref={ref}
          id="setting"
          aria-label="Notifications"
          className="custom"
          data-setting="notifications"
        />,
      ),
    );
    const control = getSwitch();
    expect(RootSwitch).toBe(Switch);
    expect(ref.current).toBe(control);
    expect(control.type).toBe("checkbox");
    expect(control.checked).toBe(false);
    expect(control.id).toBe("setting");
    expect(control.getAttribute("aria-label")).toBe("Notifications");
    expect(control.getAttribute("aria-checked")).toBeNull();
    expect(control.classList.contains("lj-switch")).toBe(true);
    expect(control.classList.contains("custom")).toBe(true);
    expect(control.dataset.setting).toBe("notifications");
    control.focus();
    expect(document.activeElement).toBe(control);
  });

  it("toggles uncontrolled state through its label and reports each new checked state", async () => {
    const checkedStates: boolean[] = [];
    await act(() =>
      root.render(
        <Field label="Notifications" orientation="horizontal">
          <Switch
            defaultChecked
            onChange={(event) => checkedStates.push(event.currentTarget.checked)}
          />
        </Field>,
      ),
    );
    const control = getSwitch();
    const label = container.querySelector("label");
    expect(label?.control).toBe(control);
    expect(control.checked).toBe(true);
    await act(() => label?.click());
    expect(control.checked).toBe(false);
    await act(() => control.click());
    expect(control.checked).toBe(true);
    expect(checkedStates).toEqual([false, true]);
  });

  it("supports caller-controlled state and does not override a rejected change", async () => {
    function Controlled() {
      const [enabled, setEnabled] = useState(false);
      return (
        <Switch
          aria-label="Notifications"
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
        />
      );
    }
    await act(() => root.render(<Controlled />));
    await act(() => getSwitch().click());
    expect(getSwitch().checked).toBe(true);
    await act(() => getSwitch().click());
    expect(getSwitch().checked).toBe(false);
    const onChange = vi.fn();
    await act(() => root.render(<Switch checked={false} onChange={onChange} />));
    await act(() => getSwitch().click());
    expect(onChange).toHaveBeenCalledOnce();
    expect(getSwitch().checked).toBe(false);
  });

  it("inherits field associations, errors and flags while preserving explicit overrides", async () => {
    await act(() =>
      root.render(
        <Field
          id="notifications"
          label="Notifications"
          description="Help"
          error="Unavailable"
          required
          disabled
        >
          <Switch id="ignored" aria-describedby="external notifications-description external" />
        </Field>,
      ),
    );
    const control = getSwitch();
    expect(control.id).toBe("notifications");
    expect(control.disabled).toBe(true);
    expect(control.required).toBe(true);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-describedby")).toBe(
      "external notifications-description notifications-error",
    );
    await act(() =>
      root.render(
        <Field label="Notifications" required disabled error="Unavailable">
          <Switch
            required={false}
            disabled={false}
            aria-invalid={false}
            aria-label="Explicit name"
          />
        </Field>,
      ),
    );
    expect(getSwitch().disabled).toBe(false);
    expect(getSwitch().required).toBe(false);
    expect(getSwitch().getAttribute("aria-invalid")).toBe("false");
    expect(getSwitch().getAttribute("aria-label")).toBe("Explicit name");
  });

  it("does not toggle disabled switches or switches in a disabled fieldset", async () => {
    const onChange = vi.fn();
    await act(() => root.render(<Switch disabled defaultChecked onChange={onChange} />));
    await act(() => getSwitch().click());
    expect(getSwitch().checked).toBe(true);
    await act(() =>
      root.render(
        <fieldset disabled>
          <Field label="Notifications">
            <Switch onChange={onChange} />
          </Field>
        </fieldset>,
      ),
    );
    await act(() => container.querySelector("label")?.click());
    expect(getSwitch().checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses native form data, required validation and reset without submitting on toggle", async () => {
    const onSubmit = vi.fn((event: React.SubmitEvent<HTMLFormElement>) => event.preventDefault());
    await act(() =>
      root.render(
        <form onSubmit={onSubmit}>
          <Switch
            aria-label="Notifications"
            name="notifications"
            value="yes"
            defaultChecked
            required
          />
          <Switch name="off" />
          <Switch name="disabled" defaultChecked disabled />
        </form>,
      ),
    );
    const form = container.querySelector("form")!;
    const control = getSwitch();
    expect([...new FormData(form)]).toEqual([["notifications", "yes"]]);
    expect(control.checkValidity()).toBe(true);
    await act(() => control.click());
    expect([...new FormData(form)]).toEqual([]);
    expect(control.checkValidity()).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    await act(() => form.reset());
    expect(control.checked).toBe(true);
    expect([...new FormData(form)]).toEqual([["notifications", "yes"]]);
  });
});
