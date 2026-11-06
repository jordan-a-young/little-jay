import type { ComponentProps, ReactNode } from "react";

export type DisclosureProps = Omit<ComponentProps<"details">, "children"> & {
  summary: ReactNode;
  children?: ReactNode;
};

/** Native disclosure; summary should contain a concise label, not interactive controls. */
export function Disclosure({ summary, children, className = "", ...props }: DisclosureProps) {
  return (
    <details className={`lj-disclosure ${className}`} {...props}>
      <summary>{summary}</summary>
      <div className="lj-disclosure-body">{children}</div>
    </details>
  );
}
