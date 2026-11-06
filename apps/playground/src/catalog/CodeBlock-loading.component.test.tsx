import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

describe("deferred catalog highlighting", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onCaughtError = vi.fn(() => {});
  let finishLoading: () => void;
  let failLoading: (error: Error) => void;

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const loading = new Promise<void>((resolve, reject) => {
      finishLoading = resolve;
      failLoading = reject;
    });
    vi.doMock("./HighlightedCode.js", async () => {
      await loading;
      return { default: ({ code }: { code: string }) => <span className="token">{code}</span> };
    });
    container = document.createElement("div");
    document.body.append(container);
    onCaughtError.mockClear();
    root = createRoot(container, { onCaughtError });
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.doUnmock("./HighlightedCode.js");
    vi.unstubAllGlobals();
  });

  it("keeps current plain text, focus, and Copy available while the highlighter loads", async () => {
    const { CodeBlock } = await import("./CodeBlock.js");
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const original = '<Button title="A & B">Continue</Button>\r\n';
    const updated = '<img src="x" onerror="danger()" />\n';
    await act(() => root.render(<CodeBlock code={original} label="Example code" />));
    const region = container.querySelector("pre")!;
    const copy = container.querySelector("button")!;
    expect(region.textContent).toBe(original);
    expect(container.querySelector(".token")).toBeNull();
    region.focus();

    await act(() => root.render(<CodeBlock code={updated} label="Example code" />));
    expect(region.textContent).toBe(updated);
    expect(container.querySelector("img, script")).toBeNull();
    await act(async () => copy.click());
    expect(writeText).toHaveBeenCalledWith(updated);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied.");

    await act(async () => finishLoading());
    await vi.waitFor(() => expect(container.querySelector(".token")?.textContent).toBe(updated));
    expect(container.querySelector("pre")).toBe(region);
    expect(container.querySelector("button")).toBe(copy);
    expect(document.activeElement).toBe(region);
  });

  it("preserves safe plain text and Copy when the highlighting chunk fails", async () => {
    const { CodeBlock } = await import("./CodeBlock.js");
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const source = "<script>privateDiagnostic()</script>\n";
    await act(() => root.render(<CodeBlock code={source} label="Usage code" />));
    await act(async () => failLoading(new Error("Highlighting unavailable")));
    await vi.waitFor(() => expect(onCaughtError).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector("code")?.textContent).toBe(source));
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).not.toContain("Highlighting unavailable");
    await act(async () => container.querySelector("button")!.click());
    expect(writeText).toHaveBeenCalledWith(source);

    await act(() => root.render(<CodeBlock code="updated source" label="Usage code" />));
    expect(container.querySelector("code")?.textContent).toBe("updated source");
  });
});
