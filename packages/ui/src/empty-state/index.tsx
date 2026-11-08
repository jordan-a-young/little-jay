import type { ComponentProps, ReactNode } from "react";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  titleLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  action?: ReactNode;
};

function getTitleElement(titleLevel: EmptyStateProps["titleLevel"]) {
  switch (titleLevel) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    case 4:
      return "h4";
    case 5:
      return "h5";
    case 6:
      return "h6";
    default:
      return "strong";
  }
}

export function EmptyState({
  title,
  titleLevel,
  action,
  children,
  className = "",
  ...props
}: EmptyStateProps) {
  const Title = getTitleElement(titleLevel);
  return (
    <div
      {...props}
      className={`min-w-0 space-y-3 rounded-control border border-dashed border-border bg-surface p-6 text-content ${className}`}
    >
      <Title className="lj-empty-state-title block font-semibold">{title}</Title>
      {children != null && <div className="break-words text-muted">{children}</div>}
      {action != null && <div>{action}</div>}
    </div>
  );
}
