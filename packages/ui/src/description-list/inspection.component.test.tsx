import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { DescriptionList } from "./index.js";
import { Disclosure } from "../disclosure/index.js";
import { TextBlock, type TextBlockProps } from "../text-block/index.js";
import { IconButton } from "../icon-button/index.js";

describe("native inspection components", () => {
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

  it("preserves dl/dt/dd semantics, native refs, and disclosure toggling", async () => {
    const ref = createRef<HTMLDListElement>();
    await act(() =>
      root.render(
        <Disclosure summary="Metadata">
          <DescriptionList ref={ref}>
            <dt>State</dt>
            <dd>Saved</dd>
          </DescriptionList>
        </Disclosure>,
      ),
    );
    expect(ref.current?.tagName).toBe("DL");
    expect(ref.current?.querySelector("dt")?.textContent).toBe("State");
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    await act(() => container.querySelector("summary")!.click());
    expect(details.open).toBe(true);
    await act(() => container.querySelector("summary")!.click());
    expect(details.open).toBe(false);
  });

  it("renders untrusted markup as inert escaped text, including runtime HTML prop injection", async () => {
    const text =
      '<script>alert("secret")</script><img src=x onerror=alert(1)>\n' + "x".repeat(1000);
    const props = {
      text,
      dangerouslySetInnerHTML: { __html: "<b>injected</b>" },
      children: <b>injected</b>,
    } as unknown as TextBlockProps;
    await act(() => root.render(<TextBlock {...props} aria-label="Artifact output" />));
    expect(container.querySelector("pre")?.textContent).toBe(text);
    expect(container.querySelector("script, img, b")).toBeNull();
    expect(container.querySelector("pre")?.tabIndex).toBe(0);
    expect(renderToStaticMarkup(<TextBlock text={text} />)).toContain("&lt;script&gt;");
  });

  it("exposes named text output as a region without adding unnamed landmarks", async () => {
    await act(() => root.render(<TextBlock text="Output" aria-label="Artifact output" />));
    expect(container.querySelector("pre")?.getAttribute("role")).toBe("region");
    await act(() => root.render(<TextBlock text="Output" aria-labelledby="artifact-title" />));
    expect(container.querySelector("pre")?.getAttribute("role")).toBe("region");
    await act(() =>
      root.render(<TextBlock text="Output" role={undefined} aria-label="Artifact output" />),
    );
    expect(container.querySelector("pre")?.getAttribute("role")).toBe("region");
    await act(() => root.render(<TextBlock text="Output" />));
    expect(container.querySelector("pre")?.hasAttribute("role")).toBe(false);
    await act(() =>
      root.render(<TextBlock text="Output" role="note" aria-label="Artifact output" />),
    );
    expect(container.querySelector("pre")?.getAttribute("role")).toBe("note");
  });

  it("requires a nonblank icon label, hides decorative contents, forwards refs and native button behavior", async () => {
    const click = vi.fn();
    const submit = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    await act(() =>
      root.render(
        <form onSubmit={submit}>
          <IconButton ref={ref} label="Refresh preview" onClick={click}>
            <svg>
              <title>Wrong icon name</title>
            </svg>
          </IconButton>
          <IconButton label="Unavailable" disabled onClick={click}>
            x
          </IconButton>
        </form>,
      ),
    );
    expect(ref.current?.getAttribute("aria-label")).toBe("Refresh preview");
    expect(ref.current?.querySelector("span")?.getAttribute("aria-hidden")).toBe("true");
    expect(ref.current?.type).toBe("button");
    expect(ref.current?.className).toContain("focus-visible:outline-2");
    expect(ref.current?.className).toContain("enabled:cursor-pointer");
    expect(ref.current?.className).toContain("disabled:cursor-not-allowed");
    await act(() => {
      ref.current?.click();
      container.querySelector<HTMLButtonElement>("button:disabled")!.click();
    });
    expect(click).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
    expect(() => renderToStaticMarkup(<IconButton label="  ">x</IconButton>)).toThrow(
      "nonblank label",
    );
  });
});
