import { act, createRef, memo, useActionState, useState } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Field } from "./index.js";
import { useFieldControl } from "./context.js";
import { Input } from "../input/index.js";
import { Textarea } from "../textarea/index.js";
import { NativeSelect } from "../native-select/index.js";
import { Checkbox } from "../checkbox/index.js";
import { Button } from "../button/index.js";

describe("native form components", () => {
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

  function getInput(name: string) {
    const input = container.querySelector(`input[name="${name}"]`);
    if (!(input instanceof HTMLInputElement)) throw new Error(`Missing input ${name}`);
    return input;
  }

  it("connects labels to unique controls and keeps custom Field IDs authoritative", async () => {
    await act(() =>
      root.render(
        <>
          <Field label="Run name" id="run-name">
            <Input name="run" id="ignored-child-id" />
          </Field>
          <Field label="Prompt">
            <Textarea name="prompt" />
          </Field>
          <Field label="Mode">
            <NativeSelect name="mode">
              <option>Plan</option>
            </NativeSelect>
          </Field>
        </>,
      ),
    );
    const labels = [...container.querySelectorAll("label")];
    expect(labels).toHaveLength(3);
    expect(labels.every((label) => label.control !== null)).toBe(true);
    expect(new Set(labels.map((label) => label.htmlFor)).size).toBe(3);
    expect(labels[0]?.control).toBe(getInput("run"));
    expect(getInput("run").id).toBe("run-name");
    expect(container.querySelectorAll("#run-name")).toHaveLength(1);
  });

  it("merges descriptions without duplicate tokens and removes stale error references without losing input", async () => {
    const renderField = (error?: string) => (
      <>
        <p id="external-help">Project help</p>
        <Field id="task" label="Task" description="Describe the work" error={error}>
          <Input
            name="task"
            defaultValue="Draft"
            aria-describedby="external-help task-description external-help"
          />
        </Field>
      </>
    );
    await act(() => root.render(renderField("A task already uses this name")));
    const input = getInput("task");
    expect(input.getAttribute("aria-describedby")).toBe(
      "external-help task-description task-error",
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    input.value = "My edited draft";
    await act(() => root.render(renderField()));
    expect(input.value).toBe("My edited draft");
    expect(input.getAttribute("aria-describedby")).toBe("external-help task-description");
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(container.querySelector("#task-error")).toBeNull();
  });

  it("preserves explicit native flag and accessibility overrides", async () => {
    await act(() =>
      root.render(
        <Field label="Optional override" required disabled error="Field-level error">
          <Input
            name="override"
            required={false}
            disabled={false}
            aria-invalid={false}
            aria-label="Explicit name"
          />
        </Field>,
      ),
    );
    const input = getInput("override");
    expect(input.required).toBe(false);
    expect(input.disabled).toBe(false);
    expect(input.getAttribute("aria-invalid")).toBe("false");
    expect(input.getAttribute("aria-label")).toBe("Explicit name");
  });

  it("uses native required validation and excludes disabled fields from FormData", async () => {
    await act(() =>
      root.render(
        <form>
          <Field label="Run" required>
            <Input name="run" />
          </Field>
          <Field label="Locked" disabled>
            <Input name="locked" defaultValue="private" />
          </Field>
        </form>,
      ),
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    expect(getInput("run").checkValidity()).toBe(false);
    getInput("run").value = "Example";
    expect(form.checkValidity()).toBe(true);
    expect(new FormData(form).get("run")).toBe("Example");
    expect(new FormData(form).has("locked")).toBe(false);
  });

  it("keeps Checkbox native: label activation, explicit value, unchecked omission, and reset", async () => {
    await act(() =>
      root.render(
        <form>
          <Field label="Require review" orientation="horizontal">
            <Checkbox name="review" value="required" />
          </Field>
        </form>,
      ),
    );
    const form = container.querySelector("form");
    const label = container.querySelector("label");
    if (!form || !label) throw new Error("Missing checkbox form");
    const checkbox = getInput("review");
    expect(checkbox.type).toBe("checkbox");
    expect(new FormData(form).has("review")).toBe(false);
    await act(() => label.click());
    expect(checkbox.checked).toBe(true);
    expect(new FormData(form).get("review")).toBe("required");
    await act(() => form.reset());
    expect(checkbox.checked).toBe(false);
  });

  it("passes refs to every native control and supports standalone IDs and multi-select values", async () => {
    const inputRef = createRef<HTMLInputElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();
    const selectRef = createRef<HTMLSelectElement>();
    const checkboxRef = createRef<HTMLInputElement>();
    await act(() =>
      root.render(
        <form>
          <Input ref={inputRef} id="standalone" name="input" />
          <Textarea ref={textareaRef} name="textarea" rows={5} defaultValue="Notes" />
          <NativeSelect ref={selectRef} name="modes" multiple defaultValue={["plan", "review"]}>
            <option value="plan">Plan</option>
            <option value="review">Review</option>
          </NativeSelect>
          <Checkbox ref={checkboxRef} name="checkbox" defaultChecked />
        </form>,
      ),
    );
    expect(inputRef.current?.id).toBe("standalone");
    expect(textareaRef.current?.rows).toBe(5);
    expect(textareaRef.current?.value).toBe("Notes");
    expect(checkboxRef.current?.checked).toBe(true);
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    expect(new FormData(form).getAll("modes")).toEqual(["plan", "review"]);
    selectRef.current?.focus();
    expect(document.activeElement).toBe(selectRef.current);
  });

  it("supports controlled input and checkbox state without a parallel library value store", async () => {
    function Controlled() {
      const [name, setName] = useState("Initial");
      const [review, setReview] = useState(false);
      return (
        <>
          <Input
            name="controlled"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <Checkbox
            name="review"
            checked={review}
            onChange={(event) => setReview(event.currentTarget.checked)}
          />
          <output>
            {name} / {String(review)}
          </output>
        </>
      );
    }
    await act(() => root.render(<Controlled />));
    const input = getInput("controlled");
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!valueSetter) throw new Error("Missing native value setter");
    await act(() => {
      valueSetter.call(input, "Updated");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(() => getInput("review").click());
    expect(container.querySelector("output")?.textContent).toBe("Updated / true");
  });

  it("does not broadcast message wording changes or updates in sibling fields through context", async () => {
    const firstRenders = vi.fn();
    const secondRenders = vi.fn();
    const First = memo(function First() {
      const attributes = useFieldControl({});
      firstRenders();
      return <input name="first" {...attributes} />;
    });
    const Second = memo(function Second() {
      const attributes = useFieldControl({});
      secondRenders();
      return <input name="second" {...attributes} />;
    });
    const firstControl = <First />;
    const secondControl = <Second />;
    const renderFields = (firstError: string | undefined, secondRequired: boolean) => (
      <>
        <Field label="First" error={firstError}>
          {firstControl}
        </Field>
        <Field label="Second" required={secondRequired}>
          {secondControl}
        </Field>
      </>
    );
    await act(() => root.render(renderFields("Original wording", false)));
    await act(() => root.render(renderFields("Updated wording", true)));
    expect(firstRenders).toHaveBeenCalledTimes(1);
    expect(secondRenders).toHaveBeenCalledTimes(2);
    expect(getInput("second").required).toBe(true);
    await act(() => root.render(renderFields(undefined, true)));
    expect(firstRenders).toHaveBeenCalledTimes(2);
    expect(secondRenders).toHaveBeenCalledTimes(2);
    expect(getInput("first").hasAttribute("aria-invalid")).toBe(false);
  });

  it("preserves an unsuccessful draft through a React 19 form Action reset", async () => {
    function ActionForm() {
      const [state, action] = useActionState(
        async (_previous: { draft: string; error: string }, data: FormData) => {
          const name = data.get("name");
          return { draft: typeof name === "string" ? name : "", error: "Choose a different name" };
        },
        { draft: "Initial", error: "" },
      );
      return (
        <form action={action}>
          <Field label="Name" error={state.error}>
            <Input name="name" defaultValue={state.draft} />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      );
    }
    await act(() => root.render(<ActionForm />));
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing Action form");
    getInput("name").value = "Unsaved draft";
    await act(async () => form.requestSubmit());
    expect(getInput("name").value).toBe("Unsaved draft");
    expect(getInput("name").getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Choose a different name");
  });

  it("preserves textarea, selection and checkbox drafts after an Action returns validation errors", async () => {
    function ActionForm() {
      const [state, action] = useActionState(
        async (
          _previous: { prompt: string; mode: string; review: boolean; error: string },
          data: FormData,
        ) => ({
          prompt: String(data.get("prompt") ?? ""),
          mode: String(data.get("mode") ?? ""),
          review: data.get("review") === "yes",
          error: "Keep this draft",
        }),
        { prompt: "Initial prompt", mode: "plan", review: false, error: "" },
      );
      return (
        <form action={action}>
          <Field label="Prompt">
            <Textarea name="prompt" defaultValue={state.prompt} />
          </Field>
          <Field label="Mode">
            <NativeSelect key={state.mode} name="mode" defaultValue={state.mode}>
              <option value="plan">Plan</option>
              <option value="review">Review</option>
            </NativeSelect>
          </Field>
          <Field label="Review">
            <Checkbox name="review" value="yes" defaultChecked={state.review} />
          </Field>
          <Button type="submit">Validate</Button>
          <p role="alert">{state.error}</p>
        </form>
      );
    }
    await act(() => root.render(<ActionForm />));
    const form = container.querySelector("form");
    const textarea = container.querySelector("textarea");
    const select = container.querySelector("select");
    if (!form || !textarea || !select) throw new Error("Missing draft controls");
    textarea.value = "My unfinished prompt";
    select.value = "review";
    await act(() => getInput("review").click());
    await act(async () => form.requestSubmit());
    expect(textarea.value).toBe("My unfinished prompt");
    expect(container.querySelector("select")?.value).toBe("review");
    expect(getInput("review").checked).toBe(true);
    expect(new FormData(form).get("mode")).toBe("review");
  });

  it("hydrates server-generated associations with a matching root prefix", async () => {
    const fields = (
      <Field label="Server-rendered name" description="Shared hint">
        <Input name="hydrated" />
      </Field>
    );
    const html = renderToString(fields, { identifierPrefix: "forms-test-" });
    await act(() => root.unmount());
    container.innerHTML = html;
    const onRecoverableError = vi.fn();
    await act(() => {
      root = hydrateRoot(container, fields, {
        identifierPrefix: "forms-test-",
        onRecoverableError,
      });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("label")?.control).toBe(getInput("hydrated"));
    const descriptionId = getInput("hydrated").getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(descriptionId ?? "")?.textContent).toBe("Shared hint");
  });
});
