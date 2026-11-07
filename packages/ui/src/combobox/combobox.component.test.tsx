import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Combobox, type ComboboxOption, type ComboboxProps } from "./index.js";
import { Field } from "../field/index.js";
import { Dialog, DialogTrigger, DialogContent } from "../dialog/index.js";

const options: readonly ComboboxOption[] = [
  { value: "atlas", label: "Atlas" },
  { value: "beacon", label: "Beacon" },
  { value: "cedar", label: "Cedar" },
  { value: "disabled", label: "Unavailable", disabled: true },
];

describe("Combobox", () => {
  let container: HTMLDivElement;
  let root: Root;

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
    vi.unstubAllGlobals();
  });

  function input() {
    return container.querySelector<HTMLInputElement>('[role="combobox"]')!;
  }
  function button(name: string) {
    return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (item) => item.getAttribute("aria-label") === name,
    )!;
  }
  async function renderControl(props: Partial<ComboboxProps> = {}) {
    await act(() =>
      root.render(
        <form>
          <Combobox aria-label="Project" options={options} name="project" {...props} />
        </form>,
      ),
    );
  }
  async function edit(text: string) {
    await act(() => {
      input().focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input(),
        text,
      );
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function key(value: string, isComposing = false) {
    const event = new KeyboardEvent("keydown", {
      key: value,
      isComposing,
      bubbles: true,
      cancelable: true,
    });
    await act(() => input().dispatchEvent(event));
    return event;
  }
  async function open() {
    await act(() => input().focus());
    await key("ArrowDown");
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).not.toBeNull());
  }
  async function choose(label: string) {
    await open();
    const item = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === label,
    )!;
    expect(item).not.toBeUndefined();
    await act(() => item.click());
  }
  function data() {
    return new FormData(container.querySelector("form")!).get("project");
  }
  async function valid() {
    let result = false;
    await act(() => {
      result = input().checkValidity();
    });
    return result;
  }

  it("forwards input ref/props, uses the Field label once and submits only one selected ID", async () => {
    const reference = createRef<HTMLInputElement>();
    await act(() =>
      root.render(
        <form>
          <p id="extra-help">Extra help</p>
          <Field
            id="project-choice"
            label="Project"
            description="Local only"
            error="Example error"
            required
          >
            <Combobox
              options={options}
              ref={reference}
              id="ignored-child"
              defaultValue="cedar"
              name="project"
              className="consumer-input"
              style={{ maxWidth: "24rem" }}
              aria-describedby="extra-help project-choice-description"
              data-owner="test"
            />
          </Field>
        </form>,
      ),
    );
    expect(reference.current).toBe(input());
    expect(input().id).toBe("project-choice");
    expect(container.querySelector("label")?.control).toBe(input());
    expect(input().getAttribute("aria-labelledby")).toContain(container.querySelector("label")!.id);
    expect(input().getAttribute("aria-describedby")?.split(/\s+/)).toEqual(
      expect.arrayContaining(["extra-help", "project-choice-description", "project-choice-error"]),
    );
    expect(
      input()
        .getAttribute("aria-describedby")
        ?.split(/\s+/)
        .filter((id) => id === "project-choice-description"),
    ).toHaveLength(1);
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(input().required).toBe(true);
    expect(input().classList.contains("consumer-input")).toBe(true);
    expect(input().style.maxWidth).toBe("24rem");
    expect(input().getAttribute("data-owner")).toBe("test");
    expect(input().value).toBe("Cedar");
    expect(input().name).toBe("");
    expect(new FormData(container.querySelector("form")!).getAll("project")).toEqual(["cedar"]);
    expect(input().validity.customError).toBe(false);
    expect(button("Show options").type).toBe("button");
    expect(button("Show options").tabIndex).toBe(-1);
    expect(button("Clear selection").tabIndex).toBe(-1);
  });

  it("filters labels locally without committing query text and selects with keyboard while retaining input focus", async () => {
    const change = vi.fn();
    await renderControl({ defaultValue: "atlas", onValueChange: change });
    await edit("ced");
    await vi.waitFor(() => expect(document.querySelectorAll('[role="option"]')).toHaveLength(1));
    expect(document.querySelector('[role="option"]')?.textContent).toBe("Cedar");
    expect(data()).toBe("atlas");
    expect(change).not.toHaveBeenCalled();
    await key("ArrowDown");
    const activeId = input().getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)?.textContent).toBe("Cedar");
    await key("Enter");
    expect(data()).toBe("cedar");
    expect(input().value).toBe("Cedar");
    expect(change).toHaveBeenCalledExactlyOnceWith("cedar");
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("restores the selected label on Escape/blur without a change callback and keeps native editing/IME keys", async () => {
    const change = vi.fn();
    await renderControl({ defaultValue: "atlas", onValueChange: change });
    await edit("be");
    await key("Escape");
    expect(input().value).toBe("Atlas");
    expect(data()).toBe("atlas");
    await edit("unmatched text");
    await act(() => input().blur());
    expect(input().value).toBe("Atlas");
    expect(change).not.toHaveBeenCalled();
    await edit("be");
    await key("ArrowDown");
    expect((await key("Enter", true)).defaultPrevented).toBe(false);
    expect(change).not.toHaveBeenCalled();
    expect(data()).toBe("atlas");
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    await act(() => input().dispatchEvent(paste));
    expect(paste.defaultPrevented).toBe(false);
    expect((await key("ArrowLeft")).defaultPrevented).toBe(false);
  });

  it("clears selection with the built-in action and by emptying input without submitting", async () => {
    const change = vi.fn();
    await renderControl({ defaultValue: "cedar", onValueChange: change });
    const submit = vi.fn((event: Event) => event.preventDefault());
    container.querySelector("form")!.addEventListener("submit", submit);
    await act(() => button("Clear selection").click());
    expect(data()).toBe("");
    expect(input().value).toBe("");
    expect(document.activeElement).toBe(input());
    expect(change).toHaveBeenCalledExactlyOnceWith(null);
    await choose("Atlas");
    change.mockClear();
    await edit("");
    expect(data()).toBe("");
    expect(change).toHaveBeenCalledExactlyOnceWith(null);
    expect(submit).not.toHaveBeenCalled();
  });

  it("keeps controlled changes and reset policy with the caller, including rejected changes", async () => {
    const change = vi.fn();
    await renderControl({ value: "atlas", onValueChange: change });
    await act(() => button("Clear selection").click());
    expect(change).toHaveBeenCalledExactlyOnceWith(null);
    expect(data()).toBe("atlas");
    expect(input().value).toBe("Atlas");
    await renderControl({ value: "beacon", onValueChange: change });
    expect(input().value).toBe("Beacon");
    await edit("ce");
    await act(() => container.querySelector("form")!.reset());
    expect(input().value).toBe("Beacon");
    expect(data()).toBe("beacon");
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("restores uncontrolled defaults and closes on an uncancelled reset without emitting selection changes", async () => {
    const change = vi.fn();
    await renderControl({ defaultValue: "cedar", onValueChange: change });
    await choose("Atlas");
    change.mockClear();
    await edit("be");
    await act(() => container.querySelector("form")!.reset());
    expect(input().value).toBe("Cedar");
    expect(data()).toBe("cedar");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(change).not.toHaveBeenCalled();
  });

  it("replaces a dirty query when the controlled selection changes without blur, including read-only updates", async () => {
    const change = vi.fn();
    await renderControl({ value: "atlas", onValueChange: change });
    await edit("ce");
    await renderControl({ value: "atlas", onValueChange: change });
    expect(input().value).toBe("ce");
    await renderControl({ value: "beacon", onValueChange: change, readOnly: true });
    expect(input().value).toBe("Beacon");
    expect(data()).toBe("beacon");
    expect(input().getAttribute("aria-expanded")).toBe("false");
    await renderControl({ value: "atlas", onValueChange: change });
    expect(input().value).toBe("Atlas");
    expect(data()).toBe("atlas");
    expect(change).not.toHaveBeenCalled();
  });

  it("respects later reset cancellation without losing a dirty query or selected ID", async () => {
    const change = vi.fn();
    await act(() =>
      root.render(
        <form onReset={(event) => event.preventDefault()}>
          <Combobox
            aria-label="Project"
            options={options}
            name="project"
            defaultValue="cedar"
            onValueChange={change}
          />
        </form>,
      ),
    );
    await choose("Atlas");
    change.mockClear();
    await edit("be");
    await act(() => container.querySelector("form")!.reset());
    expect(input().value).toBe("be");
    expect(data()).toBe("atlas");
    expect(change).not.toHaveBeenCalled();
  });

  it("closes a reset query even when the selection is unchanged, then opens normally on new typing", async () => {
    await renderControl({ defaultValue: "cedar" });
    await edit("be");
    expect(input().getAttribute("aria-expanded")).toBe("true");
    await act(() => container.querySelector("form")!.reset());
    expect(input().getAttribute("aria-expanded")).toBe("false");
    expect(input().value).toBe("Cedar");
    expect(document.activeElement).toBe(input());
    await edit("atl");
    expect(input().getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector('[role="option"]')?.textContent).toBe("Atlas");
    await key("ArrowDown");
    await key("Enter");
    expect(data()).toBe("atlas");
    await act(() => container.querySelector("form")!.reset());
    expect(data()).toBe("cedar");
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("skips disabled options by keyboard/pointer and leaves Tab's native focus movement intact", async () => {
    const change = vi.fn();
    await renderControl({ onValueChange: change });
    await open();
    const unavailable = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent === "Unavailable",
    )!;
    expect(unavailable.getAttribute("aria-disabled")).toBe("true");
    await act(() => unavailable.click());
    expect(change).not.toHaveBeenCalled();
    expect(data()).toBe("");
    await key("ArrowDown");
    await key("ArrowDown");
    await key("ArrowDown");
    await key("ArrowDown");
    expect(
      document.getElementById(input().getAttribute("aria-activedescendant")!)?.textContent,
    ).toBe("Cedar");
    expect((await key("Tab")).defaultPrevented).toBe(false);
    expect(data()).toBe("cedar");
    expect(input().getAttribute("aria-expanded")).toBe("false");
  });

  it("places the named popup in an explicit portal container without duplicating input controls", async () => {
    function ScopedExample() {
      const [portal, setPortal] = useState<HTMLDivElement | null>(null);
      return (
        <div data-theme="dark" ref={setPortal}>
          <Combobox aria-label="Project" options={options} portalContainer={portal} />
        </div>
      );
    }
    await act(() => root.render(<ScopedExample />));
    await open();
    const list = document.querySelector('[role="listbox"]')!;
    expect(list.closest('[data-theme="dark"]')).toBe(container.firstElementChild);
    expect(list.getAttribute("aria-label")).toBe("Suggestions");
    expect(input().getAttribute("aria-label")).toBe("Project");
    expect(container.querySelectorAll('[role="combobox"]')).toHaveLength(1);
    expect(container.querySelectorAll(".lj-combobox-group button")).toHaveLength(2);
  });

  it("dismisses the popup before its enclosing Dialog on Escape and restores modal trigger focus", async () => {
    const escape = vi.fn();
    function ModalExample() {
      const [portal, setPortal] = useState<HTMLDivElement | null>(null);
      return (
        <Dialog>
          <DialogTrigger>Choose project</DialogTrigger>
          <DialogContent
            title="Project choice"
            portalContainer={container}
            onEscapeKeyDown={escape}
          >
            <div ref={setPortal}>
              <Combobox
                aria-label="Project"
                options={options}
                defaultValue="cedar"
                portalContainer={portal}
              />
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    await act(() => root.render(<ModalExample />));
    const trigger = container.querySelector("button")!;
    await act(() => trigger.click());
    await edit("be");
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();
    await key("Escape");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(input().value).toBe("Cedar");
    expect(document.activeElement).toBe(input());
    expect(escape).toHaveBeenCalledTimes(1);
    await key("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(escape).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("uses the current external form owner and suppresses stale upstream reset subscriptions", async () => {
    const change = vi.fn();
    async function renderOwner(owner: string) {
      await act(() =>
        root.render(
          <>
            <form id="first" />
            <form id="second" />
            <Combobox
              aria-label="Project"
              options={options}
              name="project"
              defaultValue="cedar"
              form={owner}
              onValueChange={change}
            />
          </>,
        ),
      );
    }
    await renderOwner("first");
    await choose("Atlas");
    await edit("be");
    await renderOwner("second");
    change.mockClear();
    await act(() => container.querySelector<HTMLFormElement>("#first")!.reset());
    expect(input().value).toBe("be");
    expect(new FormData(container.querySelector<HTMLFormElement>("#second")!).get("project")).toBe(
      "atlas",
    );
    await act(() => container.querySelector<HTMLFormElement>("#second")!.reset());
    expect(input().value).toBe("Cedar");
    expect(new FormData(container.querySelector<HTMLFormElement>("#second")!).get("project")).toBe(
      "cedar",
    );
    expect(change).not.toHaveBeenCalled();
  });

  it.each(["prop", "field", "fieldset"] as const)(
    "keeps %s-disabled controls inert and omitted from FormData",
    async (source) => {
      const control = (
        <Combobox
          aria-label="Project"
          options={options}
          name="project"
          defaultValue="cedar"
          disabled={source === "prop" ? true : undefined}
        />
      );
      await act(() =>
        root.render(
          <form>
            {source === "field" ? (
              <Field label="Project" disabled>
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
      expect(button("Show options").matches(":disabled")).toBe(true);
      await act(() => button("Show options").click());
      expect(document.querySelector('[role="listbox"]')).toBeNull();
      expect(data()).toBeNull();
    },
  );

  it("closes a portaled popup when its fieldset becomes disabled and recovers when re-enabled", async () => {
    await act(() =>
      root.render(
        <form>
          <fieldset>
            <legend>Project</legend>
            <Combobox aria-label="Project" options={options} name="project" defaultValue="cedar" />
          </fieldset>
        </form>,
      ),
    );
    await open();
    const fieldset = container.querySelector("fieldset")!;
    await act(() => {
      fieldset.disabled = true;
    });
    await vi.waitFor(() => expect(document.querySelector('[role="listbox"]')).toBeNull());
    expect(data()).toBeNull();
    await act(() => {
      fieldset.disabled = false;
    });
    await vi.waitFor(() => expect(button("Show options").disabled).toBe(false));
    expect(input().matches(":disabled")).toBe(false);
    expect(data()).toBe("cedar");
    await choose("Atlas");
    expect(data()).toBe("atlas");
  });

  it("preserves the native first-legend exception and explicit Field flag overrides", async () => {
    await act(() =>
      root.render(
        <form>
          <fieldset disabled>
            <legend>
              <Field label="Project" disabled required error="Example">
                <Combobox
                  options={options}
                  name="project"
                  defaultValue="cedar"
                  disabled={false}
                  required={false}
                  aria-invalid={false}
                />
              </Field>
            </legend>
          </fieldset>
        </form>,
      ),
    );
    expect(input().matches(":disabled")).toBe(false);
    expect(input().required).toBe(false);
    expect(input().getAttribute("aria-invalid")).toBe("false");
    await choose("Atlas");
    expect(data()).toBe("atlas");
  });

  it("keeps readonly values submitted but prevents search, popup and clear changes", async () => {
    const change = vi.fn();
    await renderControl({ defaultValue: "cedar", readOnly: true, onValueChange: change });
    expect(input().readOnly).toBe(true);
    expect(data()).toBe("cedar");
    expect(button("Show options").disabled).toBe(true);
    expect(button("Clear selection").disabled).toBe(true);
    await act(() => button("Clear selection").click());
    expect(input().value).toBe("Cedar");
    expect(change).not.toHaveBeenCalled();
  });

  it("rejects nonempty uncommitted text for required selection without turning Field errors into native validity", async () => {
    await renderControl({ required: true });
    expect(await valid()).toBe(false);
    await edit("Unmatched text");
    expect(input().value).toBe("Unmatched text");
    expect(await valid()).toBe(false);
    expect(data()).toBe("");
    await key("Escape");
    await choose("Cedar");
    expect(await valid()).toBe(true);
    await renderControl({ required: false });
    input().setCustomValidity("Caller-owned validation");
    await edit("be");
    expect(input().validationMessage).toBe("Caller-owned validation");
  });

  it.each(["prop", "fieldset", "readonly"] as const)(
    "resynchronizes required selection after a %s-disabled validation transition",
    async (source) => {
      async function renderSelection(value: string | null, barred: boolean) {
        await act(() =>
          root.render(
            <form>
              <fieldset disabled={source === "fieldset" && barred}>
                <Combobox
                  aria-label="Project"
                  options={options}
                  name="project"
                  required
                  value={value}
                  disabled={source === "prop" && barred}
                  readOnly={source === "readonly" && barred}
                />
              </fieldset>
            </form>,
          ),
        );
      }
      await renderSelection(null, false);
      expect(await valid()).toBe(false);
      expect(input().validity.customError).toBe(true);
      await renderSelection(null, true);
      expect(input().willValidate).toBe(false);
      await renderSelection("cedar", true);
      await renderSelection("cedar", false);
      expect(input().willValidate).toBe(true);
      expect(await valid()).toBe(true);
      expect(input().validity.customError).toBe(false);
      expect(data()).toBe("cedar");
    },
  );

  it.each(["prop", "fieldset", "readonly"] as const)(
    "preserves application-owned errors across a %s-disabled validation transition",
    async (source) => {
      async function renderSelection(value: string | null, barred: boolean) {
        await act(() =>
          root.render(
            <form>
              <fieldset disabled={source === "fieldset" && barred}>
                <Combobox
                  aria-label="Project"
                  options={options}
                  name="project"
                  required
                  value={value}
                  disabled={source === "prop" && barred}
                  readOnly={source === "readonly" && barred}
                />
              </fieldset>
            </form>,
          ),
        );
      }
      await renderSelection(null, false);
      await renderSelection(null, true);
      input().setCustomValidity("Application rejected this choice.");
      await renderSelection("cedar", true);
      await renderSelection("cedar", false);
      expect(input().willValidate).toBe(true);
      expect(await valid()).toBe(false);
      expect(input().validationMessage).toBe("Application rejected this choice.");
      expect(data()).toBe("cedar");
    },
  );

  it("does not submit unknown/removed or disabled choices and never chooses the first option silently", async () => {
    await renderControl({ value: "missing" });
    expect(input().value).toBe("");
    expect(data()).toBe("");
    await renderControl({ value: "cedar" });
    expect(data()).toBe("cedar");
    await renderControl({
      value: "cedar",
      options: options.filter((option) => option.value !== "cedar"),
    });
    expect(input().value).toBe("");
    expect(data()).toBe("");
    await renderControl({ value: "disabled" });
    expect(input().value).toBe("Unavailable");
    expect(data()).toBeNull();
  });

  it("supports duplicate labels and an empty string ID without conflating them with null", async () => {
    const items = [
      { value: "one", label: "Duplicate" },
      { value: "two", label: "Duplicate" },
      { value: "", label: "Empty ID" },
    ];
    const change = vi.fn();
    await renderControl({ options: items, onValueChange: change });
    await open();
    await act(() => [...document.querySelectorAll<HTMLElement>('[role="option"]')][1]!.click());
    expect(data()).toBe("two");
    expect(input().value).toBe("Duplicate");
    await choose("Empty ID");
    expect(input().value).toBe("Empty ID");
    expect(change).toHaveBeenLastCalledWith("");
    await act(() => button("Clear selection").click());
    expect(change).toHaveBeenLastCalledWith(null);
  });

  it("renders a local empty state, supports custom action names, and hides an open complete control", async () => {
    await renderControl({
      triggerLabel: "Find a project",
      clearLabel: "Clear project",
      emptyMessage: "Nothing matches",
    });
    expect(button("Find a project")).not.toBeUndefined();
    expect(button("Clear project")).not.toBeUndefined();
    await edit("no such option");
    await vi.waitFor(() =>
      expect(document.querySelector('[role="listbox"]')?.textContent).toContain("Nothing matches"),
    );
    await renderControl({ hidden: true });
    expect(container.querySelector<HTMLElement>(".lj-combobox")!.hidden).toBe(true);
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it("validates unique IDs/nonblank labels and renders option text without interpreting HTML", async () => {
    expect(() =>
      renderToStaticMarkup(
        <Combobox
          options={[
            { value: "same", label: "One" },
            { value: "same", label: "Two" },
          ]}
          aria-label="Project"
        />,
      ),
    ).toThrow("unique string");
    expect(() =>
      renderToStaticMarkup(
        <Combobox options={[{ value: "one", label: " " }]} aria-label="Project" />,
      ),
    ).toThrow("nonblank");
    expect(() =>
      renderToStaticMarkup(<Combobox options={options} triggerLabel=" " aria-label="Project" />),
    ).toThrow("nonblank");
    await renderControl({
      options: [{ value: "safe", label: "<img src=x onerror=alert(1)>" }],
      defaultValue: "safe",
    });
    expect(input().value).toBe("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
  });

  it("leaves controlled native reset values with an application reset handler", async () => {
    function Controlled() {
      const [value, setValue] = useState<string | null>("atlas");
      return (
        <form onReset={() => setValue("atlas")}>
          <Combobox
            aria-label="Project"
            options={options}
            name="project"
            value={value}
            onValueChange={setValue}
          />
        </form>
      );
    }
    await act(() => root.render(<Controlled />));
    await choose("Cedar");
    expect(data()).toBe("cedar");
    await act(() => container.querySelector("form")!.reset());
    expect(data()).toBe("atlas");
    expect(input().value).toBe("Atlas");
  });
});
