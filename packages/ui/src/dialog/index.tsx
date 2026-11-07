import * as Primitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { Button, type ButtonProps } from "../button/index.js";

export type DialogProps = Omit<ComponentProps<typeof Primitive.Root>, "modal">;
export type DialogTriggerProps = ButtonProps;
export type DialogCloseProps = ButtonProps;
export type DialogContentProps = Omit<
  ComponentProps<typeof Primitive.Content>,
  "title" | "asChild" | "forceMount" | "aria-label" | "aria-labelledby" | "aria-describedby"
> & {
  title: string;
  description?: string;
  variant?: "dialog" | "sheet";
  portalContainer?: HTMLElement | null;
};

/** Modal root. Applications own controlled state and any work performed inside it. */
export function Dialog(props: DialogProps) {
  return <Primitive.Root {...props} modal />;
}

export function DialogTrigger(props: DialogTriggerProps) {
  return (
    <Primitive.Trigger asChild>
      <Button {...props} />
    </Primitive.Trigger>
  );
}

export function DialogClose(props: DialogCloseProps) {
  return (
    <Primitive.Close asChild>
      <Button {...props} />
    </Primitive.Close>
  );
}

/** Portaled modal with a required visible title, optional description, and built-in dismissal. */
export function DialogContent({
  title,
  description,
  variant = "dialog",
  portalContainer,
  children,
  className = "",
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  if (typeof title !== "string" || !title.trim())
    throw new TypeError("DialogContent requires a nonblank title");
  const hasDescription = typeof description === "string" && Boolean(description.trim());
  return (
    <Primitive.Portal container={portalContainer}>
      <Primitive.Overlay className="lj-dialog-overlay" />
      <Primitive.Content
        {...props}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest('[role="combobox"][aria-expanded="true"]')
          ) {
            event.preventDefault();
          }
        }}
        className={`lj-dialog-content lj-dialog-${variant} ${className}`}
        {...(!hasDescription ? { "aria-describedby": undefined } : {})}
      >
        <Primitive.Title className="lj-dialog-title">{title}</Primitive.Title>
        {hasDescription && (
          <Primitive.Description className="lj-dialog-description">
            {description}
          </Primitive.Description>
        )}
        {children}
        <div className="lj-dialog-dismiss">
          <DialogClose>Close</DialogClose>
        </div>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
