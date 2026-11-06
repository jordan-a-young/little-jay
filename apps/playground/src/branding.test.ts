import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import palette from "@littlejay/tokens/palette.json";
import stateIllustrations from "@littlejay/brand/states/manifest.json" with { type: "json" };

const theme = readFileSync(new URL(import.meta.resolve("@littlejay/tokens/theme.css")), "utf8");
const brandRoot = new URL("./", import.meta.resolve("@littlejay/brand/site.webmanifest"));

function contrast(first: string, second: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(
      (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
    );
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return (linear[0] ?? 0) * 0.2126 + (linear[1] ?? 0) * 0.7152 + (linear[2] ?? 0) * 0.0722;
  };
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

describe("approved branding contract", () => {
  it("exports four static RGBA state PNGs whose dimensions agree with the canonical manifest", () => {
    expect(Object.keys(stateIllustrations).sort()).toEqual([
      "empty",
      "error",
      "loading",
      "success",
    ]);
    for (const illustration of Object.values(stateIllustrations)) {
      const source = readFileSync(new URL(`states/${illustration.file}`, brandRoot));
      expect(source.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(source.readUInt32BE(16)).toBe(illustration.width);
      expect(source.readUInt32BE(20)).toBe(illustration.height);
      expect(illustration.width).toBe(1254);
      expect(illustration.height).toBe(1254);
      expect(source[25]).toBe(6);
      expect(illustration.animated).toBe(false);
    }
  });
  it("generates the existing semantic contract from the approved palette", () => {
    for (const colors of [palette.light, palette.dark]) {
      for (const [name, value] of Object.entries({
        background: colors.background,
        surface: colors.surface,
        primary: colors.primary,
        "on-primary": colors.onPrimary,
        content: colors.text,
        muted: colors.muted,
        border: colors.controlBorder,
      }))
        expect(theme.toLowerCase()).toContain(`--lj-${name}: ${value.toLowerCase()};`);
    }
    expect(theme).toContain('[data-theme="light"]');
    expect(theme.toLowerCase()).toContain(`--lj-brand: ${palette.brand.jayBlue.toLowerCase()};`);
    expect(palette.brand.jayBlue).not.toBe(palette.light.primary);
  });

  it("meets normal-text and control-boundary contrast in both palettes", () => {
    for (const colors of [palette.light, palette.dark]) {
      expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
      for (const background of [colors.background, colors.surface]) {
        expect(contrast(colors.text, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.muted, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.controlBorder, background)).toBeGreaterThanOrEqual(3);
        expect(contrast(colors.primary, background)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("resolves manifest launch, scope and icons beneath root or prefixed deployments", () => {
    const manifest: { start_url: string; scope: string; icons: { src: string }[] } = JSON.parse(
      readFileSync(new URL("site.webmanifest", brandRoot), "utf8"),
    );
    for (const base of ["/", "/little-jay/"]) {
      const url = new URL(`${base}branding/site.webmanifest`, "https://local.invalid");
      expect(new URL(manifest.start_url, url).pathname).toBe(base);
      expect(new URL(manifest.scope, url).pathname).toBe(base);
      for (const icon of manifest.icons) {
        expect(new URL(icon.src, url).pathname).toBe(`${base}branding/${icon.src.slice(2)}`);
        expect(readFileSync(new URL(icon.src, brandRoot)).length).toBeGreaterThan(0);
      }
    }
  });

  it("ships outlined/vector artwork without embedded rasters or executable SVG content", () => {
    for (const asset of [
      "logos/lockup-light.svg",
      "logos/lockup-dark.svg",
      "mascot/pebble.svg",
      "icons/favicon.svg",
    ]) {
      const source = readFileSync(new URL(asset, brandRoot), "utf8");
      expect(source).toContain("viewBox=");
      expect(source).not.toMatch(/<(?:image|script|foreignObject)\b/i);
      expect(source).not.toMatch(/(?:href|src)=["'](?:https?:|data:)/i);
    }
  });
});
