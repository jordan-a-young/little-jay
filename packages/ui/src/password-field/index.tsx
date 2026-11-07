import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Input, type InputProps } from "../input/index.js";
import { Button } from "../button/index.js";
import { useFieldControl } from "../field/context.js";

export type PasswordFieldProps = Omit<InputProps, "type"> & {
  showLabel?: string;
  hideLabel?: string;
};

/** A native password input with local visibility only; value and validation stay caller-owned. */
export function PasswordField({
  ref,
  showLabel = "Show password",
  hideLabel = "Hide password",
  hidden,
  form: formId,
  ...props
}: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const inputReference = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<{
    start: number;
    end: number;
    direction: "forward" | "backward" | "none";
  } | null>(null);
  const generatedId = useId();
  const field = useFieldControl(props);
  const inputId = field.id ?? `lj-password-${generatedId}`;
  useImperativeHandle(ref, () => inputReference.current!, []);

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (selection) {
      inputReference.current?.setSelectionRange(
        selection.start,
        selection.end,
        selection.direction,
      );
      pendingSelection.current = null;
    }
  }, [revealed]);

  useEffect(() => {
    const root = inputReference.current?.getRootNode();
    if (!root) return;
    let subscribed = true;
    function handleReset(event: Event) {
      if (event.target !== inputReference.current?.form) return;
      queueMicrotask(() => {
        if (subscribed && !event.defaultPrevented) {
          pendingSelection.current = null;
          setRevealed(false);
        }
      });
    }
    root.addEventListener("reset", handleReset, true);
    return () => {
      subscribed = false;
      root.removeEventListener("reset", handleReset, true);
    };
  }, []);

  if (!showLabel.trim() || !hideLabel.trim()) {
    throw new TypeError("PasswordField requires nonblank showLabel and hideLabel");
  }

  return (
    <div className="lj-password-field" hidden={hidden}>
      <Input
        {...props}
        ref={inputReference}
        form={formId}
        hidden={hidden}
        id={inputId}
        disabled={field.disabled}
        type={revealed ? "text" : "password"}
      />
      <Button
        type="button"
        variant="outline"
        className="lj-password-field-toggle"
        disabled={field.disabled}
        aria-controls={inputId}
        onClick={() => {
          const input = inputReference.current;
          if (input && input.selectionStart !== null && input.selectionEnd !== null) {
            pendingSelection.current = {
              start: input.selectionStart,
              end: input.selectionEnd,
              direction: input.selectionDirection ?? "none",
            };
          }
          setRevealed((current) => !current);
        }}
      >
        {revealed ? hideLabel : showLabel}
      </Button>
    </div>
  );
}
