import type { ComponentProps, ReactNode } from "react";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, action, children, className = "", ...props }: EmptyStateProps) {
  return (
    <div
      {...props}
      className={`min-w-0 space-y-3 rounded-control border border-dashed border-border bg-surface p-6 text-content ${className}`}
    >
      <strong className="block font-semibold">{title}</strong>
      {children != null && <div className="break-words text-muted">{children}</div>}
      {action != null && <div>{action}</div>}
    </div>
  );
}
