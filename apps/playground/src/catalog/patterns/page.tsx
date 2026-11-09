import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { LocalServerGuide, WorkflowForm } from "./examples.js";

const documents: Record<string, CatalogDocument> = {
  "workflow-form": {
    overview:
      "The existing local workflow configuration form, preserved as a composition pattern. React 19 Actions validate locally and retain submitted drafts. No workflow is saved or started.",
    usage:
      'import { useFormStatus } from "react-dom";\nimport { Button, LoadingIndicator } from "@littlejay/ui";\n\nfunction SubmitExample() {\n  const { pending } = useFormStatus();\n  return (\n    <Button type="submit" disabled={pending}\n      aria-label={pending ? "Validating configuration" : "Validate configuration"}>\n      <span className="workflow-submit-labels" aria-hidden="true">\n        <span data-active={!pending || undefined}>Validate configuration</span>\n        <span data-active={pending || undefined}>\n          <LoadingIndicator label="Validating…" aria-hidden="true" style={{ color: "inherit" }} />\n        </span>\n      </span>\n    </Button>\n  );\n}',
    props: [],
    accessibility: [
      "Field connects each control to its label, description, and error.",
      "Editing a validated draft marks the result outdated and clears only that field's previous error. Validate again to check the current values.",
      "The affected form exposes aria-busy during validation; a disabled fieldset prevents pending edits from being lost.",
      "SubmitExample composes the existing Button and LoadingIndicator inside the form. Its application-owned workflow-submit-labels CSS stacks both labels in one grid cell and hides only the inactive presentation, reserving both labels' width/height. Both visuals are aria-hidden; the button has one current accessible name, and the decorative indicator inherits its foreground color.",
      "One persistent polite status region outside the busy form announces pending, result and outdated-draft messages; no nested live Alert duplicates those announcements. Real live-announcement delivery still depends on the browser/assistive technology. Reduced motion uses LoadingIndicator's existing static fallback.",
      "After a submission started within the form, focus moves to the first invalid control or returns to Submit after success, unless the user has moved focus elsewhere.",
      "React Actions reset uncontrolled fields after success. This pattern returns the submitted draft and restores defaults, remounting only the uncontrolled select when needed.",
      "Validation and pending state belong to this application pattern, not to the generic UI components.",
    ],
    examples: [
      {
        id: "default",
        title: "Draft-preserving local validation",
        component: WorkflowForm,
        code: 'const [state, action, pending] = useActionState(validateExample, initialState);\n\n<form action={action} aria-busy={pending}>\n  <fieldset disabled={pending}>\n    <Field label="Workflow name" error={state.errors.name}>\n      <Input name="name" defaultValue={state.draft.name} />\n    </Field>\n    <SubmitExample />\n  </fieldset>\n</form>\n<div role="status" aria-atomic="true">\n  {pending ? <span className="sr-only">Validating configuration locally…</span> : resultMessage}\n</div>',
      },
    ],
  },
  "api-connection": {
    overview:
      "A static guide to the optional local server demo. The catalog is frontend-only: opening this page makes no API requests, starts no server and reports no connection state. The existing deep link is retained.",
    usage:
      "pnpm install --frozen-lockfile\npnpm dev\n\npnpm dev:server\ncurl http://127.0.0.1:5050/api/health\ncurl http://127.0.0.1:5050/api/example",
    props: [],
    accessibility: [
      "Commands are instructions for a local clone, not browser-executed requests or live status indicators.",
      "The catalog has no API proxy, QueryClient or backend requirement. Its local forms and preview reset remain app-owned.",
      "The optional server binds to loopback on port 5050 by default. Run its command separately; HOST and PORT configuration belong to that process.",
      "Synthetic server data does not establish external-service health. Do not place private configuration or dependency contents in responses or logs.",
    ],
    examples: [
      {
        id: "default",
        title: "Run the local server separately",
        component: LocalServerGuide,
        code: "<p>Start the catalog with <code>pnpm dev</code>.</p>\n<p>In another terminal, run <code>pnpm dev:server</code>.</p>",
      },
    ],
  },
};

export default function PatternsPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
