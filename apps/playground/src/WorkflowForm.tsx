import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Input,
  LoadingIndicator,
  NativeSelect,
  Textarea,
} from "@littlejay/ui";
import {
  initialWorkflowFormState,
  validateWorkflowForm,
  type WorkflowFormState,
} from "./workflow-form-state.js";

async function validateExample(_previous: WorkflowFormState, data: FormData) {
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  return validateWorkflowForm(data);
}

function SubmitExample() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-label={pending ? "Validating configuration" : "Validate configuration"}
      className="max-w-full"
    >
      <span className="workflow-submit-labels" aria-hidden="true">
        <span data-active={!pending || undefined}>Validate configuration</span>
        <span data-active={pending || undefined}>
          <LoadingIndicator label="Validating…" aria-hidden="true" style={{ color: "inherit" }} />
        </span>
      </span>
    </Button>
  );
}

function WorkflowFields({
  state,
  editedFields,
}: {
  state: WorkflowFormState;
  editedFields: readonly string[];
}) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} className="min-w-0 space-y-5">
      <legend className="sr-only">Workflow configuration</legend>
      <Field
        label="Workflow name"
        description="Try a two-character name to test validation and draft preservation."
        required
        error={editedFields.includes("name") ? undefined : state.errors.name}
      >
        <Input name="name" maxLength={80} defaultValue={state.draft.name} autoComplete="off" />
      </Field>
      <Field
        label="Task instructions"
        description="Plain text only; this example never sends instructions to an agent."
        required
        error={editedFields.includes("prompt") ? undefined : state.errors.prompt}
      >
        <Textarea name="prompt" maxLength={2000} rows={4} defaultValue={state.draft.prompt} />
      </Field>
      <Field
        label="Mode"
        required
        error={editedFields.includes("mode") ? undefined : state.errors.mode}
      >
        <NativeSelect key={state.draft.mode} name="mode" defaultValue={state.draft.mode}>
          <option value="plan">Plan</option>
          <option value="review">Review</option>
        </NativeSelect>
      </Field>
      <Field
        label="Require human review"
        orientation="horizontal"
        description="This is example form data, not an execution approval."
      >
        <Checkbox name="requireReview" value="yes" defaultChecked={state.draft.requireReview} />
      </Field>
      <SubmitExample />
    </fieldset>
  );
}

export function WorkflowForm() {
  const [state, action, pending] = useActionState(validateExample, initialWorkflowFormState);
  const [edits, setEdits] = useState<{
    result: WorkflowFormState;
    fields: readonly string[];
  } | null>(null);
  const editedFields = edits?.result === state ? edits.fields : [];
  const form = useRef<HTMLFormElement>(null);
  const restoreSubmissionFocus = useRef(false);
  useEffect(() => {
    if (!restoreSubmissionFocus.current) return;
    restoreSubmissionFocus.current = false;
    const currentForm = form.current;
    if (!currentForm) return;
    if (document.activeElement !== document.body && !currentForm.contains(document.activeElement))
      return;
    const target =
      state.status === "invalid"
        ? currentForm.querySelector<HTMLElement>('[aria-invalid="true"]')
        : currentForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    target?.focus();
  }, [state]);
  return (
    <section className="space-y-5" aria-labelledby="workflow-form-title">
      <h2 id="workflow-form-title" className="text-xl font-semibold">
        Configure a workflow
      </h2>
      <p>
        React 19 Actions and native controls. Validation is local; no workflow is saved or started.
      </p>
      <form
        ref={form}
        action={action}
        aria-label="Example workflow configuration"
        aria-busy={pending}
        onSubmit={(event) => {
          restoreSubmissionFocus.current = event.currentTarget.contains(document.activeElement);
        }}
        onChange={(event) => {
          if (state.status === "idle" || pending) return;
          const control = event.target;
          if (
            !(
              control instanceof HTMLInputElement ||
              control instanceof HTMLTextAreaElement ||
              control instanceof HTMLSelectElement
            )
          )
            return;
          const name = control.name;
          setEdits((previous) => {
            const fields = previous?.result === state ? previous.fields : [];
            return fields.includes(name) ? previous : { result: state, fields: [...fields, name] };
          });
        }}
        className="space-y-5"
      >
        <WorkflowFields state={state} editedFields={editedFields} />
      </form>
      <div role="status" aria-atomic="true">
        {pending ? (
          <span className="sr-only">Validating configuration locally…</span>
        ) : (
          state.status !== "idle" &&
          (editedFields.length > 0 ? (
            <p className="text-sm text-muted">
              Configuration changed. Validate again to check the current draft.
            </p>
          ) : (
            <Alert role="note" tone={state.status === "valid" ? "success" : "danger"}>
              {state.status === "valid"
                ? "Configuration validated locally. No workflow was saved or started."
                : "Check the highlighted fields. Your draft has been preserved."}
            </Alert>
          ))
        )}
      </div>
    </section>
  );
}
