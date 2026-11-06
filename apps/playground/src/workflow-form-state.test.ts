import { describe, expect, it } from "vite-plus/test";
import { validateWorkflowForm } from "./workflow-form-state.js";

describe("local workflow form example", () => {
  it("returns the exact draft on validation failure, including checkbox and select values", () => {
    const data = new FormData();
    data.set("name", "ab");
    data.set("prompt", "  Keep this unfinished prompt  ");
    data.set("mode", "review");
    data.set("requireReview", "yes");
    const result = validateWorkflowForm(data);
    expect(result.status).toBe("invalid");
    expect(result.errors.name).toBeDefined();
    expect(result.draft).toEqual({
      name: "ab",
      prompt: "  Keep this unfinished prompt  ",
      mode: "review",
      requireReview: true,
    });
  });

  it("accepts a valid local configuration and reads an omitted checkbox as unchecked", () => {
    const data = new FormData();
    data.set("name", "Example workflow");
    data.set("prompt", "Review the supplied notes.");
    data.set("mode", "plan");
    const result = validateWorkflowForm(data);
    expect(result.status).toBe("valid");
    expect(result.errors).toEqual({});
    expect(result.draft.requireReview).toBe(false);
  });

  it("rejects missing or unsupported values without asserting a successful save", () => {
    const data = new FormData();
    data.set("mode", "execute");
    const result = validateWorkflowForm(data);
    expect(result.status).toBe("invalid");
    expect(Object.keys(result.errors)).toEqual(["name", "prompt", "mode"]);
  });
});
