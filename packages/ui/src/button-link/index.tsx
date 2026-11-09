import type { ComponentProps } from "react";
import type { ButtonVariant } from "../button/index.js";

export type ButtonLinkProps = ComponentProps<"a"> & {
  href: string;
  variant?: ButtonVariant;
};

export function ButtonLink({ className = "", variant = "primary", ...props }: ButtonLinkProps) {
  return <a className={`lj-button-link lj-button-link-${variant} ${className}`} {...props} />;
}
