import type { ComponentProps } from "react";
export type ButtonProps = ComponentProps<"button">;
export function Button({ className = "", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-control bg-primary px-4 py-2 font-medium text-on-primary transition-opacity enabled:cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
