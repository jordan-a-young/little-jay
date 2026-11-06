import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Button } from "../button/index.js";
import { PebbleState, type PebbleStateKind } from "./index.js";

describe("PebbleState", () => {
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

  it.each<PebbleStateKind>(["loading", "success", "error", "empty"])(
    "renders %s with visible text and a reserved decorative image",
    async (state) => {
      await act(() =>
        root.render(
          <PebbleState
            state={state}
            heading={`Visible ${state}`}
            description="State explained in text"
            assetBaseUrl="/little-jay/branding/"
            illustrationSize={200}
          />,
        ),
      );
      const image = container.querySelector("img")!;
      expect(image.getAttribute("src")).toBe(`/little-jay/branding/states/pebble-${state}.png`);
      expect(image.alt).toBe("");
      expect(image.width).toBe(1254);
      expect(image.height).toBe(1254);
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.style.width).toBe("200px");
      expect(image.style.maxWidth).toBe("100%");
      expect(image.style.objectFit).toBe("contain");
      expect(container.textContent).toContain(`Visible ${state}`);
      expect(container.textContent).toContain("State explained in text");
      expect(
        container.querySelector('[role="alert"], [role="status"], [aria-live], [aria-busy]'),
      ).toBeNull();
    },
  );

  it("leaves actions and announcement policy to its consumer and supports a base without a trailing slash", async () => {
    const retry = vi.fn();
    await act(() =>
      root.render(
        <PebbleState
          state="error"
          heading="Try again"
          assetBaseUrl="/branding"
          role="status"
          aria-live="polite"
          action={<Button onClick={retry}>Retry</Button>}
        />,
      ),
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "/branding/states/pebble-error.png",
    );
    expect(container.querySelector('[role="status"]')?.getAttribute("aria-live")).toBe("polite");
    const button = container.querySelector("button")!;
    expect(button.type).toBe("button");
    await act(() => button.click());
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("keeps a valid reserved box when given an invalid size", async () => {
    await act(() =>
      root.render(
        <PebbleState
          state="empty"
          heading="Nothing yet"
          assetBaseUrl="/branding/"
          illustrationSize={-10}
        />,
      ),
    );
    expect(container.querySelector("img")?.style.width).toBe("160px");
  });
});
