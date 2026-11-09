import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { ButtonLinks, InlineLinks, LongButtonLink, LongLink } from "./examples.js";

const sharedProps: CatalogDocument["props"] = [
  { name: "href", type: "string (required)", description: "The native navigation destination." },
  {
    name: "target, rel, download, aria-current, hidden, …",
    type: "native anchor props",
    description: "Forwarded unchanged. The application owns destinations and current-page state.",
  },
  {
    name: "ref, className, style",
    type: "native anchor ref and styling",
    description: "Ref targets the anchor. Classes are additive; styles remain caller-owned.",
  },
];

const accessibility = [
  "Use a meaningful visible label. Native Enter activation, modified and middle clicks, downloads and new-tab behavior remain browser-owned; Space is not emulated as a button action.",
  "Use links to navigate and Button for actions. There is no disabled or loading-link API. A visual variant does not add confirmation, authorization or a destructive action.",
  "Current-page semantics are caller-owned through aria-current. Router integration stays in the application; no router dependency or click interception is added.",
  "Semantic tokens, visible focus and long-label wrapping work without a global reset or Tailwind in the consumer. Recheck contrast when overriding theme tokens.",
];

const linkDocument: CatalogDocument = {
  overview:
    "An underlined native anchor for inline navigation. It inherits surrounding typography and keeps browser navigation behavior.",
  usage:
    'import { Link } from "@littlejay/ui/link";\nimport "@littlejay/ui/styles.css";\n\n<Link href="/projects">View projects</Link>;',
  props: sharedProps,
  accessibility,
  examples: [
    {
      id: "default",
      title: "Local catalog navigation",
      component: InlineLinks,
      code: '<Link href="#/button">Button documentation</Link>\n<Link href="#/field">Field documentation</Link>',
    },
    {
      id: "long",
      title: "Long current-page label",
      component: LongLink,
      code: '<Link href="#/link/long" aria-current="page">A descriptive current documentation location with a long label.</Link>',
    },
  ],
};

const buttonLinkDocument: CatalogDocument = {
  overview:
    "A native anchor with Button-style visual emphasis. It navigates rather than submitting a form or emulating button keyboard behavior.",
  usage:
    'import { ButtonLink } from "@littlejay/ui/button-link";\nimport "@littlejay/ui/styles.css";\n\n<ButtonLink href="/projects" variant="secondary">View projects</ButtonLink>;',
  props: [
    {
      name: "variant",
      type: '"primary" (default) | "secondary" | "outline" | "ghost" | "danger"',
      description: "Existing Button visual variants; native anchor behavior does not change.",
    },
    ...sharedProps,
  ],
  accessibility,
  examples: [
    {
      id: "default",
      title: "Theme variants / local navigation",
      component: ButtonLinks,
      code: '<ButtonLink href="#/button/variants">Primary navigation</ButtonLink>\n<ButtonLink href="#/button/variants" variant="secondary">Secondary navigation</ButtonLink>\n<ButtonLink href="#/button/variants" variant="outline">Outline navigation</ButtonLink>\n<ButtonLink href="#/button/variants" variant="ghost">Ghost navigation</ButtonLink>\n<ButtonLink href="#/button/variants" variant="danger">Danger navigation</ButtonLink>',
    },
    {
      id: "long",
      title: "Long current-page label",
      component: LongButtonLink,
      code: '<ButtonLink href="#/button-link/long" variant="outline" aria-current="page">Open a documentation page with a long descriptive navigation label.</ButtonLink>',
    },
  ],
};

export default function LinkPage(props: CatalogPageProps) {
  return (
    <DocumentationPage
      {...props}
      document={props.pageId === "button-link" ? buttonLinkDocument : linkDocument}
    />
  );
}
