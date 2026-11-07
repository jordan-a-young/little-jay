import { describe, expect, it } from "vite-plus/test";
import { catalogPages, filterCatalog } from "./registry.js";

describe("catalog registry and links", () => {
  it("alphabetizes component groups and display names without reordering guides or patterns", () => {
    expect([...new Set(catalogPages.map((page) => page.group))]).toEqual([
      "Foundations",
      "Components / Actions",
      "Components / Feedback",
      "Components / Forms",
      "Components / Inspection",
      "Patterns",
    ]);
    expect(catalogPages.map((page) => page.id)).toEqual([
      "introduction",
      "themes",
      "branding",
      "hooks",
      "button",
      "alert",
      "empty-state",
      "error-boundary",
      "loading-indicator",
      "pebble-state",
      "status-indicator",
      "checkbox",
      "combobox",
      "field",
      "input",
      "native-select",
      "password-field",
      "switch",
      "textarea",
      "breadcrumb",
      "card",
      "description-list",
      "dialog",
      "disclosure",
      "icon-button",
      "table",
      "tabs",
      "text-block",
      "workflow-form",
      "api-connection",
    ]);
    expect(filterCatalog("components")).toEqual(
      catalogPages.filter((page) => page.group.startsWith("Components /")),
    );
    expect(filterCatalog("feedback").map((page) => page.title)).toEqual([
      "Alert",
      "EmptyState",
      "ErrorBoundary",
      "LoadingIndicator",
      "PebbleState",
      "StatusIndicator",
    ]);
  });
  it("has stable unique pages for all foundations, components, and patterns", () => {
    expect(catalogPages).toHaveLength(30);
    expect(new Set(catalogPages.map((page) => page.id)).size).toBe(catalogPages.length);
    expect(catalogPages.some((page) => page.id === "native-select")).toBe(true);
  });
  it("searches case-insensitively across names, groups, and keywords", () => {
    expect(filterCatalog("  BUTTON ").map((page) => page.id)).toEqual(["button", "icon-button"]);
    expect(filterCatalog("forms native").map((page) => page.id)).toContain("native-select");
    expect(filterCatalog("spinner").map((page) => page.id)).toEqual(["loading-indicator"]);
    expect(filterCatalog("toggle").map((page) => page.id)).toEqual(["switch"]);
    expect(filterCatalog("hooks").map((page) => page.id)).toEqual(["hooks"]);
    expect(filterCatalog("panels").map((page) => page.id)).toEqual(["tabs"]);
    expect(filterCatalog("surface").map((page) => page.id)).toEqual(["card"]);
    expect(filterCatalog("columns").map((page) => page.id)).toEqual(["table"]);
    expect(filterCatalog("ancestors").map((page) => page.id)).toEqual(["breadcrumb"]);
    expect(filterCatalog("reveal").map((page) => page.id)).toEqual(["password-field"]);
    expect(filterCatalog("filter local").map((page) => page.id)).toEqual(["combobox"]);
    expect(filterCatalog("no such component")).toEqual([]);
    expect(filterCatalog("")).toHaveLength(catalogPages.length);
  });
});
