import { useState } from "react";
import { Button, Field, NativeSelect } from "@ljay/ui";

export function InteractiveButton() {
  const [clicks, setClicks] = useState(0);
  const [disabled, setDisabled] = useState(false);
  return (
    <div className="space-y-5">
      <Field label="Button state">
        <NativeSelect
          value={String(disabled)}
          onChange={(event) => setDisabled(event.target.value === "true")}
        >
          <option value="false">Enabled</option>
          <option value="true">Disabled</option>
        </NativeSelect>
      </Field>
      <Button disabled={disabled} onClick={() => setClicks((count) => count + 1)}>
        Continue
      </Button>
      <p role="status">Clicks: {clicks}</p>
    </div>
  );
}

export function DisabledButton() {
  return <Button disabled>Unavailable</Button>;
}

export function SubmitButton() {
  const [submits, setSubmits] = useState(0);
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmits((count) => count + 1);
      }}
    >
      <Button type="submit">Submit locally</Button>
      <p role="status">Local submissions: {submits}. Nothing is saved.</p>
    </form>
  );
}
