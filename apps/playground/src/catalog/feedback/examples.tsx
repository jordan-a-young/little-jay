import { useRef, useState } from "react";
import {
  Alert,
  Button,
  EmptyState,
  ErrorBoundary,
  LoadingIndicator,
  PebbleState,
  StatusIndicator,
} from "@littlejay/ui";

export function LoadingIndicatorExamples() {
  return (
    <div className="space-y-5">
      <p>Presentational previews only. No request is running.</p>
      <div className="flex flex-wrap items-center gap-5">
        <LoadingIndicator />
        <LoadingIndicator label="Loading preview…" />
      </div>
    </div>
  );
}

export function LocalLoadingExample() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-5">
      <p>Toggle simulated activity. No request or timer is running.</p>
      <Button onClick={() => setLoading((active) => !active)}>
        {loading ? "Stop local loading" : "Start local loading"}
      </Button>
      <div role="status">
        {loading ? <LoadingIndicator label="Loading local preview…" /> : "Local preview is idle."}
      </div>
    </div>
  );
}

export function InformationAlert() {
  return (
    <Alert role="note" title="Viewing a cached snapshot">
      This static example is disconnected. Saved checkpoint data is not a live execution status.
    </Alert>
  );
}
export function ErrorAlert() {
  return (
    <Alert role="note" tone="danger" title="Connection lost">
      The last saved checkpoint is still available. This is a static example, not a live error.
    </Alert>
  );
}

export function SuccessAlert() {
  return (
    <Alert role="note" tone="success" title="Example saved">
      This static example shows a successful result. No data was saved.
    </Alert>
  );
}

export function WarningAlert() {
  return (
    <Alert role="note" tone="warning" title="Review before continuing">
      This static example highlights a potential issue. Review your changes before continuing.
    </Alert>
  );
}

export function DismissibleAlert() {
  const [visible, setVisible] = useState(true);
  const showButton = useRef<HTMLButtonElement>(null);
  return (
    <div className="space-y-5">
      <Button ref={showButton} onClick={() => setVisible(true)}>
        Show alert
      </Button>
      {visible && (
        <Alert
          role="note"
          title="Local preview notice"
          onDismiss={() => {
            setVisible(false);
            showButton.current?.focus();
          }}
          dismissLabel="Dismiss local preview notice"
        >
          Dismissing this notice changes local state only. No data or drafts are removed.
        </Alert>
      )}
      <p role="status">{visible ? "" : "Notice dismissed. Focus returned to Show alert."}</p>
    </div>
  );
}
export function EmptyExample() {
  const [created, setCreated] = useState(false);
  return (
    <>
      <EmptyState
        title={created ? "Example ready" : "No checkpoints yet"}
        action={
          <Button disabled={created} onClick={() => setCreated(true)}>
            Create local example
          </Button>
        }
      >
        {created
          ? "Simulated only. No record was created."
          : "Sample panel: checkpoints appear after the first completed workflow step."}
      </EmptyState>
      <p role="status" className="sr-only">
        {created ? "Example ready. Simulated only. No record was created." : ""}
      </p>
    </>
  );
}
export function StatusExamples() {
  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Example workflow states">
      <StatusIndicator>Unknown</StatusIndicator>
      <StatusIndicator tone="info">Running</StatusIndicator>
      <StatusIndicator tone="success">Completed</StatusIndicator>
      <StatusIndicator tone="warning">Awaiting review</StatusIndicator>
      <StatusIndicator tone="danger">Failed</StatusIndicator>
    </div>
  );
}
function CheckpointPreview({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Intentional playground panel failure");
  return (
    <EmptyState title="No checkpoints yet">
      Sample panel: checkpoints appear after the first completed workflow step.
    </EmptyState>
  );
}
export function BoundaryExample() {
  const [broken, setBroken] = useState(false);
  return (
    <div className="space-y-5">
      <p>The catalog controls remain available when this sample inspector fails.</p>
      <Button disabled={broken} onClick={() => setBroken(true)}>
        Simulate panel error
      </Button>
      <ErrorBoundary onReset={() => setBroken(false)}>
        <CheckpointPreview broken={broken} />
      </ErrorBoundary>
    </div>
  );
}

const assetBaseUrl = `${import.meta.env.BASE_URL}branding/`;
export function LoadingPebble() {
  return (
    <PebbleState
      state="loading"
      heading="Loading your projects…"
      description="A static illustration; no request is running."
      assetBaseUrl={assetBaseUrl}
    />
  );
}
export function SuccessPebble() {
  return (
    <PebbleState state="success" heading="Your project is ready." assetBaseUrl={assetBaseUrl} />
  );
}
export function ErrorPebble() {
  return (
    <PebbleState
      state="error"
      heading="We couldn’t load your projects."
      description="Static recoverable-error presentation."
      assetBaseUrl={assetBaseUrl}
    />
  );
}
export function EmptyPebble() {
  return (
    <PebbleState
      state="empty"
      heading="No projects yet."
      description="Static empty-state presentation."
      assetBaseUrl={assetBaseUrl}
    />
  );
}
