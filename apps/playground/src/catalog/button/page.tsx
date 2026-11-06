import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { ButtonVariants, DisabledButton, InteractiveButton, SubmitButton } from "./examples.js";

const document: CatalogDocument = {
  overview:
    "A native button for an explicit action. Choose primary, secondary, outline, ghost, or danger styling from the active color theme. Use links for navigation.",
  usage:
    'import { Button } from "@littlejay/ui/button";\nimport "@littlejay/ui/styles.css";\n\n<Button onClick={continueLocally}>Continue</Button>;',
  props: [
    {
      name: "variant",
      type: '"primary" (default) | "secondary" | "outline" | "ghost" | "danger"',
      description:
        "Theme-based visual emphasis. Danger is for destructive actions; it does not add confirmation or permissions.",
    },
    {
      name: "type",
      type: '"button" (default) | "submit" | "reset"',
      description: "Defaults to a non-submit button to avoid accidental form submission.",
    },
    {
      name: "disabled",
      type: "boolean / false",
      description: "Native disabled state; prevents activation.",
    },
    { name: "onClick", type: "native button handler", description: "Application-owned callback." },
    {
      name: "children, ref, className, …",
      type: "native button props",
      description:
        "Native attributes, React 19 ref, accessible names, and styling extensions are forwarded.",
    },
  ],
  accessibility: [
    "Keep a clear visible label; supply an accessible name for icon-only usage.",
    "Enter and Space activate enabled buttons. Disabled buttons are not keyboard-focusable.",
    "All variants use semantic theme colors and the same focus indicator. Primary stays the default; secondary is neutral, outline adds a primary-colored edge, and ghost has no resting fill or edge. Danger uses the danger color with background-colored text; recheck foreground/background contrast when overriding either token.",
    "Theme and width changes preserve preview state. Reset preview remounts only the active example.",
  ],
  examples: [
    {
      id: "default",
      title: "Default / interactive",
      component: InteractiveButton,
      code: "<Button disabled={disabled} onClick={() => setClicks((count) => count + 1)}>Continue</Button>",
    },
    {
      id: "variants",
      title: "Theme variants",
      component: ButtonVariants,
      code: '<Button>Primary</Button>\n<Button variant="secondary">Secondary</Button>\n<Button variant="outline">Outline</Button>\n<Button variant="ghost">Ghost</Button>\n<Button variant="danger">Danger</Button>\n<Button variant="danger" disabled>Unavailable</Button>',
    },
    {
      id: "disabled",
      title: "Disabled",
      component: DisabledButton,
      code: "<Button disabled>Unavailable</Button>",
    },
    {
      id: "submit",
      title: "Explicit submit",
      component: SubmitButton,
      code: '<form onSubmit={(event) => { event.preventDefault(); submitLocally(); }}>\n  <Button type="submit">Submit locally</Button>\n</form>',
    },
  ],
};

export default function ButtonPage(props: CatalogPageProps) {
  return <DocumentationPage {...props} document={document} />;
}
