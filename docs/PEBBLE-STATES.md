# Pebble app states

`@littlejay/ui` exports `PebbleState` from its root and `@littlejay/ui/pebble-state`. It is presentational: the application selects the state, copy, and actions. It does not fetch data, create records, schedule work, or animate.

```tsx
import { Button, PebbleState } from "@littlejay/ui";
import "@littlejay/ui/styles.css";

<PebbleState
  state="error"
  heading="We couldn’t load your projects."
  description="Check your connection and try again."
  assetBaseUrl={`${import.meta.env.BASE_URL}branding/`}
  illustrationSize={180}
  action={<Button onClick={retry}>Retry</Button>}
/>;
```

| Prop               | Contract                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `state`            | Required: `loading`, `success`, `error`, or `empty`                                                                   |
| `heading`          | Required React node communicating the state in visible text                                                           |
| `description`      | Optional React node with supporting text                                                                              |
| `action`           | Optional React node, usually an existing `Button` with an app-owned callback                                          |
| `assetBaseUrl`     | Required URL of the synchronized branding directory, e.g. `/branding/` or `/little-jay/branding/`                     |
| `illustrationSize` | Square CSS-pixel size, default 160; constrained to the available width. Nonpositive/nonfinite values fall back to 160 |
| Other div props    | Passed through, including `className`, `id`, and app-controlled ARIA attributes                                       |

The component reuses `EmptyState` layout, typography, and semantic theme tokens. Images have empty alt text because adjacent text communicates the state. Native dimensions and a square responsive box reserve space; `object-fit: contain` preserves proportions. Every image uses native lazy loading and asynchronous decoding. No PNG is imported into JavaScript or preloaded; browsers may still fetch near-viewport lazy images. Only rendered states are requested, subject to browser lazy-loading policy.

No implicit alert, live region, busy state, or progress percentage is added. For asynchronous work, the application owns a polite announcement region and `aria-busy` on the affected content region; do not announce initial static examples. Status must never depend on the illustration alone. If semantic headings are needed, pass an appropriately leveled heading node.

## Canonical assets and public URLs

Original, unmodified transparent **1254×1254 static PNGs** live at `packages/brand/states/pebble-{loading,success,error,empty}.png`. `states/README.md` and `states/manifest.json` preserve the pack's guidance and metadata. The original download remains untouched. These are not animated assets.

The `@littlejay/brand` package explicitly exports each PNG and `@littlejay/brand/states/manifest.json`. It is prepared for public npm distribution under the release runbook without granting additional artwork rights. The manifest centralizes filenames and native dimensions for both UI rendering and public-file synchronization. There is no second artwork source.

The existing playground `branding.ts` plugin copies the four images and manifest to ignored `public/branding/states` before development and production builds, and watches canonical source changes. Generated copies are not maintained manually or linked with symlinks. Public URLs are `<app-base>/branding/states/pebble-<state>.png`. Vite's `BASE_URL` makes the component work at `/` and pathname prefixes such as `/little-jay/`.

Another app should add `@littlejay/ui` and `@littlejay/brand`, import the shared stylesheet once, and extend its build/public-copy hook using the manifest and explicit brand exports, following the playground's plugin. Pass that app's actual branding URL to `assetBaseUrl`; the UI package intentionally does not assume Vite, a public domain, or a route. Apps may alternatively build their own presentation with individual PNG package imports, but should not eagerly import every image unnecessarily. Keep canonical source files in the brand package.

## Playground

Run `pnpm dev`, open the printed playground URL, and navigate to `#/pebble-state/showcase` (the earlier `#pebble-states` link still works). The **Pebble app states** showcase displays all four illustrations in the active theme. **Retry** and **Create project** switch their local demo panels to success without API calls or real records. **Reset simulated examples** restores the initial examples. Only these user-triggered changes update the showcase's initially empty polite status region. The catalog toolbar switches all examples between light and dark. See [catalog documentation](CATALOG.md) for navigation and preview controls.
