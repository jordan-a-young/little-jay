import { useState } from "react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  NativeSelect,
  PasswordField,
  Switch,
  Textarea,
} from "@littlejay/ui";

export function PasswordFieldExample() {
  return (
    <form onSubmit={(event) => event.preventDefault()} className="grid gap-4">
      <Field
        label="Example password"
        description="Synthetic local example. Do not enter a real password."
      >
        <PasswordField
          name="example-password"
          autoComplete="current-password"
          defaultValue="sample-only"
        />
      </Field>
      <Button type="reset">Reset local password example</Button>
    </form>
  );
}

export function ControlledPasswordField() {
  const [password, setPassword] = useState("");
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      onReset={() => setPassword("")}
      className="grid gap-4"
    >
      <Field
        label="New example password"
        description="Controlled local-only input. Nothing is saved, logged or sent."
      >
        <PasswordField
          name="new-example-password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </Field>
      <Button type="reset">Clear local password example</Button>
    </form>
  );
}

export function PasswordFieldStates() {
  return (
    <div className="grid gap-4">
      <fieldset disabled>
        <legend>Disabled native fieldset</legend>
        <Field label="Unavailable example password">
          <PasswordField
            defaultValue="sample-only"
            showLabel="Show unavailable password"
            hideLabel="Hide unavailable password"
          />
        </Field>
      </fieldset>
      <Field label="Read-only example password">
        <PasswordField
          readOnly
          defaultValue="sample-only"
          showLabel="Show read-only password"
          hideLabel="Hide read-only password"
        />
      </Field>
      <Field
        label="Invalid example password"
        error="Example validation message. Validation belongs to the application."
      >
        <PasswordField
          defaultValue="sample-only"
          showLabel="Show invalid password"
          hideLabel="Hide invalid password"
        />
      </Field>
    </div>
  );
}

export function SwitchExample() {
  return (
    <Field
      label="Enable notifications"
      orientation="horizontal"
      description="Local example only; no notifications are sent."
    >
      <Switch name="notifications" defaultChecked />
    </Field>
  );
}

export function ControlledSwitch() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div>
      <Field label="Enable notifications" orientation="horizontal">
        <Switch checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} />
      </Field>
      <p>Notifications: {enabled ? "On" : "Off"} (local example only)</p>
    </div>
  );
}

export function DisabledSwitch() {
  return (
    <div className="grid gap-4">
      <Field label="Notifications on" orientation="horizontal" disabled>
        <Switch defaultChecked />
      </Field>
      <Field label="Notifications off" orientation="horizontal" disabled>
        <Switch />
      </Field>
    </div>
  );
}

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
