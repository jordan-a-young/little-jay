import { createContext, use, type AriaAttributes } from "react";

export interface FieldContextValue {
  controlId: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface FieldControlOptions {
  id?: string;
  required?: boolean;
  disabled?: boolean;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
}

export function useFieldControl(props: FieldControlOptions): FieldControlOptions {
  const field = use(FieldContext);
  const descriptionIds = [props["aria-describedby"], field?.descriptionId, field?.errorId]
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
  return {
    id: field?.controlId ?? props.id,
    required: props.required ?? field?.required,
    disabled: props.disabled ?? field?.disabled,
    "aria-invalid": props["aria-invalid"] ?? (field?.invalid || undefined),
    "aria-describedby": [...new Set(descriptionIds)].join(" ") || undefined,
  };
}
