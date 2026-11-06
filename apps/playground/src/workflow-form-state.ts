export interface WorkflowDraft {
  name: string;
  prompt: string;
  mode: string;
  requireReview: boolean;
}

export interface WorkflowFormState {
  draft: WorkflowDraft;
  errors: Partial<Record<"name" | "prompt" | "mode", string>>;
  status: "idle" | "invalid" | "valid";
}

export const initialWorkflowFormState: WorkflowFormState = {
  draft: {
    name: "Draft workflow",
    prompt: "Summarize the supplied notes without running any tools.",
    mode: "plan",
    requireReview: false,
  },
  errors: {},
  status: "idle",
};

/** Validates only this local demo; it does not create, save, or execute a workflow. */
export function validateWorkflowForm(data: FormData): WorkflowFormState {
  const text = (name: string) => {
    const value = data.get(name);
    return typeof value === "string" ? value : "";
  };
  const draft: WorkflowDraft = {
    name: text("name"),
    prompt: text("prompt"),
    mode: text("mode"),
    requireReview: data.get("requireReview") === "yes",
  };
  const errors: WorkflowFormState["errors"] = {};
  if (draft.name.trim().length < 3 || draft.name.length > 80)
    errors.name = "Use a name with 3–80 characters.";
  if (draft.prompt.trim().length < 10 || draft.prompt.length > 2000)
    errors.prompt = "Describe the task using 10–2000 characters.";
  if (draft.mode !== "plan" && draft.mode !== "review") errors.mode = "Choose Plan or Review.";
  return { draft, errors, status: Object.keys(errors).length ? "invalid" : "valid" };
}
