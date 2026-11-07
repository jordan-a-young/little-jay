import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@littlejay/ui";
import type { CatalogExample } from "./types.js";

type ExampleTabsProps = {
  examples: readonly Pick<CatalogExample, "id" | "title">[];
  selectedId: string | undefined;
  onSelect: (exampleId: string) => void;
  children: ReactNode;
};

/** Route-controlled example tabs; inactive previews unmount rather than retaining hidden effects. */
export function ExampleTabs({ examples, selectedId, onSelect, children }: ExampleTabsProps) {
  const identifier = useId();
  const [focusedId, setFocusedId] = useState<string>();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const selected = examples.find((example) => example.id === selectedId)?.id;
  const tabStop = examples.some((example) => example.id === focusedId)
    ? focusedId
    : (selected ?? examples[0]?.id);
  const tabId = (exampleId: string) => `${identifier}-example-tab-${encodeURIComponent(exampleId)}`;
  const panelId = (exampleId: string) =>
    `${identifier}-example-panel-${encodeURIComponent(exampleId)}`;

  return (
    <>
      <div
        role="tablist"
        aria-label="Examples"
        aria-orientation="horizontal"
        className="catalog-example-tabs"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocusedId(undefined);
        }}
      >
        {examples.map((example, index) => (
          <Button
            key={example.id}
            ref={(button) => {
              if (button) buttons.current.set(example.id, button);
              else buttons.current.delete(example.id);
            }}
            type="button"
            variant="ghost"
            role="tab"
            id={tabId(example.id)}
            aria-controls={panelId(example.id)}
            aria-selected={selected === example.id}
            tabIndex={tabStop === example.id ? 0 : -1}
            className="catalog-example-tab"
            onFocus={() => setFocusedId(example.id)}
            onClick={() => {
              if (selected !== example.id) onSelect(example.id);
            }}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
              const offset = event.key === "ArrowRight" ? direction : -direction;
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? examples.length - 1
                    : (index + offset + examples.length) % examples.length;
              buttons.current.get(examples[nextIndex]!.id)?.focus();
            }}
          >
            {example.title}
          </Button>
        ))}
      </div>
      {examples.map((example) => (
        <div
          key={example.id}
          role="tabpanel"
          id={panelId(example.id)}
          aria-labelledby={tabId(example.id)}
          hidden={selected !== example.id}
          tabIndex={selected === example.id ? 0 : -1}
        >
          {selected === example.id ? children : null}
        </div>
      ))}
    </>
  );
}
