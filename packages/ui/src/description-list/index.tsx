import type { ComponentProps } from "react";

export type DescriptionListProps = ComponentProps<"dl">;

/** Supply native dt/dd pairs, optionally grouped in div elements. */
export function DescriptionList({ className = "", ...props }: DescriptionListProps) {
  return <dl className={`lj-description-list ${className}`} {...props} />;
}
