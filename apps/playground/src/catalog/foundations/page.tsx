import { DocumentationPage } from "../DocumentationPage.js";
import type { CatalogDocument, CatalogPageProps } from "../types.js";
import { BrandingExample, IntroductionExample, ThemeExample } from "./examples.js";
import { hooksDocument } from "./hooks.js";

const documents: Record<string, CatalogDocument> = {
  hooks: hooksDocument,
  introduction: {
    overview:
      "Little Jay's lightweight component catalog: named examples, usage snippets, prop reference, and accessibility notes, built on the existing React/Vite playground without Storybook. Components remain framework-light and examples stay application-local.",
    usage:
      'import { Button } from "@littlejay/ui/button";\nimport "@littlejay/ui/styles.css";\n\n<Button onClick={continueLocally}>Continue</Button>;',
    props: [],
    accessibility: [
      "Use the searchable sidebar and ordinary links; browser Back/Forward and direct example URLs are supported.",
      "Use Skip to documentation to bypass navigation. Navigating to a different catalog page focuses its heading.",
      "Preview width constrains the content box, not the browser's media-query viewport. Check real narrow viewports too.",
      "Examples are explicit and app-local, not automatically extracted API documentation or a replacement for tests.",
    ],
    examples: [
      {
        id: "default",
        title: "Welcome",
        component: IntroductionExample,
        code: 'import { Button } from "@littlejay/ui";\n\n<Button>Continue</Button>',
      },
    ],
  },
  themes: {
    overview:
      "Use semantic action, content, surface, border, and focus colors. Brand Jay Blue is separate from the accessible light/dark primary action colors. The document owns persisted appearance; missing preferences follow the system.",
    usage:
      '/* Load after importing @littlejay/ui/styles.css */\n:root { --lj-radius-control: 0.5rem; }\n:root[data-theme="light"] {\n  --lj-primary: #2463a6;\n  --lj-on-primary: #ffffff;\n}',
    usageLanguage: "css",
    props: [],
    accessibility: [
      "Check foreground/background contrast together when overriding tokens.",
      "Theme controls apply data-theme to document.documentElement so body portals inherit the theme.",
      "Canonical palette.json and tokens.css live in packages/tokens/source; build-tokens generates the shared theme.",
      "Explicit choices persist. Use system theme removes the preference and follows prefers-color-scheme.",
    ],
    examples: [
      {
        id: "default",
        title: "Semantic controls and brand palette",
        component: ThemeExample,
        code: '<Button>Primary action</Button>\n<Field label="Themed field"><Input defaultValue="A draft survives theme changes" /></Field>',
      },
    ],
  },
  branding: {
    overview:
      "Little Jay is the brand; Pebble is the cozy seated young blue jay. Canonical logos, mascot, icons, banners, and static state PNGs live in the framework-independent @littlejay/brand package.",
    usage:
      'import logoLight from "@littlejay/brand/logos/lockup-light.svg";\nimport logoDark from "@littlejay/brand/logos/lockup-dark.svg";\n\n<img src={theme === "dark" ? logoDark : logoLight}\n  alt="Little Jay" width={275} height={75} />',
    props: [],
    accessibility: [
      "Use light-lettering lockup-dark on dark backgrounds and dark-lettering lockup-light on light backgrounds.",
      "Preserve image proportions and explicit dimensions. Decorative Pebble images use empty alt text.",
      "Browser icons and state illustrations synchronize from @littlejay/brand before development/builds. Do not edit generated public copies.",
      "State PNGs are static, not animations. No offline support or public site domain is implied.",
    ],
    examples: [
      {
        id: "default",
        title: "Theme-aware artwork",
        component: BrandingExample,
        code: '<img src={theme === "dark" ? logoDark : logoLight} alt="Little Jay" width={275} height={75} />\n<img src={pebble} alt="" width={160} height={160} />',
      },
    ],
  },
};

export default function FoundationsPage(props: CatalogPageProps) {
  const document = documents[props.pageId];
  return document ? <DocumentationPage {...props} document={document} /> : null;
}
