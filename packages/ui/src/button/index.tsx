import type { ComponentProps } from "react";
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary",
  secondary:
    "bg-surface text-content border-0 inset-ring inset-ring-border enabled:hover:bg-background",
  outline:
    "bg-transparent text-primary border-0 inset-ring inset-ring-primary enabled:hover:bg-background",
  ghost: "bg-transparent text-primary border-0 enabled:hover:bg-background",
  danger: "bg-danger text-background border-0",
};

export function Button({
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-control px-4 py-2 font-medium transition-opacity enabled:cursor-pointer enabled:hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
