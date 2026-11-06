import type { ComponentProps } from "react";
import { useFieldControl } from "../field/context.js";

export type SwitchProps = Omit<ComponentProps<"input">, "type" | "role" | "aria-checked">;

export function Switch({ className = "", ...props }: SwitchProps) {
  const fieldProps = useFieldControl(props);
  return (
    <input
      {...props}
      {...fieldProps}
      type="checkbox"
      role="switch"
      className={`lj-switch ${className}`}
    />
  );
}
