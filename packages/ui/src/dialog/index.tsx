import { createContext, use, useId, useState, type ComponentProps, type ReactNode } from "react";
import { Dialog as AriaDialog, Modal, ModalOverlay } from "react-aria-components/Modal";
import { Button, type ButtonProps } from "../button/index.js";

export interface DialogProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export type DialogTriggerProps = ButtonProps;
export type DialogCloseProps = ButtonProps;
export type DialogContentProps = Omit<
  ComponentProps<"section">,
  | "title"
  | "role"
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
  | "dangerouslySetInnerHTML"
> & {
  title: string;
  description?: string;
  variant?: "dialog" | "sheet";
  portalContainer?: HTMLElement | null;
  /** Disables only the built-in Close button; other dismissal paths remain caller-owned. */
  closeDisabled?: boolean;
  /** Optional nonblank accessible name for the built-in button; visible text stays Close. */
  closeLabel?: string;
  /** Whether Escape requests dismissal. Defaults to true. */
  dismissOnEscape?: boolean;
  /** Whether a press outside the modal requests dismissal. Defaults to true. */
  dismissOnOutsidePress?: boolean;
};

type DialogState = { open: boolean; setOpen: (open: boolean) => void };
const DialogContext = createContext<DialogState | null>(null);

function useDialogState() {
  const state = use(DialogContext);
  if (!state) throw new Error("Dialog components must be rendered within Dialog");
  return state;
}

/** Modal root. Applications own controlled state and any work performed inside it. */
export function Dialog({ children, open, defaultOpen = false, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  function setOpen(nextOpen: boolean) {
    if (nextOpen === isOpen) return;
    if (open === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }
  return <DialogContext value={{ open: isOpen, setOpen }}>{children}</DialogContext>;
}

export function DialogTrigger({ onClick, ...props }: DialogTriggerProps) {
  const state = useDialogState();
  return (
    <Button
      {...props}
      aria-haspopup="dialog"
      aria-expanded={state.open}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) state.setOpen(true);
      }}
    />
  );
}

export function DialogClose({ onClick, ...props }: DialogCloseProps) {
  const state = useDialogState();
  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) state.setOpen(false);
      }}
    />
  );
}

/** Portaled modal with a required visible title, optional description, and built-in dismissal. */
export function DialogContent({
  title,
  description,
  variant = "dialog",
  portalContainer,
  closeDisabled = false,
  closeLabel,
  dismissOnEscape = true,
  dismissOnOutsidePress = true,
  children,
  className = "",
  ref,
  id,
  style,
  ...nativeProps
}: DialogContentProps) {
  const state = useDialogState();
  const titleId = useId();
  const descriptionId = useId();
  if (typeof title !== "string" || !title.trim())
    throw new TypeError("DialogContent requires a nonblank title");
  if (closeLabel !== undefined && (typeof closeLabel !== "string" || !closeLabel.trim()))
    throw new TypeError("DialogContent requires a nonblank closeLabel when supplied");
  const hasDescription = typeof description === "string" && Boolean(description.trim());
  return (
    <ModalOverlay
      isOpen={state.open}
      onOpenChange={state.setOpen}
      isDismissable={dismissOnOutsidePress}
      isKeyboardDismissDisabled={!dismissOnEscape}
      UNSTABLE_portalContainer={portalContainer ?? undefined}
      className="lj-dialog-overlay"
    >
      <Modal className="lj-dialog-modal" data-variant={variant}>
        <AriaDialog
          ref={ref}
          id={id}
          style={style}
          className={`lj-dialog-content lj-dialog-${variant} ${className}`}
          aria-labelledby={titleId}
          aria-describedby={hasDescription ? descriptionId : undefined}
          render={(dialogProps) => (
            <section
              {...nativeProps}
              {...dialogProps}
              tabIndex={nativeProps.tabIndex ?? dialogProps.tabIndex}
              onBlur={(event) => {
                nativeProps.onBlur?.(event);
                dialogProps.onBlur?.(event);
              }}
            />
          )}
        >
          <h2 id={titleId} className="lj-dialog-title">
            {title}
          </h2>
          {hasDescription && (
            <p id={descriptionId} className="lj-dialog-description">
              {description}
            </p>
          )}
          {children}
          <div className="lj-dialog-dismiss">
            <DialogClose disabled={closeDisabled} aria-label={closeLabel}>
              Close
            </DialogClose>
          </div>
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
