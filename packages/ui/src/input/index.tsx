import type { ComponentProps } from "react";
import { useFieldControl } from "../field/context.js";
import { formControlClasses } from "../form-control/styles.js";

export type InputProps = ComponentProps<"input">;

export function Input({ className = "", type = "text", ...props }: InputProps) {
  const fieldProps = useFieldControl(props);
  return (
    <input
      {...props}
      {...fieldProps}
      type={type}
      className={`${formControlClasses} ${className}`}
    />
  );
}
