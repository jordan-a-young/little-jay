import type { ComponentProps } from "react";

export type CardProps = ComponentProps<"div">;
export type CardHeaderProps = ComponentProps<"div">;
export type CardContentProps = ComponentProps<"div">;
export type CardFooterProps = ComponentProps<"div">;

/** A presentational surface; callers own headings, landmarks and interactive behavior. */
export function Card({ className = "", ...props }: CardProps) {
  return <div {...props} className={`lj-card ${className}`} />;
}

/** Optional padded header content; supply an explicit heading element when appropriate. */
export function CardHeader({ className = "", ...props }: CardHeaderProps) {
  return <div {...props} className={`lj-card-header ${className}`} />;
}

/** Optional padded body content without additional semantics or state. */
export function CardContent({ className = "", ...props }: CardContentProps) {
  return <div {...props} className={`lj-card-content ${className}`} />;
}

/** Optional padded, wrapping action area; actions retain their own native behavior. */
export function CardFooter({ className = "", ...props }: CardFooterProps) {
  return <div {...props} className={`lj-card-footer ${className}`} />;
}
