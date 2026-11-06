import { useQuery } from "@tanstack/react-query";
import { Alert, Button } from "@littlejay/ui";
import { healthQueryOptions } from "../../health.js";
export { WorkflowForm } from "../../WorkflowForm.js";

export function ApiConnectionExample() {
  const health = useQuery(healthQueryOptions);
  return (
    <div className="space-y-5">
      <Button disabled={health.isFetching || health.isPaused} onClick={() => void health.refetch()}>
        {health.isPaused
          ? "Waiting for connection…"
          : health.isFetching
            ? "Checking…"
            : "Refresh API"}
      </Button>
      <Alert
        title="API connection"
        tone={health.isPaused ? "warning" : health.isError ? "danger" : "info"}
      >
        {health.isPaused
          ? health.data
            ? "API check paused while offline; the last successful result is cached."
            : "API check paused while offline; no successful result yet."
          : health.isPending
            ? "Checking API…"
            : health.isError
              ? "Unable to reach the API"
              : "API is healthy"}
      </Alert>
      <Button disabled>Disabled</Button>
    </div>
  );
}
