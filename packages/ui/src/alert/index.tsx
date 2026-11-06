import type { ComponentProps, ReactNode } from "react";
import { feedbackToneClasses, type FeedbackTone } from "../feedback/tone.js";
import { IconButton } from "../icon-button/index.js";

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  title?: ReactNode;
  tone?: FeedbackTone;
  action?: ReactNode;
  /** Adds a dismissal request control; the application owns visibility and focus restoration. */
  onDismiss?: () => void;
  /** Accessible close-control name; must be nonblank when dismissal is enabled. */
  dismissLabel?: string;
};

export function Alert({
  title,
  tone = "info",
  action,
  onDismiss,
  dismissLabel = "Dismiss alert",
  children,
  role = tone === "danger" ? "alert" : "status",
  className = "",
  ...props
}: AlertProps) {
  const content = (
    <>
      {title != null && <strong className="block font-semibold">{title}</strong>}
      {children != null && <div className="break-words text-content">{children}</div>}
      {action != null && <div className="pt-2">{action}</div>}
    </>
  );
  return (
    <div
      {...props}
      role={role}
      className={`min-w-0 space-y-2 rounded-control border border-current bg-surface p-4 ${feedbackToneClasses[tone]} ${className}`}
    >
      {onDismiss ? (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">{content}</div>
          <IconButton label={dismissLabel} variant="ghost" onClick={() => onDismiss()}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="m4 4 8 8m0-8-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </IconButton>
        </div>
      ) : (
        content
      )}
    </div>
  );
}
