import { useState } from "react";
import { Button, PebbleState } from "@ljay/ui";

export function PebbleStateShowcase() {
  const [retried, setRetried] = useState(false);
  const [created, setCreated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const assetBaseUrl = `${import.meta.env.BASE_URL}branding/`;

  function reset() {
    setRetried(false);
    setCreated(false);
    setAnnouncement("Simulated examples reset. No real records were changed.");
  }

  return (
    <section id="pebble-states" className="space-y-5" aria-labelledby="pebble-states-title">
      <h2 id="pebble-states-title" className="text-xl font-semibold">
        Pebble app states
      </h2>
      <p>
        Static illustrations. All interactions below are simulated locally; no projects are fetched
        or created. Use the page theme controls to compare light and dark appearances.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <h3 className="font-semibold">Loading example</h3>
          <PebbleState
            state="loading"
            heading="Loading your projects…"
            description="A static loading example, not a live request or a progress estimate."
            assetBaseUrl={assetBaseUrl}
          />
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="font-semibold">Success example</h3>
          <PebbleState
            state="success"
            heading="Your project is ready."
            description="An example of a completed action."
            assetBaseUrl={assetBaseUrl}
          />
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="font-semibold">Error / Retry demo</h3>
          <PebbleState
            state={retried ? "success" : "error"}
            heading={retried ? "Your project is ready." : "We couldn’t load your projects."}
            description={
              retried
                ? "Simulated retry completed locally. No request was sent."
                : "Try a simulated retry; it only updates this example."
            }
            assetBaseUrl={assetBaseUrl}
            action={
              <Button
                disabled={retried}
                onClick={() => {
                  setRetried(true);
                  setAnnouncement("Simulated retry complete. Your project is ready.");
                }}
              >
                Retry
              </Button>
            }
          />
        </div>
        <div className="min-w-0 space-y-3">
          <h3 className="font-semibold">Empty / Create project demo</h3>
          <PebbleState
            state={created ? "success" : "empty"}
            heading={created ? "Your project is ready." : "No projects yet."}
            description={
              created
                ? "Simulated project only. No real record was created."
                : "Create a pretend project to try this example."
            }
            assetBaseUrl={assetBaseUrl}
            action={
              <Button
                disabled={created}
                onClick={() => {
                  setCreated(true);
                  setAnnouncement("Simulated project ready. No real record was created.");
                }}
              >
                Create project
              </Button>
            }
          />
        </div>
      </div>
      <Button onClick={reset}>Reset simulated examples</Button>
      <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted">
        {announcement}
      </p>
    </section>
  );
}
