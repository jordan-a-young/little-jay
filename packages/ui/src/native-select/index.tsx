import type { ComponentProps } from "react";
import { useFieldControl } from "../field/context.js";
import { formControlClasses } from "../form-control/styles.js";

export type NativeSelectProps = ComponentProps<"select">;

export function NativeSelect({ className = "", ...props }: NativeSelectProps) {
  const fieldProps = useFieldControl(props);
  const indicatorClass =
    !props.multiple && !(props.size && props.size > 1) ? "lj-select-indicator pe-11" : "";
  return (
    <select
      {...props}
      {...fieldProps}
      className={`${formControlClasses} ${indicatorClass} ${className}`}
    />
  );
}
