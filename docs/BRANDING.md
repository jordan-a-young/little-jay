# Little Jay and Pebble

Little Jay is the brand; Pebble is the cozy seated young blue jay. The original download is unchanged. No font binaries, preview sheet, original reference raster, or ZIP are shipped by the app or asset package.

## Canonical files

- `packages/brand`: selected SVG/PNG logos, Pebble, icons, banners, manifest, `FONT-NOTICES.txt`, and the original kit README for provenance. `@littlejay/brand` is private and framework-independent, with explicit asset exports and no React components.
- `packages/tokens/source/palette.json` and `source/tokens.css`: the approved kit's source of truth.
- `packages/tokens/theme.css`: generated semantic theme, not a hand-maintained second palette. `scripts/build-tokens.mjs` validates agreement between the approved JSON and CSS, then preserves existing `--lj-*` names and accessible feedback extensions.
- `packages/tokens/tailwind.css`: semantic utilities shared by UI and application code. UI's compiled stylesheet includes the generated theme; consumers need neither Tailwind nor a global reset.

Change approved token sources together, then run `pnpm --filter @littlejay/tokens build`. `pnpm check` rejects stale generated CSS, and dependency-ordered builds regenerate it before UI compilation. Restart `pnpm dev` after changing token sources so compiled UI CSS is rebuilt. Component source edits retain hot reload. Do not import `source/tokens.css` alongside the generated theme.

Brand primitives remain distinct from action colors:

| Purpose      | Tokens / values                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Brand        | Jay Blue `--lj-brand` #3276C3; Ink `--lj-ink` #25344A; Ivory `--lj-ivory` #FAF7F0; Honey `--lj-honey` #F2BF64; Cloud `--lj-cloud` #E8F1FB |
| Light action | `--lj-primary` #2463A6; `--lj-on-primary` #FFFFFF                                                                                         |
| Dark action  | `--lj-primary` #8ABBF2; `--lj-on-primary` #142236                                                                                         |

Use semantic `primary`, `background`, `surface`, `content`, `muted`, and `border` utilities for controls/content. Brand blue is not the approved button color. Feedback success/warning/danger colors extend the semantic palette; they are not alternative brand colors.

## Asset imports

Static loading/success/error/empty illustrations and the reusable React presentation are documented in [Pebble app states](PEBBLE-STATES.md). Canonical PNGs and their manifest live in `packages/brand/states`; browser copies use the same synchronization plugin.

```tsx
import logoLight from "@littlejay/brand/logos/lockup-light.svg";
import logoDark from "@littlejay/brand/logos/lockup-dark.svg";
import pebble from "@littlejay/brand/mascot/pebble.svg";

<img src={theme === "dark" ? logoDark : logoLight} alt="Little Jay" width={275} height={75} />;
<img src={pebble} alt="" width={160} height={160} />;
```

The `light` lockup has dark lettering; the `dark` lockup has light lettering. Lockups are 1100×300, wordmarks 820×180, and Pebble uses a 1024×1024 viewport. Preserve SVG viewBoxes and image proportions. Decorative mascot images have empty alt text. Artwork stays in files, never embedded in React or recreated with CSS. PNG alternatives are exported too. Retain font notices with asset distributions; outlined wordmarks require no web font.

## Document theme and overrides

The playground sets `data-theme="light"` or `data-theme="dark"` on `document.documentElement`, so future body portals inherit the same variables. A classic head initializer runs before styles and React. Settings come from the canonical palette, and it uses the same standalone theme-store source as the React adapter rather than serializing a transpiled function.

Explicit light/dark preferences use `little-jay.theme` in local storage. Missing/invalid storage follows `prefers-color-scheme`; choosing **System** in the Settings popover's Theme selector removes the explicit preference. System changes apply only in system mode. Storage events synchronize tabs. Blocked persistence retains the in-memory selection. Stable snapshots use `useSyncExternalStore`, with one shared media/storage listener pair and cleanup. Theme changes do not key/remount the form. Browser `theme-color` follows the resolved background.

Override variables after importing `@littlejay/ui/styles.css` (or `@littlejay/tokens/theme.css` for non-React use):

```css
:root {
  --lj-radius-control: 0.5rem;
}
:root[data-theme="light"] {
  --lj-primary: #2463a6;
  --lj-on-primary: #ffffff;
}
.project-panel {
  --lj-border: #7c8a9d;
}
```

Override foreground/background together and recheck contrast. Nested `data-theme="light"` sections can restore light inside a dark page. Brand constants, font, and radius are document defaults, not redeclared on theme switches.

## Browser files and deployment paths

`apps/playground/branding.ts` is an app-local Vite+ plugin. Before development and builds it copies an explicit allowlist of browser icons, manifest, and font notices from the brand package into ignored `apps/playground/public/branding`. Icon/manifest changes resynchronize and reload development; bootstrap-source changes restart Vite. No symlinks or manual public copies are needed, including on Windows. Generated files may be absent on a fresh checkout. Do not edit them or copy the whole kit to public.

HTML uses `%BASE_URL%branding/...`. The manifest uses `./icons/...`, with `start_url` and `scope` set to `../`, because it lives at `<app-base>/branding/site.webmanifest`. This supports same-origin pathname bases `/` or `/little-jay/`; CDN hosting needs a separate deployment decision. Example:

```sh
pnpm --filter @littlejay/playground build --base=/little-jay/
```

Manifest colors are static install-time defaults; HTML `theme-color` changes with appearance. Icons are standard `purpose: any`, not maskable. No service worker or offline support is implied. No public site URL is configured, so no canonical URL or social metadata is invented. Raster social previews are available for a future explicitly configured site.

## Adding another application

1. Add `@littlejay/brand` and the needed `@littlejay/ui`/`@littlejay/tokens` workspace dependencies.
2. Import assets through exports and the shared stylesheet once. Use appropriate alt text and explicit dimensions.
3. Adopt the playground's document-level preference/bootstrap pattern with one theme owner per document.
4. Adapt the app-local plugin's synchronization allowlist to the new app's public directory, or use your framework's equivalent hook. Resolve sources through brand exports; do not maintain duplicate artwork.
5. Match browser links to the app's base path and verify development and built output. Keep API routes and proxy policy application-owned.

All packages remain private. The creator reports generating the artwork using ChatGPT; see [provenance and rights](../packages/brand/README.md#provenance-and-rights). The repository's MIT grant covers project-authored code and documentation, not the branding artwork or trademark rights. Third-party font notices remain applicable. AI-assisted provenance is not a claim of legal clearance. Follow the [public-repository checklist](PUBLISHING.md) before public distribution, and separately confirm any public site URL before deployment. This integration does not authorize publishing or deployment and leaves Fastify behavior and port 5050 unchanged.
