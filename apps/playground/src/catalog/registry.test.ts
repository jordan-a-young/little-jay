import { describe, expect, it } from "vite-plus/test";
import { catalogHref, catalogPages, filterCatalog, parseCatalogHash } from "./registry.js";

describe("catalog registry and links", () => {
  it("has stable unique pages for all foundations, components, and patterns", () => {
    expect(catalogPages).toHaveLength(21);
    expect(new Set(catalogPages.map((page) => page.id)).size).toBe(catalogPages.length);
    for (const page of catalogPages)
      expect(parseCatalogHash(catalogHref(page.id))).toEqual({ pageId: page.id });
    expect(catalogPages.some((page) => page.id === "native-select")).toBe(true);
  });
  it("supports named example deep links and the existing Pebble showcase link", () => {
    expect(parseCatalogHash("#/button/disabled")).toEqual({
      pageId: "button",
      exampleId: "disabled",
    });
    expect(parseCatalogHash("#pebble-states")).toEqual({
      pageId: "pebble-state",
      exampleId: "showcase",
    });
    expect(parseCatalogHash("")).toEqual({ pageId: "introduction" });
    expect(catalogHref("pebble-state", "empty")).toBe("#/pebble-state/empty");
  });
  it("handles malformed and unknown links without throwing or interpreting markup", () => {
    expect(parseCatalogHash("#/%ZZ")).toEqual({ pageId: "not-found" });
    expect(parseCatalogHash("#/button/default/extra")).toEqual({ pageId: "not-found" });
    expect(parseCatalogHash("#/unknown")).toEqual({ pageId: "unknown" });
  });
  it("searches case-insensitively across names, groups, and keywords", () => {
    expect(filterCatalog("  BUTTON ").map((page) => page.id)).toEqual(["button", "icon-button"]);
    expect(filterCatalog("forms native").map((page) => page.id)).toContain("native-select");
    expect(filterCatalog("no such component")).toEqual([]);
    expect(filterCatalog("")).toHaveLength(catalogPages.length);
  });
});
