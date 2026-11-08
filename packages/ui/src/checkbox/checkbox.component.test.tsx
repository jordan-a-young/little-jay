import { readFile } from "node:fs/promises";
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Field } from "../field/index.js";
import { Checkbox } from "./index.js";

const stylesheet = await readFile("packages/ui/dist/styles.css", "utf8");
const schemeClass = "[color-scheme:var(--lj-color-scheme)]";

describe("Checkbox semantic scheme and native contract", () => {
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

  it.each([
    ["light", "dark"],
    ["dark", "light"],
  ])(
    "binds native rendering to the nearest semantic scheme in %s / %s scopes",
    async (outer, inner) => {
      await act(() =>
        root.render(
          <div data-theme={outer}>
            <section data-theme={inner}>
              <Checkbox aria-label="Unchecked" />
              <Checkbox aria-label="Checked" defaultChecked />
              <Checkbox aria-label="Disabled" disabled defaultChecked />
            </section>
          </div>,
        ),
      );
      const controls = [...container.querySelectorAll("input")];
      expect(controls).toHaveLength(3);
      for (const control of controls) {
        expect(control.closest("[data-theme]")?.getAttribute("data-theme")).toBe(inner);
        expect(control.classList.contains(schemeClass)).toBe(true);
        expect(control.style.colorScheme).toBe("");
      }
      expect(stylesheet).toContain(
        ".\\[color-scheme\\:var\\(--lj-color-scheme\\)\\]{color-scheme:var(--lj-color-scheme)}",
      );
      expect(controls.map((control) => control.checked)).toEqual([false, true, true]);
      expect(controls[2]?.disabled).toBe(true);
      controls[0]!.focus();
      expect(document.activeElement).toBe(controls[0]);
      expect(controls[0]?.classList.contains("focus-visible:outline-primary")).toBe(true);
    },
  );

  it("preserves Field associations, refs, consumer styling, uncontrolled forms and reset", async () => {
    const ref = createRef<HTMLInputElement>();
    await act(() =>
      root.render(
        <form>
          <p id="external-help">Local choice</p>
          <Field
            id="review"
            label="Require review"
            orientation="horizontal"
            description="Review before continuing"
            error="Review is required"
            required
          >
            <Checkbox
              ref={ref}
              name="review"
              value="yes"
              defaultChecked
              className="project-checkbox"
              style={{ margin: "3px" }}
              aria-describedby="external-help"
            />
          </Field>
          <Field label="Unavailable" disabled>
            <Checkbox name="disabled" defaultChecked />
          </Field>
        </form>,
      ),
    );
    const control = container.querySelector<HTMLInputElement>("#review")!;
    const form = container.querySelector("form")!;
    expect(ref.current).toBe(control);
    expect(control.type).toBe("checkbox");
    expect(container.querySelector("label")?.control).toBe(control);
    expect(control.required).toBe(true);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-describedby")).toBe(
      "external-help review-description review-error",
    );
    expect(control.classList.contains("project-checkbox")).toBe(true);
    expect(control.style.margin).toBe("3px");
    expect([...new FormData(form)]).toEqual([["review", "yes"]]);
    await act(() => container.querySelector("label")!.click());
    expect(control.checked).toBe(false);
    expect(new FormData(form).has("review")).toBe(false);
    await act(() => form.reset());
    expect(control.checked).toBe(true);
    expect(new FormData(form).get("review")).toBe("yes");
    const disabled = container.querySelector<HTMLInputElement>('input[name="disabled"]')!;
    await act(() => disabled.click());
    expect(disabled.checked).toBe(true);
    expect(new FormData(form).has("disabled")).toBe(false);
  });

  it("retains caller-owned checked state when the enclosing theme changes", async () => {
    const onChange = vi.fn();
    function Controlled({ theme }: { theme: string }) {
      const [checked, setChecked] = useState(false);
      return (
        <form data-theme={theme}>
          <Checkbox
            aria-label="Review"
            name="review"
            checked={checked}
            onChange={(event) => {
              onChange(event.currentTarget.checked);
              setChecked(event.currentTarget.checked);
            }}
          />
        </form>
      );
    }
    await act(() => root.render(<Controlled theme="light" />));
    const control = container.querySelector("input")!;
    await act(() => control.click());
    expect(control.checked).toBe(true);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
    await act(() => root.render(<Controlled theme="dark" />));
    expect(container.querySelector("input")).toBe(control);
    expect(control.checked).toBe(true);
    expect(new FormData(container.querySelector("form")!).get("review")).toBe("on");
    await act(() => control.click());
    expect(control.checked).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
