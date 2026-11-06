import type { ComponentProps } from "react";

export type LoadingIndicatorProps = Omit<
  ComponentProps<"span">,
  "children" | "dangerouslySetInnerHTML"
> & {
  /** Optional visible loading text. Omitted or blank labels use hidden "Loading" text. */
  label?: string;
};

/** Presentational indeterminate activity; applications own loading state and announcements. */
export function LoadingIndicator({ label, className = "", ...props }: LoadingIndicatorProps) {
  const visibleLabel = label?.trim();
  return (
    <span {...props} className={`lj-loading-indicator ${className}`}>
      <span className="lj-loading-indicator-spinner" aria-hidden="true" />
      <span
        className={visibleLabel ? "lj-loading-indicator-text" : "lj-loading-indicator-label-hidden"}
      >
        {visibleLabel || "Loading"}
      </span>
    </span>
  );
}
