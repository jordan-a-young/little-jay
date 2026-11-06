import { useId, useMemo, type ComponentProps, type ReactNode } from "react";
import { FieldContext, type FieldContextValue } from "./context.js";

export type FieldProps = Omit<ComponentProps<"div">, "id"> & {
  /** ID of the contained control, not the wrapper. A Field owns its control's ID. */
  id?: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
};

function hasMessage(message: ReactNode) {
  return message != null && typeof message !== "boolean" && message !== "";
}

/** Associates exactly one contained labelable control with its label and optional messages. */
export function Field({
  id,
  label,
  description,
  error,
  required = false,
  disabled = false,
  orientation = "vertical",
  children,
  className = "",
  ...props
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `lj-field-${generatedId}`;
  const hasDescription = hasMessage(description);
  const invalid = hasMessage(error);
  const descriptionId = hasDescription ? `${controlId}-description` : undefined;
  const errorId = invalid ? `${controlId}-error` : undefined;
  const context = useMemo<FieldContextValue>(
    () => ({ controlId, descriptionId, errorId, invalid, required, disabled }),
    [controlId, descriptionId, errorId, invalid, required, disabled],
  );
  const fieldLabel = (
    <label htmlFor={controlId} className="block text-sm font-medium text-content">
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );
  return (
    <div {...props} className={`min-w-0 space-y-2 ${className}`}>
      <FieldContext value={context}>
        {orientation === "horizontal" ? (
          <div className="flex items-start gap-3">
            {children}
            {fieldLabel}
          </div>
        ) : (
          <>
            {fieldLabel}
            {children}
          </>
        )}
        {hasDescription && (
          <div id={descriptionId} className="break-words text-sm text-muted">
            {description}
          </div>
        )}
        {invalid && (
          <div id={errorId} className="break-words text-sm text-danger">
            {error}
          </div>
        )}
      </FieldContext>
    </div>
  );
}
