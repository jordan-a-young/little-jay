import type { ComponentProps } from "react";

export type BreadcrumbProps = ComponentProps<"nav">;
export type BreadcrumbListProps = ComponentProps<"ol">;
export type BreadcrumbItemProps = ComponentProps<"li">;
export type BreadcrumbSeparatorProps = Omit<ComponentProps<"span">, "aria-hidden">;
export type BreadcrumbPageProps = Omit<ComponentProps<"span">, "aria-current">;

/** A named navigation landmark; supply native or router-aware ancestor links as children. */
export function Breadcrumb({
  className = "",
  "aria-label": label = "Breadcrumb",
  ...props
}: BreadcrumbProps) {
  return <nav {...props} aria-label={label} className={`lj-breadcrumb ${className}`} />;
}

/** An ordered list of ancestors and one current item, retaining list semantics without markers. */
export function BreadcrumbList({ className = "", ...props }: BreadcrumbListProps) {
  return <ol role="list" {...props} className={`lj-breadcrumb-list ${className}`} />;
}

/** A native list item; separators belong inside items rather than creating extra list entries. */
export function BreadcrumbItem({ className = "", ...props }: BreadcrumbItemProps) {
  return <li {...props} className={`lj-breadcrumb-item ${className}`} />;
}

/** A decorative, noninteractive separator; omit it from the first item. */
export function BreadcrumbSeparator({
  className = "",
  children = "/",
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <span {...props} aria-hidden="true" className={`lj-breadcrumb-separator ${className}`}>
      {children}
    </span>
  );
}

/** Plain current-location text, not a disabled link or an extra keyboard stop. */
export function BreadcrumbPage({ className = "", ...props }: BreadcrumbPageProps) {
  return <span {...props} aria-current="page" className={`lj-breadcrumb-page ${className}`} />;
}
