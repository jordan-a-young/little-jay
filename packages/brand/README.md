# @ljay/brand

Canonical, framework-independent Little Jay artwork from the approved Pebble kit. This package is private and has no runtime framework dependencies.

`states/` adds the four original transparent 1254×1254 static app-state PNGs, with their source README and manifest. Each image and the manifest have explicit exports. See `docs/PEBBLE-STATES.md` in the workspace for the `PebbleState` component and base-aware public URLs.

- `logos/lockup-light.*` and `wordmark-light.*`: dark Ink lettering for light backgrounds.
- `logos/lockup-dark.*` and `wordmark-dark.*`: light lettering for dark backgrounds.
- `mascot/pebble.svg` and `.png`: the cozy seated young blue jay, as supplied. SVGs contain vector paths, not embedded raster artwork.
- `icons/`: favicon, Apple touch icon, and standard (not maskable) app icons.
- `banners/`: light/dark banners and raster social previews, available for future use. Social images are not automatically imported or assigned a public domain.
- `site.webmanifest`: relative URLs suitable for an app serving the manifest at `<app-base>/branding/site.webmanifest`.

Import an explicitly exported asset through your bundler, for example `import logo from "@ljay/brand/logos/lockup-light.svg"`. Preserve the image's aspect ratio and supply explicit dimensions. Lockups are 1100×300; use proportional display dimensions such as 275×75. Pebble is a 1024×1024 SVG viewport/PNG; use square display dimensions and do not stretch the underlying viewBox. Use `alt="Little Jay"` for a meaningful logo and `alt=""` for purely decorative mascot artwork. Do not inline or reconstruct Pebble in React or CSS.

The approved palette and original CSS live in `@ljay/tokens` under `source/`; that package generates the shared theme. Do not maintain a second app theme alongside it. See the workspace README for theme preferences, overrides, and automatic browser-asset synchronization.

`SOURCE-README.md` preserves the original kit's provenance and directions. Its suggestion to copy the entire kit to public is superseded by the repository's explicit synchronization allowlist. Original reference raster, preview sheet, ZIP, font binaries, and unused icon variants are deliberately not included. Artwork and notices were copied from the original download without altering it. Only manifest URLs were adapted for app-relative deployment.

The wordmarks are outlined from Ubuntu Sans Bold and need no web font. Retain `FONT-NOTICES.txt` with asset distributions. A web manifest alone does not provide offline support or a service worker.

## Provenance and rights

The project creator reports creating the Little Jay/Pebble artwork using ChatGPT, including the branding kit and app-state illustrations. This records the creator's statement, not an independent rights investigation. Original source guidance and font notices remain unchanged.

The repository's MIT license applies to project-authored code and documentation, **not** the logos, mascot, icons, banners, illustrations, or their generated copies. No separate artwork reuse license or trademark permission is granted. Any rights held in the artwork remain reserved; contact the project owner for reuse permission. Third-party fonts and other third-party material retain their existing terms and notices, including `FONT-NOTICES.txt`.

AI-assisted creation does not establish copyright protection, exclusive ownership, or trademark clearance. No legal clearance, publication, or deployment is implied by this provenance statement.
