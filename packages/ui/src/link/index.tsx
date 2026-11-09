import type { ComponentProps } from "react";

export type LinkProps = ComponentProps<"a"> & { href: string };

export function Link({ className = "", ...props }: LinkProps) {
  return <a className={`lj-link ${className}`} {...props} />;
}
