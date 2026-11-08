import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import * as examples from "./examples.js";

const documents: Record<string, CatalogDocument> = {
  breadcrumb: {
    overview:
      "Router-independent breadcrumb composition with a named navigation landmark, ordered list, decorative separators and plain current-location text. The application supplies real ancestor links and hierarchy.",
    usage:
      'import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbPage } from "@littlejay/ui/breadcrumb";\nimport "@littlejay/ui/styles.css";\n\n<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><a href="#/introduction">Introduction</a></BreadcrumbItem>\n    <BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
    props: [
      {
        name: "Breadcrumb",
        type: 'Native nav props; aria-label="Breadcrumb"',
        description:
          "Named navigation wrapper. Override the label or supply aria-labelledby to distinguish multiple breadcrumb landmarks.",
      },
      {
        name: "BreadcrumbList / BreadcrumbItem",
        type: "Native ol / li props",
        description:
          "Ordered, wrapping composition. Place each ancestor link/current label inside its own item. List retains role=list without native markers.",
      },
      {
        name: "BreadcrumbSeparator",
        type: 'Native span props; children="/"',
        description:
          "Fixed aria-hidden=true. Put a noninteractive separator inside every item except the first, not in a separate list entry.",
      },
      {
        name: "BreadcrumbPage",
        type: "Native span props",
        description:
          'Fixed aria-current="page". Plain current text, without href, disabled-link semantics or an added focus stop. Compose exactly one per breadcrumb.',
      },
    ],
    accessibility: [
      "Use real native links or router-aware links for actual ancestors. The library adds no router dependency, click handler, menu, collapse behavior or focus management.",
      "Supply exactly one current page and keep ancestor links free of current-page markers. Separators are decorative; do not put interactive or meaningful content inside them.",
      "The catalog adopts Introduction → page → explicitly selected example below its page header. Introduction itself has no redundant home link; missing pages/examples use plain current labels. Categories without routes are omitted.",
      "Long labels wrap rather than being hidden or truncated. Hierarchy, navigation, history, page/selector focus and preview state remain application-owned.",
    ],
    examples: [
      {
        id: "default",
        title: "Native links and current location",
        component: examples.BreadcrumbExample,
        code: '<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><a href="#/introduction">Introduction</a></BreadcrumbItem>\n    <BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>',
      },
      {
        id: "long",
        title: "Long labels and custom decorative separators",
        component: examples.LongBreadcrumbExample,
        code: "<BreadcrumbItem>\n  <BreadcrumbSeparator>›</BreadcrumbSeparator>\n  <BreadcrumbPage>Long current-location label that wraps</BreadcrumbPage>\n</BreadcrumbItem>",
      },
    ],
  },
  table: {
    overview:
      "Lightweight native table composition, with an optional named horizontal scroller. Data, empty/loading/error content and any sorting or filtering remain caller-owned.",
    usage:
      'import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableScroll } from "@littlejay/ui/table";\nimport "@littlejay/ui/styles.css";\n\n<TableScroll aria-label="Draft summary">\n  <Table>\n    <TableCaption>Local drafts</TableCaption>\n    <TableHeader><TableRow><TableHead>Draft</TableHead><TableHead>State</TableHead></TableRow></TableHeader>\n    <TableBody><TableRow><TableHead scope="row">Notes</TableHead><TableCell>Unsaved</TableCell></TableRow></TableBody>\n  </Table>\n</TableScroll>',
    props: [
      {
        name: "Table / TableHeader / TableBody / TableFooter",
        type: "Native table / thead / tbody / tfoot props",
        description:
          "Native elements with forwarded refs/className. No generated data, implicit grid role or selection behavior.",
      },
      {
        name: "TableRow / TableCell / TableCaption",
        type: "Native tr / td / caption props",
        description:
          "Preserve spans, header associations and native child controls. A visible caption names the table.",
      },
      {
        name: "TableHead",
        type: 'Native th props; scope="col"',
        description:
          'A header cell, not the header section. Use scope="row" for row headers or explicit IDs/headers for complex relationships.',
      },
      {
        name: "TableScroll",
        type: "Native div props with required aria-label or aria-labelledby",
        description:
          'Optional separate overflow wrapper. Requires a nonblank name and supplies role="region", tabIndex=0 and a visible focus outline; role/tabIndex are fixed.',
      },
    ],
    accessibility: [
      "Use a real caption and column/row headers. TableHeader is the thead section; TableHead is a th cell. No ARIA grid, roving focus or keyboard sorting is added.",
      "Name the optional TableScroll region. Its focus stop allows native horizontal keyboard scrolling; the table itself is not a tab stop. Use caller-owned widths when columns need more room.",
      "Keep buttons and links native. Table does not own requests, pagination, selection, loading, error announcements or empty-state copy. No TanStack dependency is needed for this static primitive.",
      "The catalog uses these same primitives for its props reference. Catalog-specific column sizing, routing, example state and preview reset remain app-owned.",
    ],
    examples: [
      {
        id: "default",
        title: "Native content, headers and local action",
        component: examples.TableExample,
        code: '<TableScroll aria-label="Local draft table">\n  <Table style={{ minWidth: "36rem" }}>\n    <TableCaption>Local drafts</TableCaption>\n    <TableHeader><TableRow><TableHead>Draft</TableHead><TableHead>State</TableHead></TableRow></TableHeader>\n    <TableBody><TableRow><TableHead scope="row">Notes</TableHead><TableCell>Unsaved</TableCell></TableRow></TableBody>\n  </Table>\n</TableScroll>',
      },
      {
        id: "empty",
        title: "Caller-owned empty content",
        component: examples.EmptyTableExample,
        code: "<Table>\n  <TableCaption>Local drafts</TableCaption>\n  <TableHeader><TableRow><TableHead>Draft</TableHead><TableHead>State</TableHead></TableRow></TableHeader>\n  <TableBody><TableRow><TableCell colSpan={2}>No local drafts.</TableCell></TableRow></TableBody>\n</Table>",
      },
    ],
  },
  card: {
    overview:
      "A lightweight themed content surface. Optional header, content and footer helpers compose native divs without state, implicit landmarks or card-wide actions.",
    usage:
      'import { Card, CardHeader, CardContent, CardFooter } from "@littlejay/ui/card";\nimport { Button } from "@littlejay/ui/button";\nimport "@littlejay/ui/styles.css";\n\n<Card>\n  <CardHeader><h3>Draft notes</h3></CardHeader>\n  <CardContent>Local content</CardContent>\n  <CardFooter><Button>Inspect</Button></CardFooter>\n</Card>',
    props: [
      {
        name: "Card",
        type: "ComponentProps<div>",
        description:
          "Native root props/ref/className; supplies a semantic-token surface and border, but no padding, heading, landmark or focus stop.",
      },
      {
        name: "CardHeader / CardContent / CardFooter",
        type: "ComponentProps<div>",
        description:
          "Optional native divs with 1rem padding. Footer uses wrapping flex layout for caller-supplied actions. No provider or required nesting contract.",
      },
    ],
    accessibility: [
      "Supply the appropriate heading level and explicit landmark name/role only when the content needs one. Header and footer helpers do not render global header/footer landmarks.",
      "Card is not a button or link. Put native actions inside it; do not add a click handler as a substitute for keyboard-accessible controls or nest controls in a card-wide link.",
      "Children remain safely rendered React content. The caller owns data, loading, permissions, focus and state. Native props and refs are forwarded by every helper.",
      "The catalog's outer preview uses the same Card/CardContent surface. Preview width and reset behavior stay app-owned; code and popover surfaces keep their own treatments.",
    ],
    examples: [
      {
        id: "default",
        title: "Composed content and local actions",
        component: examples.CardExample,
        code: '<Card>\n  <CardHeader><h3>Local draft</h3></CardHeader>\n  <CardContent><Field label="Card draft"><Input defaultValue="Unsaved notes" /></Field></CardContent>\n  <CardFooter><Button onClick={inspectLocally}>Inspect locally</Button></CardFooter>\n</Card>',
      },
      {
        id: "minimal",
        title: "Minimal content surface",
        component: examples.MinimalCardExample,
        code: "<Card><CardContent>Sections and actions are optional.</CardContent></Card>",
      },
    ],
  },
  tabs: {
    overview:
      "Horizontal, manually activated content tabs. Stable item values link native non-submit triggers to panels; workflow state and responsive layout stay application-owned.",
    usage:
      'import { Tabs } from "@littlejay/ui/tabs";\nimport "@littlejay/ui/styles.css";\n\n<Tabs label="Document views" items={[\n  { value: "draft", label: "Draft", content: <Draft /> },\n  { value: "preview", label: "Preview", content: <Preview /> },\n]} />',
    props: [
      {
        name: "label",
        type: "string / required",
        description: "Nonblank accessible name of the tab list.",
      },
      {
        name: "items",
        type: "readonly TabsItem[]",
        description:
          "Unique nonblank value, meaningful noninteractive label, content, and optional disabled flag. Keep values stable across rerenders/reordering.",
      },
      {
        name: "value / defaultValue / onValueChange",
        type: "string / string / (value: string) => void",
        description:
          "Controlled selection or uncontrolled initial selection. A controlled caller must accept onValueChange to activate a new panel. Focusing a trigger does not request activation.",
      },
      {
        name: "Root div props",
        type: "ref, className, dir, aria-*, data-*",
        description:
          "Native root props; children, raw HTML and native defaultValue are replaced by the item/selection API.",
      },
    ],
    accessibility: [
      "Tab enters the tab list once. Left/Right wrap through enabled triggers (mirrored in RTL); Home/End focus the first/last enabled trigger. Enter/Space or click activates; Up/Down keep their native behavior. Labels must not contain links or other interactive elements.",
      "Content mounts only on first activation, then stays mounted in a hidden panel while its item remains. Hidden content is not in the keyboard/accessibility flow, but its effects continue: the application owns pausing timers, requests and canvas measurement. Removing an item or resetting the example unmounts its content.",
      "Missing, removed or disabled selected values display the first enabled item without firing onValueChange; empty/all-disabled lists have no selected panel. Keep controlled values valid if selection has domain meaning. defaultValue is initial only; fallback does not overwrite the requested value.",
      "Each panel is keyboard-focusable and named by its trigger. External controlled changes do not move focus; the caller owns focus recovery when it hides the currently focused content. This is not URL navigation, a graph-node selector, or a responsive layout engine.",
    ],
    examples: [
      {
        id: "default",
        title: "Manual activation / preserved local draft",
        component: examples.TabsExample,
        code: '<Tabs label="Local document views" items={items} />',
      },
      {
        id: "controlled",
        title: "Caller-owned selection",
        component: examples.ControlledTabsExample,
        code: 'const [value, setValue] = useState("preview");\n<Tabs label="Controlled local views" items={items} value={value} onValueChange={setValue} />',
      },
    ],
  },
  "description-list": {
    overview:
      "Native metadata semantics with wrapping for long values. Applications supply dt/dd pairs; no domain schema is inferred.",
    usage:
      'import { DescriptionList } from "@littlejay/ui/description-list";\nimport "@littlejay/ui/styles.css";\n\n<DescriptionList><dt>State</dt><dd>Saved</dd></DescriptionList>',
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
      'import { Disclosure } from "@littlejay/ui/disclosure";\n\n<Disclosure summary="Metadata">Saved draft details</Disclosure>',
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
      'import { TextBlock } from "@littlejay/ui/text-block";\n\n<TextBlock aria-label="Artifact output" text={untrustedText} />',
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
      'import { IconButton } from "@littlejay/ui/icon-button";\n\n<IconButton label="Refresh preview" onClick={refresh}><RefreshIcon /></IconButton>',
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
      'import { Dialog, DialogTrigger, DialogContent } from "@littlejay/ui/dialog";\nimport "@littlejay/ui/styles.css";\n\n<Dialog>\n  <DialogTrigger>Inspect</DialogTrigger>\n  <DialogContent title="Draft preview" description="Read-only local data.">Content</DialogContent>\n</Dialog>',
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
        name: "closeDisabled",
        type: "boolean / default false",
        description:
          "DialogContent: disables only its built-in non-submit Close button. Does not prevent Escape or outside dismissal; applications own pending state and dismissal decisions.",
      },
      {
        name: "closeLabel",
        type: "string / optional",
        description:
          "DialogContent: nonblank accessible name for the built-in button. Blank labels throw. Visible text stays Close; omission preserves its native Close name. Include Close in custom names to match the visible label.",
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
      "closeDisabled does not implement a pending policy. To prevent dismissal, use controlled open/onOpenChange and deliberately preventDefault in onEscapeKeyDown/onInteractOutside. Keep a reachable control to end a local pending simulation.",
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
      {
        id: "pending",
        title: "Caller-owned pending simulation",
        component: examples.PendingDialogExample,
        code: 'const [open, setOpen] = useState(false);\nconst [pending, setPending] = useState(false);\n\n<Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen); }}>\n  <DialogTrigger>Open pending dialog demo</DialogTrigger>\n  <DialogContent\n    title="Local pending simulation"\n    description="Synthetic state only. Nothing is saved or sent."\n    closeDisabled={pending}\n    closeLabel="Close pending dialog demo"\n    onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}\n    onInteractOutside={(event) => { if (pending) event.preventDefault(); }}\n  >\n    <Button aria-pressed={pending} onClick={() => setPending((current) => !current)}>Simulate pending</Button>\n    <p role="status">{pending ? "Pending simulation: toggle off to enable dismissal." : "Ready to dismiss."}</p>\n  </DialogContent>\n</Dialog>',
      },
    ],
  },
};

export default function InspectionPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
