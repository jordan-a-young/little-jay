import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { ApiConnectionExample, WorkflowForm } from "./examples.js";

const documents: Record<string, CatalogDocument> = {
  "workflow-form": {
    overview:
      "The existing local workflow configuration form, preserved as a composition pattern. React 19 Actions validate locally and retain submitted drafts. No workflow is saved or started.",
    usage:
      'import { Field, Input, Button } from "@ljay/ui";\n\n<form action={validateLocally}>\n  <Field label="Workflow name" required>\n    <Input name="name" defaultValue={draft.name} />\n  </Field>\n  <Button type="submit">Validate configuration</Button>\n</form>',
    props: [],
    accessibility: [
      "Field connects each control to its label, description, and error.",
      "Editing a validated draft marks the result outdated and clears only that field's previous error. Validate again to check the current values.",
      "The affected form exposes aria-busy during validation; a disabled fieldset prevents pending edits from being lost.",
      "After a submission started within the form, focus moves to the first invalid control or returns to Submit after success, unless the user has moved focus elsewhere.",
      "React Actions reset uncontrolled fields after success. This pattern returns the submitted draft and restores defaults, remounting only the uncontrolled select when needed.",
      "Validation and pending state belong to this application pattern, not to the generic UI components.",
    ],
    examples: [
      {
        id: "default",
        title: "Draft-preserving local validation",
        component: WorkflowForm,
        code: 'const [state, action, pending] = useActionState(validateExample, initialState);\n\n<form action={action} aria-busy={pending}>\n  <fieldset disabled={pending}>\n    <Field label="Workflow name" error={state.errors.name}>\n      <Input name="name" defaultValue={state.draft.name} />\n    </Field>\n    <SubmitExample />\n  </fieldset>\n</form>',
      },
    ],
  },
  "api-connection": {
    overview:
      "The existing Fastify health-check demo. Only opening this pattern mounts the health query; component and foundation pages do not require the API. TanStack Query owns caching and cancellation policy.",
    usage:
      "const health = useQuery(healthQueryOptions);\n\n<Button disabled={health.isFetching || health.isPaused}\n  onClick={() => void health.refetch()}>Refresh API</Button>",
    props: [],
    accessibility: [
      "Real connection state is communicated in text. Offline cached data is not presented as a fresh health check.",
      "The query uses @ljay/http with native fetch, its abort signal, a 4 KiB response limit, a 10-second timeout, a runtime decoder, a 30-second stale window, and no automatic retries.",
      "This demo reads /api/health. The API keeps its default port 5050; development and production require a matching proxy.",
      "Reset preview resets local component state but does not erase the shared query cache. Refresh API explicitly requests fresh data.",
    ],
    examples: [
      {
        id: "default",
        title: "Live health check",
        component: ApiConnectionExample,
        code: 'const health = useQuery(healthQueryOptions);\n\n<Alert title="API connection" tone={health.isError ? "danger" : "info"}>\n  {health.isPending ? "Checking API…" : health.isError ? "Unable to reach the API" : "API is healthy"}\n</Alert>',
      },
    ],
  },
};

export default function PatternsPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
