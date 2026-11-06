import { Checkbox, Field, Input, NativeSelect, Textarea } from "@ljay/ui";

export function FieldExample() {
  return (
    <Field label="Project name" description="A short, recognizable name." required>
      <Input defaultValue="Little Jay" />
    </Field>
  );
}
export function InvalidField() {
  return (
    <Field label="Project name" error="Use at least three characters." required>
      <Input defaultValue="Li" />
    </Field>
  );
}
export function InputExample() {
  return (
    <Field label="Project name">
      <Input placeholder="Name your project" />
    </Field>
  );
}
export function DisabledInput() {
  return (
    <Field label="Project name" disabled>
      <Input defaultValue="Unavailable" />
    </Field>
  );
}
export function TextareaExample() {
  return (
    <Field label="Instructions" description="Plain text only.">
      <Textarea rows={4} defaultValue="Summarize the supplied notes." />
    </Field>
  );
}
export function DisabledTextarea() {
  return (
    <Field label="Instructions" disabled>
      <Textarea rows={4} defaultValue="Unavailable" />
    </Field>
  );
}
export function SelectExample() {
  return (
    <Field label="Mode">
      <NativeSelect defaultValue="plan">
        <option value="plan">Plan</option>
        <option value="review">Review</option>
      </NativeSelect>
    </Field>
  );
}
export function DisabledSelect() {
  return (
    <Field label="Mode" disabled>
      <NativeSelect defaultValue="plan">
        <option value="plan">Plan</option>
      </NativeSelect>
    </Field>
  );
}
export function CheckboxExample() {
  return (
    <Field label="Require review" orientation="horizontal">
      <Checkbox defaultChecked />
    </Field>
  );
}
export function DisabledCheckbox() {
  return (
    <Field label="Require review" orientation="horizontal" disabled>
      <Checkbox defaultChecked />
    </Field>
  );
}
