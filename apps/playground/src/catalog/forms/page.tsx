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
