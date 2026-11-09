import { ButtonLink, Link, type ButtonVariant } from "@littlejay/ui";

const variants = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
] as const satisfies readonly ButtonVariant[];

export function InlineLinks() {
  return (
    <p>
      Explore <Link href="#/button">Button documentation</Link> or{" "}
      <Link href="#/field">Field documentation</Link>. These are native links to local catalog
      pages.
    </p>
  );
}

export function LongLink() {
  return (
    <p>
      <Link href="#/link/long" aria-current="page">
        {"A descriptive current documentation location with a long label. ".repeat(5)}
      </Link>
    </p>
  );
}

export function ButtonLinks() {
  return (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => (
        <ButtonLink key={variant} href="#/button/variants" variant={variant}>
          {variant} navigation
        </ButtonLink>
      ))}
    </div>
  );
}

export function LongButtonLink() {
  return (
    <ButtonLink href="#/button-link/long" variant="outline" aria-current="page">
      {"Open a documentation page with a long descriptive navigation label. ".repeat(4)}
    </ButtonLink>
  );
}
