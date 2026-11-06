import type { ComponentType } from "react";
import type { CodeLanguage } from "./CodeBlock.js";

export type CatalogPageProps = { pageId: string; exampleId?: string };
export type CatalogExample = {
  id: string;
  title: string;
  component: ComponentType;
  code: string;
  language?: CodeLanguage;
};
export type CatalogDocument = {
  overview: string;
  usage: string;
  usageLanguage?: CodeLanguage;
  props: readonly { name: string; type: string; description: string }[];
  accessibility: readonly string[];
  examples: readonly CatalogExample[];
};
