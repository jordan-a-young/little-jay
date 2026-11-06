import type { ComponentProps } from "react";

export type TextBlockProps = Omit<ComponentProps<"pre">, "children" | "dangerouslySetInnerHTML"> & {
  text: string;
};

/** Renders only inert text. It does not parse HTML, Markdown, links, or executable output. */
export function TextBlock({ text, className = "", role, ...props }: TextBlockProps) {
  if (typeof text !== "string") throw new TypeError("TextBlock requires a string");
  return (
    <pre
      tabIndex={0}
      role={role ?? (props["aria-label"] || props["aria-labelledby"] ? "region" : undefined)}
      {...props}
      dangerouslySetInnerHTML={undefined}
      className={`lj-text-block ${className}`}
    >
      {text}
    </pre>
  );
}
