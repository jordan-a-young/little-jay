# Little Jay · Pebble branding kit

## Files

- `mascot/pebble.svg`: editable filled vector paths, normalized to the approved four-color mascot palette. Traced from the generated Pebble cutout; not an embedded bitmap. The trace is an initial vector master, not a hand-optimized illustration.
- `mascot/pebble.png`: transparent 1024px rendering of the vector master.
- `mascot/pebble-original.png`: original generated transparent raster reference.
- `mascot/pebble-silhouette.svg`: solid silhouette for stamps or decorative use.
- `logos/`: outlined wordmarks and horizontal lockups, with light/dark versions. Dark versions have light lettering for dark backgrounds. PNG versions are transparent.
- `banners/`: light/dark banners (1600×500) and social previews (1200×630), SVG and PNG.
- `icons/`: simplified head mark for small sizes, SVG favicon, 16/32/48/64px PNGs, multi-size ICO, 180px Apple icon, 192/512px app icons.
- `theme/`: exact palette JSON and CSS theme variables.

The small-format head mark is a simplified interpretation of Pebble rather than a crop of the full mascot. App icons are declared for standard use, not maskable use. Wordmark text is outlined from Ubuntu Sans Bold, so SVGs do not require a web font. Font notices are included; font binaries are not bundled. The optional banner line is “Small pieces. Room to grow.”

## Use in Vite / React

Copy this entire directory to `apps/playground/public/branding` (or another app's `public/branding`). Place these tags in the app's HTML head:

```html
<link rel="icon" type="image/svg+xml" href="/branding/icons/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/branding/icons/icon-32.png" />
<link rel="icon" href="/branding/icons/favicon.ico" sizes="any" />
<link rel="apple-touch-icon" sizes="180x180" href="/branding/icons/apple-touch-icon.png" />
<link rel="manifest" href="/branding/site.webmanifest" />
<meta name="theme-color" content="#3276C3" />
```

```tsx
<img src="/branding/logos/lockup-light.svg" alt="Little Jay" width={275} height={75} />
<img src="/branding/mascot/pebble.svg" alt="Pebble, the Little Jay mascot" width={240} height={240} />
```

Use empty alt text when the mascot is purely decorative. Use an absolute public URL to `banners/social-light.png` for `og:image` after deployment; SVG is not recommended for social previews. Change manifest URLs and `start_url` if deploying beneath a path prefix. Installing a manifest alone does not add offline functionality.

Replace the theme declarations in your existing tokens package with `theme/tokens.css`, or import it after existing defaults. This kit does not modify your locally copied project.

## Source and production notes

Mascot cutout generated with the built-in image-generation tool from selected Pebble option 1, requesting transparent background, seated young blue jay, oversized head, swept crest, ivory belly, blue wings, ink outlines, honey accent. Vector master created by palette normalization and automated tracing. Banners, wordmark paths, icons, and raster sizes rendered from SVG locally. Check final assets at intended sizes before publishing; trademark availability is not established by generating this kit.
