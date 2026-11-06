import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { CodeBlock } from "./CodeBlock.js";

describe("catalog code presentation", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("highlights TSX without changing source text or interpreting markup", async () => {
    const source =
      'const count: number = 2;\r\n<Button disabled={false} title="Continue">\n  {count}\n</Button>\n<img src="x" onerror="danger()" />';
    await act(() => root.render(<CodeBlock code={source} label="Example code" />));
    expect(container.querySelector("code")?.textContent).toBe(source);
    await vi.waitFor(() =>
      expect(container.querySelector(".token.keyword")?.textContent).toBe("const"),
    );
    expect(container.querySelector(".token.tag")).not.toBeNull();
    expect(container.querySelector(".token.attr-name")).not.toBeNull();
    expect(container.querySelector(".token.number")).not.toBeNull();
    expect(container.querySelector("img, script")).toBeNull();
    expect(container.querySelector("pre")?.tabIndex).toBe(0);
  });

  it("supports CSS grammar for token override documentation", async () => {
    const source = ":root { --lj-primary: #2463a6; color: var(--lj-content); }";
    await act(() => root.render(<CodeBlock code={source} label="Usage code" language="css" />));
    expect(container.querySelector("code")?.textContent).toBe(source);
    await vi.waitFor(() =>
      expect(container.querySelector(".token.selector")?.textContent).toBe(":root"),
    );
    expect(container.querySelector(".token.property")).not.toBeNull();
  });

  it("keeps the copy control compact but distinctly named and copies the original source", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const source = '<Button title="A & B">Continue</Button>\n';
    await act(() => root.render(<CodeBlock code={source} label="Example code" />));
    const button = container.querySelector("button")!;
    expect(button.textContent).toBe("Copy");
    expect(button.getAttribute("aria-label")).toBe("Copy example code");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    await act(async () => button.click());
    expect(writeText).toHaveBeenCalledWith(source);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied.");
  });
});
