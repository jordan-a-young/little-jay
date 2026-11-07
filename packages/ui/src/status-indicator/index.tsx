import type { ComponentProps, ReactNode } from "react";
import { feedbackToneClasses, type FeedbackTone } from "../feedback/tone.js";

export type StatusIndicatorProps = ComponentProps<"span"> & {
  children: ReactNode;
  tone?: FeedbackTone;
};

export function StatusIndicator({
  tone = "neutral",
  children,
  className = "",
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      {...props}
      className={`lj-status-indicator max-w-full items-center gap-2 break-words rounded-control border border-current bg-surface px-3 py-1 text-sm font-medium ${feedbackToneClasses[tone]} ${className}`}
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
