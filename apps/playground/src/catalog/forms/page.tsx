import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import * as examples from "./examples.js";

const nativeProps = {
  name: "Native attributes, ref, className",
  type: "native control props",
  description:
    "Supports React 19 ref, name, disabled, required, ARIA, controlled values and uncontrolled defaults. No form framework is required.",
};
const controlAccessibility = [
  "Use Field or a native label to provide an accessible name.",
  "Applications own validation and server authorization; visual required/invalid flags are not authorization.",
  "Use name for FormData. Disabled controls are omitted; preserve submitted drafts when using React Actions.",
];
const documents: Record<string, CatalogDocument> = {
  "numeric-input": {
    overview:
      "A native number input for integer settings with separate drafts and committed values. Normal numeric editing may be temporarily empty; blur or Enter commits a valid integer, otherwise the previous committed value is restored. Domain validation, saving and conflicts stay application-owned.",
    usage:
      'import { Field, NumericInput } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Duration in seconds" required>\n  <NumericInput name="duration" defaultValue={30} min={5} max={3600} step={1} />\n</Field>',
    props: [
      {
        name: "value / defaultValue / onValueChange",
        type: "number / (value: number) => void",
        description:
          "Supply a committed integer or an uncontrolled initial integer. onValueChange requests a valid changed commit, not every draft keystroke or a server save. Empty/invalid restoration, reset and unchanged commits do not request a new number.",
      },
      {
        name: "min / max / step",
        type: "number / integer constraints",
        description:
          "Use native integer bounds and step validity. Invalid or out-of-range commits restore the latest committed value; they are not silently clamped or truncated.",
      },
      {
        name: "disableWheelChange",
        type: "boolean (default false)",
        description:
          "Opt in to cancelling vertical wheel defaults over the focused editable input without losing focus. This also stops page scrolling over that input; Ctrl-wheel zoom is not intercepted.",
      },
      {
        name: "Native input props, ref and Field",
        type: "NumericInputProps",
        description:
          "The actual number input owns its ref, name/form, events, className and style. Field provides its label/messages/default flags. Native onChange observes drafts; onValueChange requests a numeric commit.",
      },
    ],
    accessibility: [
      "Provide a Field or native label. Preserve native spinbutton semantics, arrow stepping, focus, required/disabled/read-only behavior and fieldset rules.",
      "Ordinary same-value rerenders preserve editing. A genuinely changed controlled number replaces the draft; reset deliberately restores the current committed value or uncontrolled default.",
      "Native number controls may normalize or reject incomplete numeric text. Arbitrary invalid strings are not retained after commit. Existing application errors and saving/authorization policy remain caller-owned.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "Integer draft, commit and native reset",
        component: examples.NumericInputExample,
        code: '<Field label="Duration in seconds" required>\n  <NumericInput name="duration" defaultValue={30} min={5} max={3600} onValueChange={setCommittedDuration} />\n</Field>',
      },
      {
        id: "controlled",
        title: "Caller-owned committed value",
        component: examples.ControlledNumericInput,
        code: 'const [duration, setDuration] = useState(30);\n<NumericInput aria-label="Duration in seconds" value={duration} onValueChange={setDuration} min={5} max={3600} />',
      },
      {
        id: "states",
        title: "Disabled, read-only and application feedback",
        component: examples.NumericInputStates,
        code: '<fieldset disabled><legend>Unavailable</legend><NumericInput aria-label="Duration" defaultValue={30} /></fieldset>\n<Field label="Read-only duration"><NumericInput defaultValue={30} readOnly /></Field>',
      },
    ],
  },
  combobox: {
    overview:
      "Search a longer local option list and select one known value. React Aria supplies the interaction model; Little Jay supplies the input, Field integration and themed presentation. Requests, option data and selection policy stay application-owned.",
    usage:
      'import { Combobox, Field } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\nconst projects = [{ value: "atlas", label: "Atlas" }, { value: "cedar", label: "Cedar" }];\n<Field label="Choose a project">\n  <Combobox name="project" options={projects} defaultValue="cedar" />\n</Field>',
    props: [
      {
        name: "options",
        type: "readonly ComboboxOption[]",
        description:
          "Known local options with string value/label and optional disabled. The query filters labels; no remote loading, freeform creation, grouping, multiple selection or virtualization is included.",
      },
      {
        name: "value / defaultValue / onValueChange",
        type: "string | null / (value: string | null) => void",
        description:
          "Selection is an option ID, not typed search text. Use value/onValueChange for controlled selection or defaultValue for an uncontrolled initial choice. Clearing selects null; uncommitted text is not a submitted choice.",
      },
      {
        name: "Native input props, ref and Field",
        type: "ComboboxProps",
        description:
          "Ref/className/style target the editable input. Field owns its ID, messages and default disabled/required/invalid flags. Name/form submit the selected ID rather than the visible label or query.",
      },
      {
        name: "triggerLabel / clearLabel / emptyMessage",
        type: "string",
        description:
          "Names for the built-in popup and clear controls, plus local no-results text. Values and labels are rendered as text, not HTML.",
      },
      {
        name: "portalContainer",
        type: "HTMLElement | null",
        description:
          "Optional popup portal destination for scoped themes or enclosing modal containers. Document-level themes inherit normally.",
      },
    ],
    accessibility: [
      "Use Field or explicit aria-label/aria-labelledby for the input's accessible name. The input controls a named listbox, retains DOM focus and exposes the active option without adding option tab stops.",
      "Typing filters known options; arrows explore without committing, Enter selects, Escape dismisses and Tab leaves normally. Preserve native text editing, clipboard and IME composition behavior. Disabled options cannot be selected.",
      "Uncontrolled native reset restores the initial selection; controlled reset remains app-owned. Cancelled/unrelated resets must not change selection. Disabled fieldsets keep the complete control inert and omitted from FormData.",
      "Popup/empty/selected presentation is not authorization or server validation. NativeSelect remains preferable for sufficient small lists; existing Theme/Width controls are unchanged.",
    ],
    examples: [
      {
        id: "default",
        title: "Local project search and native reset",
        component: examples.ComboboxExample,
        code: '<Field label="Choose a project" required>\n  <Combobox name="project" options={projects} defaultValue="cedar" />\n</Field>',
      },
      {
        id: "controlled",
        title: "Caller-owned selection and reset",
        component: examples.ControlledCombobox,
        code: 'const [project, setProject] = useState<string | null>("atlas");\n<Combobox aria-label="Controlled project" options={projects} value={project} onValueChange={setProject} />',
      },
      {
        id: "states",
        title: "Disabled, read-only, invalid and empty",
        component: examples.ComboboxStates,
        code: '<Field label="Unavailable project" disabled><Combobox options={projects} /></Field>\n<Field label="Read-only project"><Combobox options={projects} defaultValue="atlas" readOnly /></Field>\n<Field label="Invalid project" error="Example validation"><Combobox options={projects} /></Field>\n<Field label="Empty options"><Combobox options={[]} /></Field>',
      },
    ],
  },
  "password-field": {
    overview:
      "A native password input composed from Input and a non-submit show/hide action. Only visibility is component-owned; values, validation, authentication and password policy remain application-owned.",
    usage:
      'import { Field, PasswordField } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Password">\n  <PasswordField name="password" autoComplete="current-password" />\n</Field>',
    props: [
      nativeProps,
      {
        name: "type",
        type: 'Fixed: "password" or "text" from local visibility',
        description:
          "Starts masked. The same input node, value, name and Field associations survive toggling. Native type override is not accepted.",
      },
      {
        name: "showLabel / hideLabel",
        type: 'string / "Show password" / "Hide password"',
        description:
          "Nonblank visible action labels. The changing action name and aria-controls identify the toggle; it does not combine changing text with aria-pressed.",
      },
      {
        name: "autoComplete",
        type: 'Native string; caller chooses "current-password" or "new-password"',
        description:
          "Password-manager/autofill intent is app-owned. No default, blocking of paste, logging, persistence, strength scoring or authentication request is added.",
      },
      {
        name: "ref / className / hidden",
        type: "Native input props",
        description:
          "Ref and className target the input. Hidden hides the entire composed control. Disabled defaults follow Field; disabled fieldsets keep both controls natively inert.",
      },
    ],
    accessibility: [
      "Provide a label using Field or a native label. Field labels/IDs/messages/required/invalid state belong to the input; the auxiliary button has its own action name.",
      "Tab reaches the input and enabled reveal button. Native Enter/Space on the button changes visibility without submitting. Read-only inputs may still be revealed. There is no automatic focus movement; selection is retained across type changes.",
      "An uncancelled native form reset restores uncontrolled defaults and re-masks the field. Controlled value/reset handling remains app-owned; cancelling reset preserves visibility. Explicit external form association is supported.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "Local password visibility and native reset",
        component: examples.PasswordFieldExample,
        code: '<form onSubmit={(event) => event.preventDefault()}>\n  <Field label="Example password"><PasswordField name="example-password" autoComplete="current-password" /></Field>\n  <Button type="reset">Reset local example</Button>\n</form>',
      },
      {
        id: "controlled",
        title: "Caller-owned new-password value",
        component: examples.ControlledPasswordField,
        code: 'const [password, setPassword] = useState("");\n<PasswordField aria-label="New example password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} />',
      },
      {
        id: "states",
        title: "Disabled, read-only and invalid",
        component: examples.PasswordFieldStates,
        code: '<Field label="Unavailable example password" disabled><PasswordField /></Field>\n<Field label="Read-only example password"><PasswordField readOnly /></Field>\n<Field label="Invalid example password" error="Example validation message"><PasswordField /></Field>',
      },
    ],
  },
  switch: {
    overview:
      "An on/off control with switch semantics and native checkbox behavior. State changes are local unless the application connects them to an action.",
    usage:
      'import { Field, Switch } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Enable notifications" orientation="horizontal">\n  <Switch name="notifications" defaultChecked />\n</Field>',
    props: [
      nativeProps,
      {
        name: "checked / defaultChecked",
        type: "boolean",
        description:
          "Use checked + onChange for controlled state, or defaultChecked for an uncontrolled initial state.",
      },
      {
        name: "onChange",
        type: "ChangeEventHandler<HTMLInputElement>",
        description: "Read event.currentTarget.checked for the new boolean state.",
      },
      {
        name: "value",
        type: 'string / native "on"',
        description:
          "Submitted only when checked and enabled. Type and role are fixed; native checked state supplies the accessible on/off state.",
      },
    ],
    accessibility: [
      "Space toggles the focused switch; clicking its visible label also toggles it. Keep the label stable when state changes.",
      "Unchecked and disabled switches are omitted from FormData. Native form reset restores defaultChecked for uncontrolled switches; controlled state stays application-owned.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "On / interactive",
        component: examples.SwitchExample,
        code: '<Field label="Enable notifications" orientation="horizontal"><Switch name="notifications" defaultChecked /></Field>',
      },
      {
        id: "controlled",
        title: "Caller-owned state",
        component: examples.ControlledSwitch,
        code: 'const [enabled, setEnabled] = useState(false);\n\n<Field label="Enable notifications" orientation="horizontal">\n  <Switch checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} />\n</Field>\n<p>Notifications: {enabled ? "On" : "Off"} (local example only)</p>',
      },
      {
        id: "disabled",
        title: "Disabled on and off",
        component: examples.DisabledSwitch,
        code: '<Field label="Notifications on" orientation="horizontal" disabled><Switch defaultChecked /></Field>\n<Field label="Notifications off" orientation="horizontal" disabled><Switch /></Field>',
      },
    ],
  },
  field: {
    overview:
      "Associates one native control with its label, help text, and validation error. Field owns the contained control's ID and supports vertical or horizontal layouts.",
    usage:
      'import { Field, Input } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Project name" required description="A short name">\n  <Input name="project" />\n</Field>',
    props: [
      {
        name: "label",
        type: "ReactNode / required",
        description: "Visible label associated with exactly one contained labelable control.",
      },
      {
        name: "id",
        type: "string / generated",
        description:
          "ID for the control, not the wrapper; takes precedence over a contained control ID.",
      },
      {
        name: "description, error",
        type: "ReactNode",
        description:
          "Help/error content linked with aria-describedby; an error supplies the default invalid state.",
      },
      {
        name: "required, disabled",
        type: "boolean / false",
        description:
          "Defaults supplied through per-field context; explicit control props can override them.",
      },
      {
        name: "orientation",
        type: '"vertical" (default) | "horizontal"',
        description: "Horizontal is useful for checkboxes.",
      },
    ],
    accessibility: [
      "Exactly one labelable control per Field; do not use it as a group label.",
      "Local field errors do not automatically announce assertively. Use an application-owned submission summary where needed.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "Label and help",
        component: examples.FieldExample,
        code: '<Field label="Project name" description="A short, recognizable name." required><Input defaultValue="Little Jay" /></Field>',
      },
      {
        id: "error",
        title: "Validation error",
        component: examples.InvalidField,
        code: '<Field label="Project name" error="Use at least three characters." required><Input defaultValue="Li" /></Field>',
      },
    ],
  },
  input: {
    overview:
      "A native single-line input with shared semantic styling. Keep value ownership close to the application or use native uncontrolled defaults.",
    usage:
      'import { Field, Input } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Project name"><Input name="project" /></Field>',
    props: [
      nativeProps,
      {
        name: "type",
        type: 'native input type / "text"',
        description: "Use an appropriate native type and autocomplete for the task.",
      },
      {
        name: "value / defaultValue",
        type: "native input values",
        description:
          "Use value + onChange for controlled input, or defaultValue for uncontrolled input.",
      },
    ],
    accessibility: controlAccessibility,
    examples: [
      {
        id: "default",
        title: "Default",
        component: examples.InputExample,
        code: '<Field label="Project name"><Input placeholder="Name your project" /></Field>',
      },
      {
        id: "disabled",
        title: "Disabled",
        component: examples.DisabledInput,
        code: '<Field label="Project name" disabled><Input defaultValue="Unavailable" /></Field>',
      },
    ],
  },
  textarea: {
    overview:
      "A native multiline text area. Instructions stay plain text; the component never interprets or executes them.",
    usage:
      'import { Field, Textarea } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Instructions"><Textarea name="instructions" rows={4} /></Field>',
    props: [
      nativeProps,
      {
        name: "rows, maxLength",
        type: "number",
        description: "Native sizing and input constraints.",
      },
      {
        name: "value / defaultValue",
        type: "string",
        description: "Controlled or uncontrolled text; applications own validation.",
      },
    ],
    accessibility: controlAccessibility,
    examples: [
      {
        id: "default",
        title: "Multiline",
        component: examples.TextareaExample,
        code: '<Field label="Instructions" description="Plain text only."><Textarea rows={4} defaultValue="Summarize the supplied notes." /></Field>',
      },
      {
        id: "disabled",
        title: "Disabled",
        component: examples.DisabledTextarea,
        code: '<Field label="Instructions" disabled><Textarea rows={4} defaultValue="Unavailable" /></Field>',
      },
    ],
  },
  "native-select": {
    overview:
      "A styled native select, retaining platform keyboard behavior and native options. Prefer it when a standard selection control meets the need.",
    usage:
      'import { Field, NativeSelect } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Mode"><NativeSelect name="mode" defaultValue="plan">\n  <option value="plan">Plan</option><option value="review">Review</option>\n</NativeSelect></Field>',
    props: [
      nativeProps,
      {
        name: "value / defaultValue",
        type: "native select values",
        description:
          "Controlled or uncontrolled selection. Multiple selection supports array defaults.",
      },
      {
        name: "children, multiple",
        type: "option nodes, boolean",
        description: "Native option composition and selection mode.",
      },
    ],
    accessibility: [
      "Native arrow-key and platform selection behavior is preserved.",
      "React Actions do not reapply a changed defaultValue to an already-mounted uncontrolled select. Control it or remount that select when restoring a submitted draft.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "Single selection",
        component: examples.SelectExample,
        code: '<Field label="Mode"><NativeSelect defaultValue="plan"><option value="plan">Plan</option><option value="review">Review</option></NativeSelect></Field>',
      },
      {
        id: "disabled",
        title: "Disabled",
        component: examples.DisabledSelect,
        code: '<Field label="Mode" disabled><NativeSelect defaultValue="plan"><option value="plan">Plan</option></NativeSelect></Field>',
      },
    ],
  },
  checkbox: {
    overview:
      "A native checkbox for an independent boolean choice. Pair it with a horizontal Field and make the meaning of checked clear.",
    usage:
      'import { Field, Checkbox } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Field label="Require review" orientation="horizontal">\n  <Checkbox name="review" value="yes" defaultChecked />\n</Field>',
    props: [
      nativeProps,
      {
        name: "checked / defaultChecked",
        type: "boolean",
        description: "Controlled or uncontrolled checked state.",
      },
      {
        name: "value",
        type: 'string / native "on"',
        description: "Submitted only when checked. The input type is fixed to checkbox.",
      },
    ],
    accessibility: [
      "Space toggles an enabled checkbox. The visible label is clickable.",
      "Unchecked checkboxes are omitted from FormData; interpret that absence in the application.",
      ...controlAccessibility,
    ],
    examples: [
      {
        id: "default",
        title: "Checked / interactive",
        component: examples.CheckboxExample,
        code: '<Field label="Require review" orientation="horizontal"><Checkbox defaultChecked /></Field>',
      },
      {
        id: "disabled",
        title: "Disabled",
        component: examples.DisabledCheckbox,
        code: '<Field label="Require review" orientation="horizontal" disabled><Checkbox defaultChecked /></Field>',
      },
    ],
  },
};

export default function FormsPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
