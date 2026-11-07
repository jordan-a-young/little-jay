import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vite-plus/test";

const stylesheet = await readFile(new URL("./styles.css", import.meta.url), "utf8");

function rulesFor(className: string) {
  return [...stylesheet.matchAll(new RegExp(`\\.${className}\\s*\\{([^}]+)\\}`, "g"))].map(
    (match) => match[1]!,
  );
}

describe("catalog scroll layout contract", () => {
  it("bounds the shell to the viewport with a separate header and shrinkable pane row", () => {
    const shell = rulesFor("catalog-shell")[0]!;
    expect(shell).toMatch(/height:\s*100dvh/);
    expect(shell).toMatch(/grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
    expect(shell).toMatch(/overflow:\s*hidden/);
  });

  it.each(["catalog-sidebar", "catalog-main"])("gives %s its own contained scroll area", (name) => {
    const pane = rulesFor(name)[0]!;
    expect(pane).toMatch(/min-height:\s*0/);
    expect(pane).toMatch(/overflow:\s*auto/);
    expect(pane).toMatch(/overscroll-behavior:\s*contain/);
    expect(pane).toMatch(/scrollbar-gutter:\s*stable/);
  });

  it("keeps the main scroll target full-width and bounds only its inner content", () => {
    const main = rulesFor("catalog-main")[0]!;
    expect(main).toMatch(/width:\s*100%/);
    for (const rule of rulesFor("catalog-main")) {
      expect(rule).not.toMatch(/max-width:|margin-inline:|padding:/);
    }
    const content = rulesFor("catalog-main-content")[0]!;
    expect(content).toMatch(/width:\s*100%/);
    expect(content).toMatch(/max-width:\s*80rem/);
    expect(content).toMatch(/margin-inline:\s*auto/);
    expect(content).toMatch(/padding:\s*2rem clamp\(1rem,\s*3vw,\s*3rem\)/);
    expect(content).not.toMatch(/overflow:/);
    expect(rulesFor("catalog-main-content")[1]).toMatch(/padding:\s*1rem 0\.75rem/);
  });

  it("keeps the header sticky above both panes and never stacks the sidebar", () => {
    const header = rulesFor("catalog-header")[0]!;
    expect(header).toMatch(/position:\s*sticky/);
    expect(header).toMatch(/top:\s*0/);
    expect(header).toMatch(/z-index:\s*[1-9]/);
    for (const shell of rulesFor("catalog-shell")) {
      expect(shell).not.toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
    }
  });

  it("separates empty search feedback from the search field", () => {
    expect(rulesFor("catalog-search-empty")[0]).toMatch(/margin-block-start:\s*1\.5rem/);
  });

  it("applies inset example-tab focus after the shell focus defaults", () => {
    const defaults = stylesheet.indexOf(".catalog-shell :where");
    const tabFocus = stylesheet.lastIndexOf(".catalog-example-tab:focus-visible");
    expect(tabFocus).toBeGreaterThan(defaults);
    expect(stylesheet.slice(tabFocus).match(/^[^{]*\{([^}]+)\}/)?.[1]).toMatch(
      /outline-offset:\s*-3px/,
    );
  });

  it.each(["catalog-sidebar", "catalog-main"])(
    "hides %s scrollbars at rest without changing their width",
    (name) => {
      const pane = rulesFor(name)[0]!;
      expect(pane).toMatch(/scrollbar-width:\s*thin/);
      expect(pane).toMatch(/scrollbar-color:\s*transparent transparent/);
      expect(stylesheet).toContain(`.${name}:hover`);
      expect(stylesheet).toContain(`.${name}:focus-within`);
      expect(stylesheet).toMatch(/scrollbar-color:\s*var\(--lj-muted\) transparent/);
      expect(stylesheet).toContain(`.${name} > *`);
      expect(stylesheet).toMatch(/\.catalog-main\s*>\s*\*\s*\{\s*scrollbar-color:\s*auto/);
    },
  );
});
