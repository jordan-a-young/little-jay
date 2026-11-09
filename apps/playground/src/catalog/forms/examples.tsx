import { useState } from "react";
import {
  Button,
  Checkbox,
  Combobox,
  Field,
  Input,
  NativeSelect,
  NumericInput,
  PasswordField,
  Switch,
  Textarea,
} from "@littlejay/ui";

const projectOptions = [
  { value: "atlas", label: "Atlas" },
  { value: "beacon", label: "Beacon" },
  { value: "cedar", label: "Cedar" },
  { value: "delta", label: "Delta" },
  { value: "ember", label: "Ember" },
  { value: "forest", label: "Forest" },
  { value: "grove", label: "Grove" },
  { value: "harbor", label: "Harbor (unavailable)", disabled: true },
  { value: "iris", label: "Iris" },
  { value: "juniper", label: "Juniper" },
  { value: "kite", label: "Kite" },
  {
    value: "long",
    label: "A deliberately long fictional project name that wraps without widening the page",
  },
];

export function NumericInputExample() {
  const [committed, setCommitted] = useState(30);
  const [submitted, setSubmitted] = useState<string>();
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(String(new FormData(event.currentTarget).get("duration") ?? ""));
      }}
      onReset={() => {
        setCommitted(30);
        setSubmitted(undefined);
      }}
    >
      <Field
        label="Slideshow duration in seconds"
        description="Local integer example: 5–3600 seconds. Blur or press Enter to commit; invalid entries restore the previous value."
        required
      >
        <NumericInput
          name="duration"
          defaultValue={30}
          min={5}
          max={3600}
          step={1}
          onValueChange={setCommitted}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Inspect local duration</Button>
        <Button type="reset">Reset local duration</Button>
      </div>
      <p role="status">Committed duration: {committed} seconds. Nothing is saved or sent.</p>
      <p>
        {submitted === undefined ? "No local submission yet." : `Submitted duration: ${submitted}`}
      </p>
    </form>
  );
}

export function ControlledNumericInput() {
  const [duration, setDuration] = useState(30);
  const [renders, setRenders] = useState(0);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => event.preventDefault()}
      onReset={() => setDuration(30)}
    >
      <Field
        label="Controlled duration in seconds"
        description="The app owns the committed number. Press F2 while editing to rerender without changing that number."
      >
        <NumericInput
          name="controlled-duration"
          value={duration}
          onValueChange={setDuration}
          min={5}
          max={3600}
          onKeyDown={(event) => {
            if (event.key === "F2") {
              event.preventDefault();
              setRenders((count) => count + 1);
            }
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDuration(90)}>Set 90 seconds externally</Button>
        <Button type="reset">Reset controlled duration</Button>
      </div>
      <p role="status">
        Committed duration: {duration} seconds. Unrelated renders: {renders}.
      </p>
    </form>
  );
}

export function NumericInputStates() {
  return (
    <div className="grid gap-4">
      <fieldset disabled>
        <legend>Disabled native fieldset</legend>
        <Field label="Unavailable duration">
          <NumericInput name="unavailable-duration" defaultValue={30} min={5} max={3600} />
        </Field>
      </fieldset>
      <Field label="Read-only duration">
        <NumericInput name="readonly-duration" defaultValue={30} readOnly />
      </Field>
      <Field label="Duration with application feedback" error="Example application-owned message.">
        <NumericInput defaultValue={30} min={5} max={3600} />
      </Field>
    </div>
  );
}

export function ComboboxExample() {
  const [submitted, setSubmitted] = useState<string>();
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(String(new FormData(event.currentTarget).get("project") ?? ""));
      }}
      onReset={() => setSubmitted(undefined)}
    >
      <Field
        label="Choose a project"
        description="Fictional local options only; nothing is saved or sent."
        required
      >
        <Combobox
          name="project"
          options={projectOptions}
          defaultValue="cedar"
          placeholder="Search projects"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Inspect local FormData</Button>
        <Button type="reset">Reset local choice</Button>
      </div>
      <p role="status">
        {submitted === undefined
          ? "No local submission yet."
          : `Submitted project ID: ${submitted || "(none)"}`}
      </p>
    </form>
  );
}

export function ControlledCombobox() {
  const [project, setProject] = useState<string | null>("atlas");
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => event.preventDefault()}
      onReset={() => setProject("atlas")}
    >
      <Field
        label="Controlled project"
        description="The app owns the selected ID and reset policy."
      >
        <Combobox
          name="controlled-project"
          options={projectOptions}
          value={project}
          onValueChange={setProject}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setProject("beacon")}>Select Beacon externally</Button>
        <Button type="reset">Reset controlled choice</Button>
      </div>
      <p>Selected ID: {project ?? "(none)"}</p>
    </form>
  );
}

export function ComboboxStates() {
  return (
    <div className="grid gap-4">
      <fieldset disabled>
        <legend>Disabled native fieldset</legend>
        <Field label="Unavailable project">
          <Combobox options={projectOptions} defaultValue="cedar" />
        </Field>
      </fieldset>
      <Field label="Read-only project">
        <Combobox options={projectOptions} defaultValue="atlas" readOnly />
      </Field>
      <Field label="Invalid project" error="Example validation belongs to the application.">
        <Combobox options={projectOptions} />
      </Field>
      <Field label="Empty option collection">
        <Combobox options={[]} />
      </Field>
    </div>
  );
}

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
