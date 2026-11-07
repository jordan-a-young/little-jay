import type { ComponentProps } from "react";

export type TableProps = ComponentProps<"table">;
export type TableHeaderProps = ComponentProps<"thead">;
export type TableBodyProps = ComponentProps<"tbody">;
export type TableFooterProps = ComponentProps<"tfoot">;
export type TableRowProps = ComponentProps<"tr">;
export type TableHeadProps = ComponentProps<"th">;
export type TableCellProps = ComponentProps<"td">;
export type TableCaptionProps = ComponentProps<"caption">;
export type TableScrollProps = Omit<ComponentProps<"div">, "role" | "tabIndex"> &
  (
    | { "aria-label": string; "aria-labelledby"?: string }
    | { "aria-label"?: string; "aria-labelledby": string }
  );

/** A native table; callers own data, header relationships and optional interactions. */
export function Table({ className = "", ...props }: TableProps) {
  return <table {...props} className={`lj-table ${className}`} />;
}

/** A native header section, containing caller-supplied rows and header cells. */
export function TableHeader({ className = "", ...props }: TableHeaderProps) {
  return <thead {...props} className={`lj-table-header ${className}`} />;
}

/** A native body section without generated rows or empty/loading content. */
export function TableBody({ className = "", ...props }: TableBodyProps) {
  return <tbody {...props} className={`lj-table-body ${className}`} />;
}

/** A native footer section for caller-supplied summary rows. */
export function TableFooter({ className = "", ...props }: TableFooterProps) {
  return <tfoot {...props} className={`lj-table-footer ${className}`} />;
}

/** A native row without selection, focus or click behavior. */
export function TableRow({ className = "", ...props }: TableRowProps) {
  return <tr {...props} className={`lj-table-row ${className}`} />;
}

/** A native header cell; defaults to column scope, with explicit row/group overrides. */
export function TableHead({ className = "", scope = "col", ...props }: TableHeadProps) {
  return <th {...props} scope={scope} className={`lj-table-head ${className}`} />;
}

/** A native data cell, preserving colspan, header associations and child controls. */
export function TableCell({ className = "", ...props }: TableCellProps) {
  return <td {...props} className={`lj-table-cell ${className}`} />;
}

/** A native visible caption; place it first inside Table to name its content. */
export function TableCaption({ className = "", ...props }: TableCaptionProps) {
  return <caption {...props} className={`lj-table-caption ${className}`} />;
}

/** An optional named, keyboard-focusable horizontal scroller, separate from table semantics. */
export function TableScroll({ className = "", ...props }: TableScrollProps) {
  if (!props["aria-label"]?.trim() && !props["aria-labelledby"]?.trim()) {
    throw new TypeError("TableScroll requires a nonblank aria-label or aria-labelledby");
  }
  return <div {...props} role="region" tabIndex={0} className={`lj-table-scroll ${className}`} />;
}
