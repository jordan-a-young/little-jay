import type { ComponentProps } from "react";
import { useFieldControl } from "../field/context.js";

export type CheckboxProps = Omit<ComponentProps<"input">, "type">;

export function Checkbox({ className = "", ...props }: CheckboxProps) {
  const fieldProps = useFieldControl(props);
  return (
    <input
      {...props}
      {...fieldProps}
      type="checkbox"
      className={`size-5 shrink-0 accent-primary [color-scheme:var(--lj-color-scheme)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger ${className}`}
    />
  );
}
