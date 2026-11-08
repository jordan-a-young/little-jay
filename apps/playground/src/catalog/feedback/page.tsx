import { PebbleStateShowcase } from "../../PebbleStateShowcase.js";
import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import * as examples from "./examples.js";

const commonProps = {
  name: "Native div props, ref, className",
  type: "native div attributes",
  description: "Applications may supply labels, ARIA policy, and styling extensions.",
};
const documents: Record<string, CatalogDocument> = {
  "loading-indicator": {
    overview:
      "Compact indeterminate activity with optional visible text. The application owns loading state, busy regions, and announcements. Motion stops when reduced motion is preferred.",
    usage:
      'import { LoadingIndicator } from "@littlejay/ui/loading-indicator";\nimport "@littlejay/ui/styles.css";\n\n<LoadingIndicator />\n<LoadingIndicator label="Checking…" />',
    props: [
      {
        name: "label",
        type: "string / optional",
        description:
          'Optional visible text. Omitted or blank labels show only the spinner visually and retain hidden "Loading" text for accessibility.',
      },
      {
        name: "Native span props, ref, className",
        type: 'ComponentProps<"span"> (without children or dangerouslySetInnerHTML)',
        description:
          "Application-owned role, ARIA attributes, ref, and styling. Size follows font size and color uses the primary theme token; override with application CSS if needed.",
      },
    ],
    accessibility: [
      'The spinner is decorative; the visible label or hidden "Loading" text conveys activity. No live role, aria-busy, focus change, or disabling behavior is added automatically.',
      'Use a single app-owned role="status" region for an announced state change, as in the local example. If nearby accessible text already conveys loading, set aria-hidden="true" on a redundant indicator.',
      "Reduced motion disables rotation without hiding the indicator or text. This is indeterminate activity, not measured progress; do not invent percentages or show active loading when a request is paused offline.",
    ],
    examples: [
      {
        id: "default",
        title: "With and without visible text",
        component: examples.LoadingIndicatorExamples,
        code: '<LoadingIndicator />\n<LoadingIndicator label="Loading preview…" />',
      },
      {
        id: "local",
        title: "Caller-owned local activity",
        component: examples.LocalLoadingExample,
        code: 'const [loading, setLoading] = useState(false);\n\n<Button onClick={() => setLoading(active => !active)}>Toggle local loading</Button>\n<div role="status">\n  {loading ? <LoadingIndicator label="Loading local preview…" /> : "Local preview is idle."}\n</div>',
      },
    ],
  },
  alert: {
    overview:
      "Feedback with a semantic tone, optional title/action, and opt-in dismissal. The application owns the message and visibility. Static catalog examples explicitly use role=note rather than announcing on mount.",
    usage:
      'import { Alert, Button } from "@littlejay/ui";\nimport "@littlejay/ui/styles.css";\n\n<Alert tone="danger" title="Connection lost" action={<Button onClick={reload}>Reload</Button>}>\n  Your last saved checkpoint is available.\n</Alert>',
    props: [
      commonProps,
      {
        name: "tone",
        type: "neutral | info (default) | success | warning | danger",
        description:
          "Semantic text and border tone. Success confirms a completed action; warning highlights a potential issue. Both follow the active color theme.",
      },
      {
        name: "title, children, action",
        type: "ReactNode",
        description: "Application-owned content and optional action.",
      },
      {
        name: "onDismiss",
        type: "(() => void) | undefined",
        description:
          "Opt in to a non-submit close control. Called once per activation with no arguments; does not hide the Alert. The application owns removal and focus restoration.",
      },
      {
        name: "dismissLabel",
        type: 'string / "Dismiss alert"',
        description:
          "Accessible name of the close control. Provide a nonblank label, especially when several alerts are present. Ignored without onDismiss; blank labels throw when dismissal is enabled.",
      },
      {
        name: "role",
        type: 'danger: "alert"; otherwise: "status"',
        description:
          'Override with "note" for initial static documentation; choose announcement urgency deliberately.',
      },
    ],
    accessibility: [
      "Default roles are live feedback roles. Do not use them indiscriminately for initial static examples.",
      "Communicate state in text, never through color alone.",
      "Preserve existing data and drafts when showing a recoverable network failure.",
      "Alerts remain non-dismissible unless onDismiss is supplied. Close uses a native button: Tab focuses it, and Enter/Space requests dismissal without submitting a surrounding form. No Escape shortcut is added.",
      "The Alert does not manage focus or visibility. When removing focused content, the application must move focus to a meaningful surviving control; do not move focus if it is elsewhere. The local dismissal example returns focus to Show alert.",
    ],
    examples: [
      {
        id: "default",
        title: "Informational / static",
        component: examples.InformationAlert,
        code: '<Alert role="note" title="Viewing a cached snapshot">Saved data is not a live execution status.</Alert>',
      },
      {
        id: "error",
        title: "Error / static",
        component: examples.ErrorAlert,
        code: '<Alert role="note" tone="danger" title="Connection lost">The last saved checkpoint is still available.</Alert>',
      },
      {
        id: "dismissible",
        title: "Dismissible / caller-owned",
        component: examples.DismissibleAlert,
        code: 'const [visible, setVisible] = useState(true);\nconst showButton = useRef<HTMLButtonElement>(null);\n\n<Button ref={showButton} onClick={() => setVisible(true)}>Show alert</Button>\n{visible && (\n  <Alert role="note" title="Local preview notice"\n    dismissLabel="Dismiss local preview notice"\n    onDismiss={() => {\n      setVisible(false);\n      showButton.current?.focus();\n    }}>\n    Local notice only. No data or drafts are removed.\n  </Alert>\n)}',
      },
      {
        id: "success",
        title: "Success / static",
        component: examples.SuccessAlert,
        code: '<Alert role="note" tone="success" title="Example saved">This static example shows a successful result. No data was saved.</Alert>',
      },
      {
        id: "warning",
        title: "Warning / static",
        component: examples.WarningAlert,
        code: '<Alert role="note" tone="warning" title="Review before continuing">This static example highlights a potential issue. Review your changes before continuing.</Alert>',
      },
    ],
  },
  "empty-state": {
    overview:
      "A compact text-first empty panel with an optional action. Use PebbleState when a larger decorative illustration helps; retain meaningful visible copy in either case.",
    usage:
      'import { EmptyState } from "@littlejay/ui/empty-state";\nimport "@littlejay/ui/styles.css";\n\n<EmptyState title="No checkpoints yet">Start a run to create its first checkpoint.</EmptyState>',
    props: [
      commonProps,
      { name: "title", type: "ReactNode / required", description: "Visible state label." },
      {
        name: "titleLevel",
        type: "1 | 2 | 3 | 4 | 5 | 6 / optional",
        description:
          "Renders the title as the corresponding native heading. Omit for the existing strong title. All levels share the same component presentation; unsupported JavaScript values fall back to strong.",
      },
      {
        name: "children, action",
        type: "ReactNode",
        description: "Supporting copy and an optional application-owned action.",
      },
    ],
    accessibility: [
      "No implicit announcement role is added.",
      "Choose titleLevel to fit the surrounding heading hierarchy; it is not inferred. Supply text or inline title content, not a nested heading. Heading semantics do not choose a typography size.",
      "Actions should describe what happens next. This example changes local state only.",
    ],
    examples: [
      {
        id: "default",
        title: "Empty / local action",
        component: examples.EmptyExample,
        code: '<EmptyState title={created ? "Example ready" : "No checkpoints yet"} action={<Button onClick={createLocally}>Create local example</Button>}>\n  No real record is created.\n</EmptyState>',
      },
      {
        id: "heading",
        title: "Native heading / static",
        component: examples.EmptyHeadingExample,
        code: '<EmptyState title="No checkpoints yet" titleLevel={2}>\n  Choose a heading level that fits the surrounding page hierarchy.\n</EmptyState>',
      },
    ],
  },
  "status-indicator": {
    overview:
      "A small text-and-tone status label for lists and inspectors. Applications select the words and tone; the UI does not infer domain states or approval policy.",
    usage:
      'import { StatusIndicator } from "@littlejay/ui/status-indicator";\nimport "@littlejay/ui/styles.css";\n\n<StatusIndicator tone="warning">Awaiting review</StatusIndicator>',
    props: [
      {
        name: "tone",
        type: "neutral (default) | info | success | warning | danger",
        description: "Semantic visual emphasis.",
      },
      {
        name: "children",
        type: "ReactNode",
        description: "Visible status text; always provide it.",
      },
      {
        name: "Native span props",
        type: "native span attributes",
        description: "ARIA and ref are caller-controlled.",
      },
    ],
    accessibility: [
      "The text communicates status independently of the dot or color.",
      "Not a live region unless the caller explicitly requests one.",
    ],
    examples: [
      {
        id: "default",
        title: "All semantic tones",
        component: examples.StatusExamples,
        code: '<StatusIndicator>Unknown</StatusIndicator>\n<StatusIndicator tone="info">Running</StatusIndicator>\n<StatusIndicator tone="success">Completed</StatusIndicator>\n<StatusIndicator tone="warning">Awaiting review</StatusIndicator>\n<StatusIndicator tone="danger">Failed</StatusIndicator>',
      },
    ],
  },
  "error-boundary": {
    overview:
      "Isolates descendant rendering failures so sibling navigation and controls remain available. Expected validation and network failures usually belong in Alert rather than throwing away a working panel.",
    usage:
      'import { ErrorBoundary } from "@littlejay/ui/error-boundary";\n\n<ErrorBoundary onReset={repairLocalState} resetKey={panelId}>\n  <CheckpointInspector />\n</ErrorBoundary>',
    props: [
      { name: "children", type: "ReactNode", description: "The isolated rendering subtree." },
      {
        name: "fallback",
        type: "ReactNode | ({ error, reset }) => ReactNode",
        description: "Custom fallback; default does not expose diagnostic messages.",
      },
      {
        name: "onReset, resetKey",
        type: "callback, identity",
        description: "Repair state before reset, or reset when a stable panel identity changes.",
      },
      {
        name: "onError",
        type: "(error, info) => void",
        description: "Application-owned diagnostics; sanitize before sending anywhere.",
      },
    ],
    accessibility: [
      "The default failure panel announces an alert and offers a native retry button.",
      "Reset remounts the failed subtree. It must not replay an unapproved mutation.",
      "Does not catch ordinary event-handler failures, arbitrary async failures, server rendering, or failures in its own fallback.",
    ],
    examples: [
      {
        id: "default",
        title: "Isolated rendering failure",
        component: examples.BoundaryExample,
        code: "<Button onClick={() => setBroken(true)}>Simulate panel error</Button>\n<ErrorBoundary onReset={() => setBroken(false)}>\n  <CheckpointPreview broken={broken} />\n</ErrorBoundary>",
      },
    ],
  },
  "pebble-state": {
    overview:
      "Static, transparent illustrations for loading, success, error, and empty states. Images are lazy-loaded from canonical branding assets; applications supply copy, state, actions, and announcement policy.",
    usage:
      'import { PebbleState } from "@littlejay/ui/pebble-state";\nimport "@littlejay/ui/styles.css";\n\n<PebbleState state="empty" heading="No projects yet."\n  assetBaseUrl={`${import.meta.env.BASE_URL}branding/`} />',
    props: [
      commonProps,
      {
        name: "state",
        type: "loading | success | error | empty",
        description: "Required, application-selected state.",
      },
      {
        name: "heading",
        type: "ReactNode / required",
        description: "Visible copy communicating status.",
      },
      {
        name: "description, action",
        type: "ReactNode",
        description: "Optional supporting copy and action.",
      },
      {
        name: "assetBaseUrl",
        type: "string / required",
        description: "Branding directory URL including the actual application base.",
      },
      {
        name: "illustrationSize",
        type: "number / 160",
        description:
          "Square CSS-pixel box constrained to available width; original PNGs are 1254×1254.",
      },
    ],
    accessibility: [
      "Empty alt text prevents repeating adjacent status copy. Status never depends on the illustration alone.",
      "No automatic alert, live region, aria-busy, animation, or fake progress is added.",
      "The showcase announces only local user-triggered changes. Retry and Create project do not send requests or create records.",
    ],
    examples: [
      {
        id: "showcase",
        title: "All states / local demos",
        component: PebbleStateShowcase,
        code: '<PebbleState state={created ? "success" : "empty"}\n  heading={created ? "Your project is ready." : "No projects yet."}\n  assetBaseUrl={`${import.meta.env.BASE_URL}branding/`}\n  action={<Button onClick={() => setCreated(true)}>Create project</Button>} />',
      },
      {
        id: "loading",
        title: "Loading",
        component: examples.LoadingPebble,
        code: '<PebbleState state="loading" heading="Loading your projects…" assetBaseUrl={brandingUrl} />',
      },
      {
        id: "success",
        title: "Success",
        component: examples.SuccessPebble,
        code: '<PebbleState state="success" heading="Your project is ready." assetBaseUrl={brandingUrl} />',
      },
      {
        id: "error",
        title: "Error",
        component: examples.ErrorPebble,
        code: '<PebbleState state="error" heading="We couldn’t load your projects." assetBaseUrl={brandingUrl} />',
      },
      {
        id: "empty",
        title: "Empty",
        component: examples.EmptyPebble,
        code: '<PebbleState state="empty" heading="No projects yet." assetBaseUrl={brandingUrl} />',
      },
    ],
  },
};

export default function FeedbackPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
