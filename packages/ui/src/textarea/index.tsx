import type { ComponentProps } from "react";
import { useFieldControl } from "../field/context.js";
import { formControlClasses } from "../form-control/styles.js";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className = "", rows = 3, ...props }: TextareaProps) {
  const fieldProps = useFieldControl(props);
  return (
    <textarea
      {...props}
      {...fieldProps}
      rows={rows}
      className={`${formControlClasses} resize-y ${className}`}
    />
  );
}
