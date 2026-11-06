import { useState } from "react";
import { Button, Field, NativeSelect, type ButtonVariant } from "@ljay/ui";

const variants: readonly ButtonVariant[] = ["primary", "secondary", "outline", "ghost", "danger"];

export function ButtonVariants() {
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Enabled button variants" className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <Button
            key={variant}
            variant={variant}
            onClick={() => setMessage(`${variant} activated. Local demonstration only.`)}
          >
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
      <div role="group" aria-label="Disabled button variants" className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} disabled>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
      <p role="status">{message}</p>
    </div>
  );
}

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
