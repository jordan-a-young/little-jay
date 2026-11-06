import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import * as examples from "./examples.js";

const documents: Record<string, CatalogDocument> = {
  "description-list": {
    overview:
      "Native metadata semantics with wrapping for long values. Applications supply dt/dd pairs; no domain schema is inferred.",
    usage:
      'import { DescriptionList } from "@ljay/ui/description-list";\nimport "@ljay/ui/styles.css";\n\n<DescriptionList><dt>State</dt><dd>Saved</dd></DescriptionList>',
    props: [
      {
        name: "Native dl props",
        type: "ComponentProps<dl>",
        description: "Children, ref, className, and native accessibility attributes.",
      },
    ],
    accessibility: [
      "Use dt for a term and dd for its description. Pairs can be grouped in a div.",
      "Do not use metadata styling as a substitute for a real table when relationships require columns.",
    ],
    examples: [
      {
        id: "default",
        title: "Metadata and long values",
        component: examples.MetadataExample,
        code: "<DescriptionList><dt>Name</dt><dd>Local preview</dd></DescriptionList>",
      },
    ],
  },
  disclosure: {
    overview:
      "Native details/summary preserves browser keyboard behavior without an interaction dependency.",
    usage:
      'import { Disclosure } from "@ljay/ui/disclosure";\n\n<Disclosure summary="Metadata">Saved draft details</Disclosure>',
    props: [
      {
        name: "summary",
        type: "ReactNode / required",
        description: "Concise visible disclosure label.",
      },
      {
        name: "Native details props",
        type: "open, onToggle, name, ref, className",
        description:
          "Uncontrolled by default; use native open/onToggle for application-owned state.",
      },
    ],
    accessibility: [
      "The summary is the native keyboard-operable disclosure control.",
      "Keep links, buttons, and other interactive elements out of the summary label.",
    ],
    examples: [
      {
        id: "default",
        title: "Collapsed metadata",
        component: examples.DisclosureExample,
        code: '<Disclosure summary="Inspect saved metadata"><Metadata /></Disclosure>',
      },
    ],
  },
  "text-block": {
    overview:
      "Escaped inert text only: no HTML, Markdown, linkification, syntax execution, or permission interpretation. Long lines wrap; tall output scrolls.",
    usage:
      'import { TextBlock } from "@ljay/ui/text-block";\n\n<TextBlock aria-label="Artifact output" text={untrustedText} />',
    props: [
      {
        name: "text",
        type: "string / required",
        description: "Rendered as a React text child. Non-string values are rejected.",
      },
      {
        name: "Native pre props",
        type: "ref, className, tabIndex, aria-*",
        description:
          "children and dangerouslySetInnerHTML are excluded; keyboard scrolling is enabled by default.",
      },
    ],
    accessibility: [
      "Give the scrollable output a descriptive aria-label or aria-labelledby. Named output defaults to a region so assistive technology can expose that name; unnamed output does not add a landmark.",
      "The default focusable region supports keyboard scrolling; a visible focus outline is provided.",
    ],
    examples: [
      {
        id: "default",
        title: "Markup stays text",
        component: examples.TextExample,
        code: '<TextBlock aria-label="Artifact output" text={\'<script>alert("inert")</script>\'} />',
      },
    ],
  },
  "icon-button": {
    overview:
      "A 44px square native Button with a required accessible name and decorative icon content. Supply a consistently sized SVG, such as 20px. The default type is button, not submit.",
    usage:
      'import { IconButton } from "@ljay/ui/icon-button";\n\n<IconButton label="Refresh preview" onClick={refresh}><RefreshIcon /></IconButton>',
    props: [
      {
        name: "label",
        type: "string / required",
        description:
          "A descriptive nonblank accessible name; blank labels throw. aria-label/aria-labelledby cannot replace it.",
      },
      {
        name: "Native Button props",
        type: "disabled, ref, onClick, type, aria-pressed, className",
        description:
          "The icon is wrapped in aria-hidden; disabled and focus behavior match Button.",
      },
    ],
    accessibility: [
      "Use an action label, such as Refresh preview, rather than an icon shape.",
      "Children must be decorative, noninteractive content. A tooltip is not required for the accessible name.",
      "Enabled controls use the pointer cursor; disabled controls are not clickable.",
    ],
    examples: [
      {
        id: "default",
        title: "Local action and disabled state",
        component: examples.IconExample,
        code: '<IconButton label="Refresh local preview" onClick={refreshLocally}><RefreshIcon /></IconButton>\n<IconButton label="Refresh unavailable" disabled><RefreshIcon /></IconButton>',
      },
    ],
  },
  dialog: {
    overview:
      "An accessible modal with a sheet layout variant, built on the focused Radix Dialog primitive. Portal, focus trapping/restoration, and Escape dismissal are primitive-owned; application actions remain application-owned.",
    usage:
      'import { Dialog, DialogTrigger, DialogContent } from "@ljay/ui/dialog";\nimport "@ljay/ui/styles.css";\n\n<Dialog>\n  <DialogTrigger>Inspect</DialogTrigger>\n  <DialogContent title="Draft preview" description="Read-only local data.">Content</DialogContent>\n</Dialog>',
    props: [
      {
        name: "Dialog",
        type: "open, defaultOpen, onOpenChange, children",
        description:
          "Always modal. Controlled state must respond to onOpenChange to accept dismissal.",
      },
      {
        name: "DialogTrigger / DialogClose",
        type: "ButtonProps",
        description: "Styled native buttons with non-submit defaults and ref support.",
      },
      {
        name: "DialogContent",
        type: "title: string; description?: string; variant?: dialog | sheet",
        description:
          "Required nonblank visible title; optional linked description; a Close button is always included.",
      },
      {
        name: "portalContainer / content props",
        type: "HTMLElement; Radix content props",
        description:
          "Defaults to document.body. Use a themed container for scoped overrides; retain primitive focus/dismiss handlers unless deliberately adapting them.",
      },
    ],
    accessibility: [
      "Keep a DialogTrigger mounted for focus restoration. Escape, outside interaction, and Close request dismissal.",
      "Tab/Shift+Tab stay inside the modal. Do not remove visible titles or focus indicators.",
      "Portals inherit tokens from their destination. Document-level light/dark themes work by default; scoped themes need portalContainer in that scope.",
      "No animation is added, including under reduced-motion preferences. Sheet is the same modal behavior with a side layout.",
    ],
    examples: [
      {
        id: "default",
        title: "Read-only dialog",
        component: examples.DialogExample,
        code: '<Dialog><DialogTrigger>Inspect</DialogTrigger><DialogContent title="Inspect local draft" description="No changes are saved."><TextBlock text={draft} /></DialogContent></Dialog>',
      },
      {
        id: "sheet",
        title: "Controlled metadata sheet",
        component: examples.SheetExample,
        code: '<Dialog open={open} onOpenChange={setOpen}><DialogTrigger>Metadata</DialogTrigger><DialogContent variant="sheet" title="Checkpoint metadata"><Metadata /></DialogContent></Dialog>',
      },
    ],
  },
};

export default function InspectionPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
