import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { Input, type InputProps } from "../input/index.js";

type NumericInputValueProps =
  | { value: number; defaultValue?: never }
  | { value?: never; defaultValue: number };

export type NumericInputProps = Omit<
  InputProps,
  "type" | "value" | "defaultValue" | "min" | "max" | "step"
> &
  NumericInputValueProps & {
    min?: number;
    max?: number;
    step?: number;
    /** Requests a changed, valid integer commit; does not report draft edits or saving. */
    onValueChange?: (value: number) => void;
    /** Cancels wheel defaults over the focused editable input, including page scrolling there. */
    disableWheelChange?: boolean;
  };

/** A native integer input retaining drafts until blur/Enter, then committing or restoring. */
export function NumericInput({
  ref,
  value,
  defaultValue,
  min,
  max,
  step = 1,
  disableWheelChange = false,
  onValueChange,
  onChange,
  onBlur,
  onKeyDown,
  ...props
}: NumericInputProps) {
  const inputReference = useRef<HTMLInputElement>(null);
  const controlled = value !== undefined;
  const initiallyControlled = useRef(controlled);
  const committedValue = useRef(value ?? defaultValue!);
  const previousValue = useRef(value);
  const requestedValue = useRef<number | null>(null);
  const resetValues = useRef({ value, defaultValue });
  useImperativeHandle(ref, () => inputReference.current!, []);

  useLayoutEffect(() => {
    resetValues.current = { value, defaultValue };
    if (value !== undefined && value !== previousValue.current) {
      committedValue.current = value;
      requestedValue.current = null;
      if (inputReference.current) inputReference.current.value = String(value);
    }
    previousValue.current = value;
  }, [value, defaultValue]);

  useEffect(() => {
    const input = inputReference.current;
    const root = input?.getRootNode();
    if (!input || !root) return;
    let subscribed = true;
    function handleReset(event: Event) {
      if (event.target !== input!.form) return;
      queueMicrotask(() => {
        if (!subscribed || event.defaultPrevented || event.target !== input!.form) return;
        const resetValue = resetValues.current.value ?? resetValues.current.defaultValue!;
        committedValue.current = resetValue;
        requestedValue.current = null;
        input!.value = String(resetValue);
      });
    }
    root.addEventListener("reset", handleReset, true);
    return () => {
      subscribed = false;
      root.removeEventListener("reset", handleReset, true);
    };
  }, []);

  useEffect(() => {
    const input = inputReference.current;
    if (!input || !disableWheelChange) return;
    function handleWheel(event: WheelEvent) {
      if (
        input!.matches(":focus") &&
        !input!.matches(":disabled") &&
        !input!.readOnly &&
        !event.ctrlKey &&
        event.deltaY !== 0
      ) {
        event.preventDefault();
      }
    }
    input.addEventListener("wheel", handleWheel, { passive: false });
    return () => input.removeEventListener("wheel", handleWheel);
  }, [disableWheelChange]);

  if (
    initiallyControlled.current !== controlled ||
    (value !== undefined && defaultValue !== undefined) ||
    !Number.isSafeInteger(value ?? defaultValue) ||
    (min !== undefined && !Number.isSafeInteger(min)) ||
    (max !== undefined && !Number.isSafeInteger(max)) ||
    !Number.isSafeInteger(step) ||
    step <= 0 ||
    (min !== undefined && max !== undefined && min > max)
  ) {
    throw new TypeError(
      "NumericInput requires a stable controlled/uncontrolled mode, a safe integer value/defaultValue, integer bounds, and a positive integer step",
    );
  }

  function commit(input: HTMLInputElement) {
    if (input.matches(":disabled") || input.readOnly) return;
    const nextValue = input.valueAsNumber;
    if (!Number.isSafeInteger(nextValue) || !input.validity.valid) {
      input.value = String(committedValue.current);
      requestedValue.current = null;
      return;
    }
    input.value = String(nextValue);
    if (nextValue === committedValue.current || nextValue === requestedValue.current) return;
    requestedValue.current = nextValue;
    if (!controlled) committedValue.current = nextValue;
    onValueChange?.(nextValue);
  }

  return (
    <Input
      {...props}
      ref={inputReference}
      type="number"
      defaultValue={value ?? defaultValue}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        requestedValue.current = null;
        onChange?.(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (!event.defaultPrevented) commit(event.currentTarget);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.key === "Enter" &&
          !event.defaultPrevented &&
          !event.nativeEvent.isComposing &&
          event.nativeEvent.keyCode !== 229
        ) {
          commit(event.currentTarget);
        }
      }}
    />
  );
}
