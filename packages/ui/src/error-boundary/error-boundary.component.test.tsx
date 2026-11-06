import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ErrorBoundary } from "./index.js";

function BrokenPanel({ error = new Error("Private diagnostic") }: { error?: unknown }): ReactNode {
  throw error;
}

describe("ErrorBoundary", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container, { onCaughtError: vi.fn() });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("isolates a broken panel and reports diagnostics without exposing them in its default UI", async () => {
    const failure = new Error("Private diagnostic");
    const onError = vi.fn();
    await act(() =>
      root.render(
        <>
          <p>Workflow navigation</p>
          <ErrorBoundary onError={onError}>
            <BrokenPanel error={failure} />
          </ErrorBoundary>
        </>,
      ),
    );
    expect(container.textContent).toContain("Workflow navigation");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "This panel couldn’t be displayed.",
    );
    expect(container.textContent).not.toContain("Private diagnostic");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it("lets the application repair state before an explicit reset and preserves sibling state", async () => {
    function Example() {
      const [broken, setBroken] = useState(true);
      const [count, setCount] = useState(0);
      return (
        <>
          <button onClick={() => setCount(count + 1)}>Navigation {count}</button>
          <ErrorBoundary onReset={() => setBroken(false)}>
            {broken ? <BrokenPanel /> : <p>Panel recovered</p>}
          </ErrorBoundary>
        </>
      );
    }
    await act(() => root.render(<Example />));
    const navigation = container.querySelector("button");
    const retry = container.querySelector('[role="alert"] button');
    if (!(navigation instanceof HTMLButtonElement) || !(retry instanceof HTMLButtonElement))
      throw new Error("Expected navigation and retry controls");
    expect(retry.type).toBe("button");
    await act(() => navigation.click());
    await act(() => retry.click());
    expect(container.textContent).toContain("Navigation 1");
    expect(container.textContent).toContain("Panel recovered");
  });

  it("does not silently retry on ordinary rerenders but recovers when the selected run changes", async () => {
    const onReset = vi.fn();
    await act(() =>
      root.render(
        <ErrorBoundary resetKey="run-a" onReset={onReset}>
          <BrokenPanel />
        </ErrorBoundary>,
      ),
    );
    await act(() =>
      root.render(
        <ErrorBoundary resetKey="run-a" onReset={onReset}>
          <p>New data</p>
        </ErrorBoundary>,
      ),
    );
    expect(container.textContent).not.toContain("New data");
    expect(onReset).not.toHaveBeenCalled();
    await act(() =>
      root.render(
        <ErrorBoundary resetKey="run-b" onReset={onReset}>
          <p>Run B</p>
        </ErrorBoundary>,
      ),
    );
    expect(container.textContent).toBe("Run B");
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("handles non-Error throws and supports a render fallback", async () => {
    const onError = vi.fn();
    await act(() =>
      root.render(
        <ErrorBoundary
          onError={onError}
          fallback={({ error }) => <p>Thrown value: {String(error)}</p>}
        >
          <BrokenPanel error={null} />
        </ErrorBoundary>,
      ),
    );
    expect(container.textContent).toBe("Thrown value: null");
    expect(onError).toHaveBeenCalledWith(null, expect.anything());
  });

  it("supports a static fallback without adding retry controls", async () => {
    await act(() =>
      root.render(
        <ErrorBoundary fallback={<p>Panel unavailable</p>}>
          <BrokenPanel />
        </ErrorBoundary>,
      ),
    );
    expect(container.textContent).toBe("Panel unavailable");
    expect(container.querySelector("button")).toBeNull();
  });

  it("leaves server-rendering errors to the server rendering framework", () => {
    expect(() =>
      renderToStaticMarkup(
        <ErrorBoundary>
          <BrokenPanel />
        </ErrorBoundary>,
      ),
    ).toThrow("Private diagnostic");
  });
});
