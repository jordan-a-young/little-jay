import type { ComponentProps, ReactNode } from "react";
import { feedbackToneClasses, type FeedbackTone } from "../feedback/tone.js";

export type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  title?: ReactNode;
  tone?: FeedbackTone;
  action?: ReactNode;
};

export function Alert({
  title,
  tone = "info",
  action,
  children,
  role = tone === "danger" ? "alert" : "status",
  className = "",
  ...props
}: AlertProps) {
  return (
    <div
      {...props}
      role={role}
      className={`min-w-0 space-y-2 rounded-control border border-current bg-surface p-4 ${feedbackToneClasses[tone]} ${className}`}
    >
      {title != null && <strong className="block font-semibold">{title}</strong>}
      {children != null && <div className="break-words text-content">{children}</div>}
      {action != null && <div className="pt-2">{action}</div>}
    </div>
  );
}
