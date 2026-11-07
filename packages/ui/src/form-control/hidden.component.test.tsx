import { act, type ReactNode } from "react";
import { readFile } from "node:fs/promises";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { Input } from "../input/index.js";
import { Textarea } from "../textarea/index.js";
import { NativeSelect } from "../native-select/index.js";
import { Switch } from "../switch/index.js";
import { LoadingIndicator } from "../loading-indicator/index.js";
import { IconButton } from "../icon-button/index.js";
import { StatusIndicator } from "../status-indicator/index.js";

const stylesheet = await readFile("packages/ui/src/styles.css", "utf8");
const cases: {
  name: string;
  render: (hidden: boolean) => ReactNode;
  display: string;
  className: string;
}[] = [
  {
    name: "Input",
    render: (hidden) => <Input hidden={hidden} aria-label="Optional name" defaultValue="Draft" />,
    display: "block",
    className: "lj-form-control",
  },
  {
    name: "Textarea",
    render: (hidden) => <Textarea hidden={hidden} aria-label="Optional notes" />,
    display: "block",
    className: "lj-form-control",
  },
  {
    name: "NativeSelect",
    render: (hidden) => (
      <NativeSelect hidden={hidden} aria-label="Optional mode">
        <option>Plan</option>
      </NativeSelect>
    ),
    display: "block",
    className: "lj-form-control",
  },
  {
    name: "Switch",
    render: (hidden) => <Switch hidden={hidden} aria-label="Optional notifications" />,
    display: "inline-block",
    className: "lj-switch",
  },
  {
    name: "LoadingIndicator",
    render: (hidden) => <LoadingIndicator hidden={hidden} label="Optional activity" />,
    display: "inline-flex",
    className: "lj-loading-indicator",
  },
  {
    name: "IconButton",
    render: (hidden) => (
      <IconButton hidden={hidden} label="Optional action">
        +
      </IconButton>
    ),
    display: "inline-flex",
    className: "lj-icon-button",
  },
  {
    name: "StatusIndicator",
    render: (hidden) => <StatusIndicator hidden={hidden}>Optional status</StatusIndicator>,
    display: "inline-flex",
    className: "lj-status-indicator",
  },
];

describe("native hidden display guards", () => {
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

  it.each(cases)("$name applies its default display only when shown", async (testCase) => {
    await act(() => root.render(testCase.render(true)));
    const element = container.firstElementChild as HTMLElement;
    expect(element.hidden).toBe(true);
    expect(element.classList.contains(testCase.className)).toBe(true);
    expect(element.classList.contains(testCase.display)).toBe(false);
    const displayRules = [...stylesheet.matchAll(/([^{}]+)\{([^{}]*\bdisplay\s*:[^{}]+)\}/g)]
      .filter((match) => match[1]!.trim().startsWith(`.${testCase.className}`))
      .filter((match) => !match[1]!.trim().startsWith(`.${testCase.className}-`));
    expect(displayRules.length).toBeGreaterThan(0);
    for (const [, selector] of displayRules) expect(element.matches(selector!.trim())).toBe(false);
    await act(() => root.render(testCase.render(false)));
    expect(
      displayRules.some(
        ([, selector, declarations]) =>
          element.matches(selector!.trim()) &&
          new RegExp(`\\bdisplay\\s*:\\s*${testCase.display}\\s*;`).test(declarations!),
      ),
    ).toBe(true);
    expect(container.firstElementChild).toBe(element);
    expect(element.hasAttribute("hidden")).toBe(false);
    await act(() => root.render(testCase.render(true)));
    expect(container.firstElementChild).toBe(element);
    expect(element.hidden).toBe(true);
  });
});
