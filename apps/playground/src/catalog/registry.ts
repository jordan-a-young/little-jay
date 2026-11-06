import { lazy } from "react";
import type { CatalogPageProps } from "./types.js";
import type { ComponentType } from "react";

type CatalogRegistration = {
  id: string;
  title: string;
  group:
    | "Foundations"
    | "Components / Actions"
    | "Components / Forms"
    | "Components / Feedback"
    | "Components / Inspection"
    | "Patterns";
  keywords: string;
  component: ComponentType<CatalogPageProps>;
};

const foundations = lazy(() => import("./foundations/page.js"));
const actions = lazy(() => import("./button/page.js"));
const forms = lazy(() => import("./forms/page.js"));
const feedback = lazy(() => import("./feedback/page.js"));
const patterns = lazy(() => import("./patterns/page.js"));
const inspection = lazy(() => import("./inspection/page.js"));

export const catalogPages: readonly CatalogRegistration[] = [
  {
    id: "introduction",
    title: "Introduction",
    group: "Foundations",
    keywords: "getting started install usage",
    component: foundations,
  },
  {
    id: "themes",
    title: "Colors & themes",
    group: "Foundations",
    keywords: "tokens palette light dark overrides",
    component: foundations,
  },
  {
    id: "branding",
    title: "Branding & Pebble",
    group: "Foundations",
    keywords: "logo mascot assets png svg",
    component: foundations,
  },
  {
    id: "button",
    title: "Button",
    group: "Components / Actions",
    keywords: "click disabled submit",
    component: actions,
  },
  ...["Field", "Input", "Textarea", "NativeSelect", "Checkbox"].map((title) => ({
    id: title.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    title,
    group: "Components / Forms" as const,
    keywords: "label validation native form control",
    component: forms,
  })),
  ...["DescriptionList", "Disclosure", "TextBlock", "IconButton", "Dialog"].map((title) => ({
    id: title.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    title,
    group: "Components / Inspection" as const,
    keywords: "metadata inspector native text modal sheet",
    component: inspection,
  })),
  ...["Alert", "EmptyState", "PebbleState", "StatusIndicator", "ErrorBoundary"].map((title) => ({
    id: title.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    title,
    group: "Components / Feedback" as const,
    keywords: "status loading success error empty feedback",
    component: feedback,
  })),
  {
    id: "workflow-form",
    title: "Workflow form",
    group: "Patterns",
    keywords: "actions validation draft pending",
    component: patterns,
  },
  {
    id: "api-connection",
    title: "API connection",
    group: "Patterns",
    keywords: "fetch fastify health query offline",
    component: patterns,
  },
];

export function catalogHref(pageId: string, exampleId?: string) {
  return `#/${encodeURIComponent(pageId)}${exampleId ? `/${encodeURIComponent(exampleId)}` : ""}`;
}

export function parseCatalogHash(hash: string): { pageId: string; exampleId?: string } {
  if (hash === "#pebble-states") return { pageId: "pebble-state", exampleId: "showcase" };
  if (!hash || hash === "#" || hash === "#/") return { pageId: "introduction" };
  try {
    const segments = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    if (segments.length > 2 || !segments[0]) return { pageId: "not-found" };
    return { pageId: segments[0], ...(segments[1] ? { exampleId: segments[1] } : {}) };
  } catch {
    return { pageId: "not-found" };
  }
}

export function filterCatalog(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalogPages.filter((page) =>
    terms.every((term) =>
      `${page.title} ${page.group} ${page.keywords}`.toLowerCase().includes(term),
    ),
  );
}
