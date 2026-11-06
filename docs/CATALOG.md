# Component catalog

The existing playground is a lightweight component-and-documentation catalog, not Storybook. It uses React, Vite, and TanStack Router directly in the playground application; no shared router package, documentation framework, automatic prop extractor, plugin system, or iframe runtime is added.

## Viewing and navigation

Run `pnpm dev` and open the printed playground URL. The catalog starts at **Introduction**. Search the sidebar by component name, category, or keyword. Groups are Foundations, Components / Actions, Components / Feedback, Components / Forms, Components / Inspection, and Patterns. Component sections and their entries are alphabetical by display name; Foundations and Patterns retain their authored order. Search preserves this catalog order, and page/example links stay stable.

Each page combines overview, named examples, example code, usage/import code, a concise props reference, and accessibility/behavior notes. Copy buttons use the browser clipboard API and offer manual-copy guidance if permission or secure-context requirements prevent copying. Props and snippets are explicitly authored, not automatically generated from TypeScript; update them when changing a component contract.

Code blocks lazy-load `prism-react-renderer`'s bundled Prism tokenizer for TSX and CSS, rendered as safe React text spans rather than injected HTML. A code-only Suspense boundary displays the original plain text while highlighting loads; a local error boundary keeps that text available if highlighting fails. The focusable code region and Copy control remain mounted and usable throughout. Light/dark syntax colors live in the app's `.catalog-code` styles on a neutral code surface; they do not change shared brand or action tokens. Copy uses the original source, including whitespace, rather than the highlighted DOM. Set `usageLanguage: "css"` on a document or `language: "css"` on an example when appropriate; TSX is the default. Copy controls are small, right-aligned, and retain distinct accessible names.

TanStack Router uses hash history, so a same-origin deployment prefix needs no extra server routes. Its app-local code-based route tree handles the root Introduction page and `/$pageId/{-$exampleId}`; the catalog registry owns metadata, ordering, search, and lazy component modules rather than URL parsing:

- `/#/button/default`
- `/#/button/disabled`
- `/#/button/variants`
- `/#/alert/dismissible`
- `/#/alert/success`
- `/#/alert/warning`
- `/#/loading-indicator`
- `/#/loading-indicator/local`
- `/#/hooks`
- `/#/hooks/query`
- `/#/field/error`
- `/#/pebble-state/showcase`
- `/#/workflow-form`
- `/#/api-connection`
- `/#/text-block/default`
- `/#/dialog/sheet`
- `/#/tabs`
- `/#/tabs/controlled`
- `/little-jay/#/pebble-state/empty` for a pathname-prefixed build

The earlier `#pebble-states` URL remains an alias for the all-states showcase. Browser Back/Forward restores page/example selection. Missing pages and examples provide recovery UI instead of silently showing unrelated documentation. Preview-local state is not stored in the URL and resets when changing examples or leaving a page.

`routing-history.ts` is a small application compatibility boundary, not another router: it retains existing history state, adapts the exact legacy fragment, and rejects malformed percent encoding or extra path segments before router matching. Generated links retain the deployment pathname/query outside the fragment. Do not set the asset deployment prefix as a router basepath inside the fragment. The skip link still focuses documentation without changing the route.

One stable QueryClient is passed to QueryClientProvider and the router's typed context. Routes/hooks can use TanStack Router APIs; future loaders can use `context.queryClient` with existing app-owned query options, but React hooks must stay inside React components. This migration adds no loaders, health prefetch, or duplicate data cache. Automatic link preloading is disabled, and Query continues to own health freshness/cancellation/offline state.

**Hooks & data fetching** follows the existing Foundations entries. It documents application/internal hook ownership, stable QueryClient/provider setup, app-owned queryOptions, fetchJson cancellation/decoding, cached refresh, offline pause, safe error copy, and the separate React Actions form lifecycle. Snippets load current health/provider/API-pattern sources as text; visiting the guide does not mount the health query. The guide links to API connection (a live read), Workflow form (local only), and the transport contract in the private source repository. It adds neither a hooks package nor public hook exports.

## Shared controls

- **Settings:** a quiet button beside the page title opens a nonmodal, named native popover. Tab reaches its controls, Escape and outside clicks dismiss it, and Close provides an explicit dismissal action. Browser-managed focus returns to the trigger when appropriate. Settings do not take a permanent row above the documentation. This uses the Popover API in modern browsers; CSS anchor positioning aligns the panel with its trigger where supported, with a viewport-positioned fallback.
- **Theme:** one System / Light / Dark selector reuses the existing persisted document-level preference and browser theme-color behavior. Theme changes and opening/closing Settings do not remount the active example.
- **Preview width:** inside Settings, choose available width, 640 px, or 320 px, constrained by the actual available space. This resizes a content box, **not an iframe viewport**; CSS media queries still follow the browser. Its explanation stays inside the popover. Use a real narrow browser viewport for responsive checks.
- **Reset preview:** remounts only the active preview, restoring local demo state. It leaves theme, selected page/example, search, and documentation intact. It does not clear the shared Query cache; use Refresh API for fresh health data.
- **Example:** chooses a named, URL-addressable example. Button also demonstrates an explicit local state control rather than a generic automatic props editor.

The sidebar uses router-aware native links and `aria-current`. A keyboard-visible skip link moves focus to documentation without changing the route. Changing catalog pages focuses the new page heading; changing examples preserves the example selector. Page links explicitly clear an optional example parameter rather than inheriting it from the previous route. Narrow layouts stack navigation above content, with a bounded scrollable navigation list. Code and props tables scroll within their own containers.

## Source organization

```text
apps/playground/src/
  CatalogApp.tsx                 persistent shell, routed documents, focus boundaries
  router.tsx                     TanStack route tree and typed QueryClient context
  routing-history.ts             legacy/malformed-location compatibility
  shell/
    Sidebar.tsx                 searchable grouped navigation
    Toolbar.tsx                 theme, width, reset
    PreviewFrame.tsx             constrained preview and local remount boundary
  catalog/
    registry.ts                 typed navigation metadata and lazy page modules
    navigation.tsx               typed app-local links and route selection
    types.ts                    app-local document/example contracts
    DocumentationPage.tsx       shared docs, example selection, snippets, props
    foundations/{page,examples}.tsx
    foundations/hooks.tsx          hook ownership and source-based Query guide
    button/{page,examples}.tsx
    forms/{page,examples}.tsx
    feedback/{page,examples}.tsx
    inspection/{page,examples}.tsx
    patterns/{page,examples}.tsx
```

Small related pages currently share a lazy module per category rather than creating many tiny chunks. Only the selected category is requested initially. Large future pages can get a separate lazy import in the registry. PNGs retain their existing lazy public-asset workflow; catalog metadata never eagerly imports every state illustration.

Button's **Theme variants** example shows primary, secondary, outline, ghost, and danger together, including native disabled states and local-only click feedback. Its colors follow the document theme. Primary remains the default; a visual variant never supplies application confirmation or authorization policy.

Alert's **Dismissible / caller-owned** example opts in with `onDismiss` and a nonblank `dismissLabel`. The application removes the notice and restores focus to its surviving Show alert control. Alert itself never hides content or moves focus; omitting `onDismiss` preserves non-dismissible rendering. Its close button does not submit a surrounding form or add an Escape shortcut.

Alert's **Success / static** and **Warning / static** examples demonstrate the existing `tone="success"` and `tone="warning"` API with theme-based text and borders. Success describes a completed action; warning draws attention to a potential issue. These static examples use `role="note"`; application feedback defaults to polite `role="status"` for both tones. Dismissal is independently opt-in for any tone.

LoadingIndicator's default example shows a spinner with and without visible text; neither static preview creates a live region. Omitted or blank `label` text retains hidden “Loading” text. The **Caller-owned local activity** example toggles an indicator inside one app-owned status region without making requests or starting a timer. Reduced-motion preferences stop rotation but retain the indicator/text. Query, Actions, offline pause handling, and form disabling/focus policy are unchanged.

Tabs lives alphabetically in Inspection. Its **Manual activation / preserved local draft** example contains an editable draft, local counter, preview and disabled tab. Left/Right/Home/End move focus without activation; native Enter/Space or click selects content. Content mounts on first selection and stays mounted while its item remains. The **Caller-owned selection** example also demonstrates an external selection button without automatic focus movement. Neither example makes requests, starts workflows or migrates Graph Workbench. The application remains responsible for responsive all-panels layouts, pausing hidden effects and canvas remeasurement. Reset preview unmounts the entire example and clears its local draft/counter.

Components stay in `packages/ui`, canonical artwork in `packages/brand`, and tokens in `packages/tokens`. Catalog docs, controls, preview state, and application patterns remain in the playground. Do not make a UI component import catalog code or add domain policy to the library.

## Adding a page or example

1. Add a stable page ID/title/group/search keywords to `catalog/registry.ts` and point its component to an appropriate lazy module.
2. In that module's `page.tsx`, author a `CatalogDocument` with overview, usage, props, accessibility notes, and at least one named example. Use stable example IDs for links.
3. Put executable examples in the adjacent `examples.tsx`. Keep them local-only unless explicitly demonstrating a real read such as API health. Label simulated behavior; do not start workflows or create real records.
4. Render with `DocumentationPage`, passing the selected `pageId` and `exampleId`. Example components own local state, while the shared preview frame provides reset behavior.
5. Add meaningful tests for changed behavior and documentation wiring. No artwork snapshots are needed. Check keyboard use, both themes, and actual narrow viewports.

The workflow form, workflow feedback, isolated ErrorBoundary failure, Pebble Retry/Create demos, and Fastify health check are preserved as dedicated catalog entries. Inspection adds native metadata/disclosure, inert TextBlock, named IconButton, and Dialog/Sheet. Modal previews use a document-level portal and viewport, so the preview width control does not resize the modal; check a real narrow viewport. Only the API connection page mounts the real health query, now through `@ljay/http`. The existing health contract and port remain intact; `/api/ready` and the stateless TypeBox `/api/text-preview` endpoint are added locally. Production still needs the application's API reverse proxy.

`pnpm ready` runs the existing formatting/lint, builds, TypeScript, tests, and external package-consumer checks. The catalog adds tests for registry/search/links, docs wiring, reset/width state, missing routes/examples, clipboard failure, and local navigation. Explicit browser checks remain necessary; a constrained preview is not full responsive or accessibility validation.
