import { Button, type ButtonProps } from "../button/index.js";

export type IconButtonProps = Omit<ButtonProps, "aria-label" | "aria-labelledby"> & {
  label: string;
};

/** A nonblank, descriptive label is required; the icon itself is decorative. */
export function IconButton({ label, children, className = "", ...props }: IconButtonProps) {
  if (typeof label !== "string" || !label.trim())
    throw new TypeError("IconButton requires a nonblank label");
  return (
    <Button
      {...props}
      aria-label={label.trim()}
      aria-labelledby={undefined}
      className={`lj-icon-button ${className}`}
    >
      <span aria-hidden="true">{children}</span>
    </Button>
  );
}
