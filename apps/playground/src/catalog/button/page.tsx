import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { DisabledButton, InteractiveButton, SubmitButton } from "./examples.js";

const document: CatalogDocument = {
  overview:
    "A native button for an explicit action. Use links for navigation. The preview controls demonstrate enabled and disabled behavior without changing the library API.",
  usage:
    'import { Button } from "@ljay/ui/button";\nimport "@ljay/ui/styles.css";\n\n<Button onClick={continueLocally}>Continue</Button>;',
  props: [
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
