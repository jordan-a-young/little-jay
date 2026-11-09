import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ButtonLink } from "./index.js";

describe("ButtonLink variants", () => {
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

  it("defaults to primary without leaking variant onto the anchor", async () => {
    await act(() => root.render(<ButtonLink href="#continue">Continue</ButtonLink>));
    const anchor = container.querySelector("a")!;
    expect(anchor.classList.contains("lj-button-link")).toBe(true);
    expect(anchor.classList.contains("lj-button-link-primary")).toBe(true);
    expect(anchor.hasAttribute("variant")).toBe(false);
  });

  it.each(["primary", "secondary", "outline", "ghost", "danger"] as const)(
    "uses semantic %s classes without button-only enabled selectors",
    async (variant) => {
      await act(() =>
        root.render(
          <ButtonLink href="#continue" variant={variant} className="consumer-link">
            Continue
          </ButtonLink>,
        ),
      );
      const anchor = container.querySelector("a")!;
      expect(anchor.className.split(/\s+/)).toEqual([
        "lj-button-link",
        `lj-button-link-${variant}`,
        "consumer-link",
      ]);
      expect(anchor.hasAttribute("variant")).toBe(false);
      expect(anchor.getAttribute("href")).toBe("#continue");
    },
  );
});
