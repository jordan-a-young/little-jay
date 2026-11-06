import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../packages/tokens/", import.meta.url);
const palette = JSON.parse(await readFile(new URL("source/palette.json", root), "utf8"));
const original = await readFile(new URL("source/tokens.css", root), "utf8");

function declarations(selector) {
  const block = original.match(selector)?.[1];
  assert.ok(block, "The approved kit must contain light and dark token blocks");
  return Object.fromEntries(
    [...block.matchAll(/(--lj-[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
}

const light = declarations(/:root\s*\{([^}]+)\}/);
const dark = declarations(/\[data-theme="dark"\]\s*\{([^}]+)\}/);
const semanticNames = {
  background: "--lj-background",
  surface: "--lj-surface",
  primary: "--lj-primary",
  onPrimary: "--lj-on-primary",
  text: "--lj-content",
  muted: "--lj-muted",
  controlBorder: "--lj-border",
};
for (const [name, tokens] of [
  ["light", light],
  ["dark", dark],
]) {
  for (const [key, variable] of Object.entries(semanticNames)) {
    assert.equal(
      tokens[variable]?.toLowerCase(),
      palette[name][key].toLowerCase(),
      `Approved ${name} palette and CSS disagree for ${key}`,
    );
  }
}
for (const [variable, key] of [
  ["--lj-brand", "jayBlue"],
  ["--lj-honey", "honey"],
  ["--lj-cloud", "cloud"],
]) {
  assert.equal(light[variable]?.toLowerCase(), palette.brand[key].toLowerCase());
}

function block(selector, tokens) {
  return `${selector} {\n${Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value.startsWith("#") ? value.toLowerCase() : value};`)
    .join("\n")}\n}\n`;
}

const shared = {
  "--lj-brand": palette.brand.jayBlue,
  "--lj-ink": palette.brand.ink,
  "--lj-ivory": palette.brand.ivory,
  "--lj-honey": palette.brand.honey,
  "--lj-cloud": palette.brand.cloud,
  "--lj-radius-control": light["--lj-radius-control"],
  "--lj-font-sans": "system-ui, sans-serif",
};
const lightTheme = Object.fromEntries(
  Object.values(semanticNames).map((variable) => [variable, light[variable]]),
);
Object.assign(lightTheme, {
  "--lj-info": light["--lj-primary"],
  "--lj-success": "#166534",
  "--lj-warning": "#92400e",
  "--lj-danger": "#b91c1c",
  "--lj-color-scheme": "light",
});
const darkTheme = Object.fromEntries(
  Object.values(semanticNames).map((variable) => [variable, dark[variable]]),
);
Object.assign(darkTheme, {
  "--lj-info": dark["--lj-primary"],
  "--lj-success": "#86efac",
  "--lj-warning": "#fcd34d",
  "--lj-danger": "#fca5a5",
  "--lj-color-scheme": "dark",
});
const output =
  block(":root", shared) +
  block(':root,\n[data-theme="light"]', lightTheme) +
  block('[data-theme="dark"]', darkTheme);
if (process.argv.includes("--check")) {
  assert.equal(
    await readFile(new URL("theme.css", root), "utf8"),
    output,
    "Theme output is stale; run pnpm --filter @littlejay/tokens build",
  );
} else {
  await writeFile(new URL("theme.css", root), output);
}
