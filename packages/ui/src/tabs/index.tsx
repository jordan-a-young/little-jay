import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";

export type TabsItem = {
  /** Stable unique nonblank identity. Labels must be meaningful, noninteractive content. */
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = Omit<
  ComponentProps<"div">,
  "children" | "defaultValue" | "dangerouslySetInnerHTML"
> & {
  /** Nonblank accessible name for the horizontal tab list. */
  label: string;
  items: readonly TabsItem[];
  value?: string;
  defaultValue?: string;
  /** Requests activation only; arrow-key focus and selection fallback emit no callback. */
  onValueChange?: (value: string) => void;
};

/** Manually activated horizontal tabs. Content mounts on first activation and stays mounted while its item remains. */
export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
  className = "",
  ...props
}: TabsProps) {
  if (typeof label !== "string" || !label.trim())
    throw new TypeError("Tabs requires a nonblank label");
  const values = new Set<string>();
  for (const item of items) {
    if (!item.value.trim() || values.has(item.value))
      throw new TypeError("Tabs requires unique nonblank item values");
    values.add(item.value);
  }
  const identifier = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const requested = value ?? uncontrolledValue;
  const enabled = items.filter((item) => !item.disabled);
  const selected = enabled.find((item) => item.value === requested)?.value ?? enabled[0]?.value;
  const [focused, setFocused] = useState<string>();
  const tabStop = enabled.some((item) => item.value === focused) ? focused : selected;
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const [visited, setVisited] = useState(() => new Set(selected ? [selected] : []));
  useEffect(() => {
    setVisited((current) => {
      const next = new Set(
        [...current].filter((entry) => items.some((item) => item.value === entry)),
      );
      if (selected) next.add(selected);
      return next.size === current.size && [...next].every((entry) => current.has(entry))
        ? current
        : next;
    });
  }, [items, selected]);
  const activate = (next: string) => {
    if (next === selected) return;
    if (value === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
  };
  return (
    <div {...props} className={`lj-tabs ${className}`}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className="lj-tabs-list"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined);
        }}
      >
        {items.map((item) => (
          <button
            key={item.value}
            ref={(element) => {
              if (element) buttons.current.set(item.value, element);
              else buttons.current.delete(item.value);
            }}
            type="button"
            role="tab"
            id={`${identifier}-tab-${encodeURIComponent(item.value)}`}
            aria-controls={`${identifier}-panel-${encodeURIComponent(item.value)}`}
            aria-selected={selected === item.value}
            disabled={item.disabled}
            tabIndex={tabStop === item.value ? 0 : -1}
            className="lj-tabs-trigger"
            onFocus={() => setFocused(item.value)}
            onClick={() => activate(item.value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const index = enabled.findIndex((entry) => entry.value === item.value);
              const direction = getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
              const offset = event.key === "ArrowRight" ? direction : -direction;
              const nextIndex =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? enabled.length - 1
                    : (index + offset + enabled.length) % enabled.length;
              const next = enabled[nextIndex];
              if (next) buttons.current.get(next.value)?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${identifier}-panel-${encodeURIComponent(item.value)}`}
          aria-labelledby={`${identifier}-tab-${encodeURIComponent(item.value)}`}
          hidden={selected !== item.value}
          tabIndex={0}
          className="lj-tabs-panel"
        >
          {selected === item.value || visited.has(item.value) ? item.content : null}
        </div>
      ))}
    </div>
  );
}
