import { act, createRef, StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { NumericInput, type NumericInputProps } from "./index.js";
import { Field } from "../field/index.js";

describe("NumericInput", () => {
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
  function form() {
    return container.querySelector("form")!;
  }
  async function render(children: ReactNode) {
    await act(() => root.render(children));
  }
  async function renderControl(props: NumericInputProps = { defaultValue: 5 }) {
    await render(
      <form>
        <NumericInput aria-label="Integer setting" name="setting" {...props} />
      </form>,
    );
  }
  async function edit(value: string) {
    await act(() => {
      input().focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input(),
        value,
      );
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function key(key: string, isComposing = false) {
    const event = new KeyboardEvent("keydown", {
      key,
      isComposing,
      bubbles: true,
      cancelable: true,
    });
    await act(() => input().dispatchEvent(event));
    return event;
  }
  async function blur() {
    await act(() => input().blur());
  }

  it("forwards the native input/ref/Field associations and styles", async () => {
    const reference = createRef<HTMLInputElement>();
    await render(
      <Field id="count" label="Count" description="Choose an integer" required>
        <NumericInput
          defaultValue={5}
          name="count"
          ref={reference}
          className="consumer-input"
          style={{ width: 120 }}
          aria-describedby="extra"
        />
      </Field>,
    );
    expect(input()).toBe(reference.current);
    expect(input().type).toBe("number");
    expect(input().step).toBe("1");
    expect(input().name).toBe("count");
    expect(input().id).toBe("count");
    expect(input().labels?.[0]?.textContent).toBe("Count *");
    expect(input().getAttribute("aria-describedby")).toBe("extra count-description");
    expect(input().required).toBe(true);
    expect(input().classList.contains("consumer-input")).toBe(true);
    expect(input().style.width).toBe("120px");
  });

  it.each(["blur", "Enter"])("commits a valid changed integer on %s only", async (trigger) => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    await renderControl({ defaultValue: 5, onValueChange, onChange });
    await edit("8");
    expect(onChange).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(new FormData(form()).get("setting")).toBe("8");
    if (trigger === "blur") await blur();
    else expect((await key("Enter")).defaultPrevented).toBe(false);
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
    await edit("");
    await key("Enter");
    expect(input().value).toBe("8");
    expect(onValueChange).toHaveBeenCalledOnce();
  });

  it.each(["", "-", "1e", "NaN", "3.5", "12", "-2", "9007199254740992"])(
    "restores invalid draft %s without an invalid numeric callback",
    async (draft) => {
      const onValueChange = vi.fn();
      await renderControl({ defaultValue: 5, min: 0, max: 10, required: true, onValueChange });
      await edit(draft);
      expect(input().value === "" || !input().validity.valid).toBe(true);
      await key("Enter");
      expect(input().value).toBe("5");
      expect(input().validity.valid).toBe(true);
      expect(new FormData(form()).get("setting")).toBe("5");
      expect(onValueChange).not.toHaveBeenCalled();
    },
  );

  it("keeps required empty drafts while editing and restores synchronously before later Enter listeners", async () => {
    await renderControl({ defaultValue: 5, required: true });
    await edit("");
    expect(input().value).toBe("");
    expect(input().validity.valueMissing).toBe(true);
    let observed: unknown;
    const observe = () => {
      observed = [input().value, input().validity.valid, new FormData(form()).get("setting")];
    };
    document.addEventListener("keydown", observe, { once: true });
    await key("Enter");
    expect(observed).toEqual(["5", true, "5"]);
  });

  it("uses native step grid validation and never snaps a mismatched commit", async () => {
    const onValueChange = vi.fn();
    await renderControl({ defaultValue: 4, min: 0, max: 10, step: 2, onValueChange });
    await edit("5");
    expect(input().validity.stepMismatch).toBe(true);
    await blur();
    expect(input().value).toBe("4");
    expect(onValueChange).not.toHaveBeenCalled();
    await edit("8");
    await key("Enter");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("preserves empty and numeric drafts on same-value renders and accepts genuine prop replacement", async () => {
    const onValueChange = vi.fn();
    await renderControl({ value: 5, onValueChange });
    const native = input();
    await edit("");
    await renderControl({ value: 5, title: "unrelated render", onValueChange });
    expect(input()).toBe(native);
    expect(input().value).toBe("");
    await edit("8");
    await renderControl({ value: 5, title: "another render", onValueChange });
    expect(input().value).toBe("8");
    await renderControl({ value: 7, onValueChange });
    expect(input().value).toBe("7");
    await edit("");
    await blur();
    expect(input().value).toBe("7");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("retains an unacknowledged controlled candidate and deduplicates Enter then blur", async () => {
    const onValueChange = vi.fn();
    await renderControl({ value: 5, onValueChange });
    await edit("8");
    await key("Enter");
    await renderControl({ value: 5, onValueChange });
    expect(input().value).toBe("8");
    await blur();
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
    await edit("9");
    await edit("8");
    await key("Enter");
    expect(onValueChange).toHaveBeenCalledTimes(2);
    await edit("");
    await key("Enter");
    expect(input().value).toBe("5");
  });

  it("canonicalizes a same-value commit and retains native stepping back to that value", async () => {
    const onValueChange = vi.fn();
    await renderControl({ value: 5, onValueChange });
    await edit("005");
    await key("Enter");
    expect(input().value).toBe("5");
    await edit("4");
    await act(() => {
      input().stepUp();
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
    await renderControl({ value: 5, onValueChange });
    expect(input().value).toBe("5");
    await key("Enter");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("revalidates changed bounds without clamping drafts or authoritative values", async () => {
    const onValueChange = vi.fn();
    await renderControl({ value: 5, max: 10, onValueChange });
    await edit("8");
    await renderControl({ value: 5, max: 6, onValueChange });
    expect(input().value).toBe("8");
    expect(input().validity.rangeOverflow).toBe(true);
    await blur();
    expect(input().value).toBe("5");
    await renderControl({ value: 12, max: 6, onValueChange });
    expect(input().value).toBe("12");
    expect(input().validity.rangeOverflow).toBe(true);
    await key("Enter");
    expect(input().value).toBe("12");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it.each(["disabled", "readOnly"] as const)("does not commit while %s", async (flag) => {
    const onValueChange = vi.fn();
    await renderControl({ defaultValue: 5, [flag]: true, onValueChange });
    input().value = "8";
    await key("Enter");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(new FormData(form()).get("setting")).toBe(flag === "disabled" ? null : "8");
  });

  it("honors Field flags, explicit false overrides, and disabled fieldset first-legend semantics", async () => {
    const onValueChange = vi.fn();
    await render(
      <form>
        <fieldset disabled>
          <legend>
            <Field label="Enabled legend" disabled required>
              <NumericInput
                defaultValue={5}
                disabled={false}
                required={false}
                onValueChange={onValueChange}
              />
            </Field>
          </legend>
          <NumericInput defaultValue={5} name="blocked" onValueChange={onValueChange} />
        </fieldset>
      </form>,
    );
    expect(input().matches(":disabled")).toBe(false);
    expect(input().required).toBe(false);
    await edit("8");
    await key("Enter");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
    const blocked = container.querySelector<HTMLInputElement>('[name="blocked"]')!;
    blocked.value = "9";
    await act(() =>
      blocked.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(new FormData(form()).has("blocked")).toBe(false);
  });

  it("composes caller events, respects commit cancellation, and ignores composition Enter", async () => {
    const onValueChange = vi.fn();
    const onBlur = vi.fn((event) => event.preventDefault());
    const onKeyDown = vi.fn((event) => event.preventDefault());
    await renderControl({ defaultValue: 5, onValueChange, onBlur, onKeyDown });
    await edit("8");
    expect((await key("Enter")).defaultPrevented).toBe(true);
    await blur();
    expect(onBlur).toHaveBeenCalledOnce();
    expect(onValueChange).not.toHaveBeenCalled();
    await renderControl({ defaultValue: 5, onValueChange });
    await key("Enter", true);
    await key("ArrowUp");
    expect(onValueChange).not.toHaveBeenCalled();
    await key("Enter");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("resets to the current uncontrolled default without a numeric callback", async () => {
    const onValueChange = vi.fn();
    await renderControl({ defaultValue: 5, onValueChange });
    await edit("8");
    await key("Enter");
    await renderControl({ defaultValue: 3, onValueChange });
    expect(input().value).toBe("8");
    await edit("");
    await act(() => form().reset());
    expect(input().value).toBe("3");
    expect(new FormData(form()).get("setting")).toBe("3");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
    await edit("");
    await key("Enter");
    expect(input().value).toBe("3");
  });

  it("restores current controlled value on reset without requesting a commit", async () => {
    const onValueChange = vi.fn();
    await renderControl({ value: 5, onValueChange });
    await edit("8");
    await key("Enter");
    await renderControl({ value: 7, onValueChange });
    await edit("");
    await act(() => form().reset());
    expect(input().value).toBe("7");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(8);
  });

  it("keeps the native value-attribute step base coherent with current reset defaults", async () => {
    await renderControl({ defaultValue: 5, step: 2 });
    await edit("7");
    await renderControl({ defaultValue: 6, step: 2 });
    await act(() => form().reset());
    expect(input().value).toBe("6");
    expect(input().defaultValue).toBe("6");
    expect(input().validity.stepMismatch).toBe(false);
  });

  it("respects current external form association and later reset cancellation", async () => {
    async function renderExternal(formId: string) {
      await render(
        <StrictMode>
          <form id="first" />
          <form id="second" />
          <NumericInput defaultValue={5} form={formId} name="setting" />
        </StrictMode>,
      );
    }
    await renderExternal("first");
    await edit("8");
    await renderExternal("second");
    const second = container.querySelector<HTMLFormElement>("#second")!;
    await act(() => form().reset());
    expect(input().value).toBe("8");
    second.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    await act(() => second.reset());
    expect(input().value).toBe("8");
    await act(() => second.reset());
    expect(input().value).toBe("5");
    expect(new FormData(second).get("setting")).toBe("5");
  });

  it("preserves caller-owned custom validity and Field error presentation", async () => {
    const onValueChange = vi.fn();
    await render(
      <Field label="Setting" error="Application error">
        <NumericInput defaultValue={5} onValueChange={onValueChange} />
      </Field>,
    );
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(input().validity.valid).toBe(true);
    await edit("8");
    input().setCustomValidity("Application constraint");
    await key("Enter");
    expect(input().value).toBe("5");
    expect(input().validationMessage).toBe("Application constraint");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("opts into focused wheel cancellation, retains focus, and removes its listener when disabled", async () => {
    const onWheel = vi.fn();
    await renderControl({ defaultValue: 5, disableWheelChange: true, onWheel });
    function wheel(options: WheelEventInit = {}) {
      const event = new WheelEvent("wheel", {
        deltaY: 10,
        bubbles: true,
        cancelable: true,
        ...options,
      });
      input().dispatchEvent(event);
      return event;
    }
    expect(wheel().defaultPrevented).toBe(false);
    input().focus();
    expect(wheel().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe("5");
    expect(wheel({ ctrlKey: true }).defaultPrevented).toBe(false);
    expect(wheel({ deltaY: 0, deltaX: 10 }).defaultPrevented).toBe(false);
    expect(onWheel).toHaveBeenCalledTimes(4);
    await renderControl({ defaultValue: 5, disableWheelChange: false });
    expect(wheel().defaultPrevented).toBe(false);
    await renderControl({ defaultValue: 5, disableWheelChange: true, readOnly: true });
    expect(wheel().defaultPrevented).toBe(false);
  });

  it.each([
    { defaultValue: NaN },
    { defaultValue: 1.5 },
    { defaultValue: 9007199254740992 },
    { defaultValue: 5, step: 0 },
    { defaultValue: 5, step: 0.5 },
    { defaultValue: 5, min: 8, max: 3 },
    { defaultValue: 5, max: Infinity },
  ])("rejects unsupported configuration %# without inventing a numeric default", (props) => {
    expect(() => renderToStaticMarkup(<NumericInput {...props} />)).toThrow(TypeError);
  });
});
