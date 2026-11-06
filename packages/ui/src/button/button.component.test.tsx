import { act, createRef, type FormEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Button } from "./index.js";

describe("button variant interactions", () => {
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

  it.each(["primary", "secondary", "outline", "ghost", "danger"] as const)(
    "%s preserves refs, disabled behavior, and explicit form submission",
    async (variant) => {
      const ref = createRef<HTMLButtonElement>();
      const onClick = vi.fn();
      const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
      async function renderButton(disabled: boolean, type?: "submit") {
        await act(() =>
          root.render(
            <form onSubmit={onSubmit}>
              <Button variant={variant} ref={ref} disabled={disabled} type={type} onClick={onClick}>
                Continue
              </Button>
            </form>,
          ),
        );
      }
      await renderButton(false);
      expect(ref.current).toBe(container.querySelector("button"));
      ref.current!.focus();
      expect(document.activeElement).toBe(ref.current);
      await act(() => ref.current!.click());
      expect(onClick).toHaveBeenCalledOnce();
      expect(onSubmit).not.toHaveBeenCalled();

      await renderButton(true);
      await act(() => ref.current!.click());
      expect(onClick).toHaveBeenCalledOnce();
      expect(onSubmit).not.toHaveBeenCalled();

      await renderButton(false, "submit");
      await act(() => ref.current!.click());
      expect(onSubmit).toHaveBeenCalledOnce();
    },
  );
});
