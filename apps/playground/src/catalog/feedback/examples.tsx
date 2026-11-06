import { useState } from "react";
import { Alert, Button, EmptyState, ErrorBoundary, PebbleState, StatusIndicator } from "@ljay/ui";

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
