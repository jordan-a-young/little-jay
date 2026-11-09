import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { LocalServerGuide } from "./examples.js";

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("explains separate local commands without a provider, backend or live status", async () => {
  await act(() => root.render(<LocalServerGuide />));
  expect(container.textContent).toContain("frontend-only");
  expect(container.textContent).toContain("pnpm dev:server");
  expect(container.textContent).toContain("curl http://127.0.0.1:5050/api/health");
  expect(container.textContent).toContain("synthetic injected dependencies");
  expect(container.textContent).not.toContain("API is healthy");
  expect(container.querySelector("button, [role=status], [role=alert]")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps instructions readable and API addresses non-interactive", async () => {
  await act(() => root.render(<LocalServerGuide />));
  expect(container.querySelectorAll("ol > li")).toHaveLength(4);
  expect(container.querySelector('a[href^="http://127.0.0.1"]')).toBeNull();
  expect(container.querySelector("a")?.getAttribute("href")).toBe(
    "https://github.com/jordan-a-young/little-jay/blob/main/docs/SERVER.md",
  );
  expect(fetch).not.toHaveBeenCalled();
});
