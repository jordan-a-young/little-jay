import { describe, expect, it } from "vite-plus/test";
import { renderToStaticMarkup } from "react-dom/server";
import { Alert } from "../alert/index.js";
import { Button } from "../button/index.js";
import { EmptyState } from "../empty-state/index.js";
import { StatusIndicator } from "../status-indicator/index.js";

describe("workflow feedback", () => {
  it.each(["success", "warning"] as const)(
    "uses semantic %s styling and preserves announcement control",
    (tone) => {
      const markup = renderToStaticMarkup(
        <Alert tone={tone} title="Example notice">
          Local feedback
        </Alert>,
      );
      expect(markup).toContain(`text-${tone}`);
      expect(markup).toContain("border-current");
      expect(markup).toContain('role="status"');
      expect(markup).not.toContain(`tone="${tone}"`);
      expect(markup).not.toContain("<button");
      expect(
        renderToStaticMarkup(
          <Alert tone={tone} role="note">
            Static example
          </Alert>,
        ),
      ).toContain('role="note"');
    },
  );
  it("announces errors assertively and routine updates politely, with caller control", () => {
    expect(renderToStaticMarkup(<Alert tone="danger">Disconnected</Alert>)).toContain(
      'role="alert"',
    );
    expect(renderToStaticMarkup(<Alert>Loading checkpoints…</Alert>)).toContain('role="status"');
    expect(
      renderToStaticMarkup(
        <Alert tone="warning" role="note">
          Cached snapshot
        </Alert>,
      ),
    ).toContain('role="note"');
  });

  it("keeps status meaning and announcement policy with the application", () => {
    const markup = renderToStaticMarkup(<StatusIndicator tone="neutral">Unknown</StatusIndicator>);
    expect(markup).toContain("Unknown");
    expect(markup).not.toContain('role="status"');
    expect(markup).toContain('aria-hidden="true"');
  });

  it("renders explicit empty-state guidance without inventing loading or failure states", () => {
    const markup = renderToStaticMarkup(
      <EmptyState title="No checkpoints yet" action={<Button>Start a run</Button>}>
        Checkpoints appear after the first completed step.
      </EmptyState>,
    );
    expect(markup).toContain("No checkpoints yet");
    expect(markup).toContain("Checkpoints appear after the first completed step.");
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain('role="alert"');
  });

  it("escapes untrusted feedback and preserves native attributes, classes and zero values", () => {
    const markup = renderToStaticMarkup(
      <Alert title={0} id="workflow-error" className="project-feedback" aria-label="Workflow error">
        {"<img src=x onerror=alert(1)>"}
      </Alert>,
    );
    expect(markup).toContain("&lt;img");
    expect(markup).not.toContain("<img");
    expect(markup).toContain('id="workflow-error"');
    expect(markup).toContain('aria-label="Workflow error"');
    expect(markup).toContain("project-feedback");
    expect(markup).toContain('font-semibold">0</strong>');
  });
});
