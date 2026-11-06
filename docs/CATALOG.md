# Component catalog

The existing playground is a lightweight component-and-documentation catalog, not Storybook. It uses React and Vite already present in the workspace; no documentation framework, router, automatic prop extractor, plugin system, or iframe runtime is added.

## Viewing and navigation

Run `pnpm dev` and open the printed playground URL. The catalog starts at **Introduction**. Search the sidebar by component name, category, or keyword. Groups are Foundations, Components / Actions, Components / Forms, Components / Feedback, Components / Inspection, and Patterns.

Each page combines overview, named examples, example code, usage/import code, a concise props reference, and accessibility/behavior notes. Copy buttons use the browser clipboard API and offer manual-copy guidance if permission or secure-context requirements prevent copying. Props and snippets are explicitly authored, not automatically generated from TypeScript; update them when changing a component contract.

Code blocks lazy-load `prism-react-renderer`'s bundled Prism tokenizer for TSX and CSS, rendered as safe React text spans rather than injected HTML. A code-only Suspense boundary displays the original plain text while highlighting loads; a local error boundary keeps that text available if highlighting fails. The focusable code region and Copy control remain mounted and usable throughout. Light/dark syntax colors live in the app's `.catalog-code` styles on a neutral code surface; they do not change shared brand or action tokens. Copy uses the original source, including whitespace, rather than the highlighted DOM. Set `usageLanguage: "css"` on a document or `language: "css"` on an example when appropriate; TSX is the default. Copy controls are small, right-aligned, and retain distinct accessible names.

Links use hash navigation, so a same-origin deployment prefix needs no extra server routes:

- `/#/button/default`
- `/#/button/disabled`
- `/#/field/error`
- `/#/pebble-state/showcase`
- `/#/workflow-form`
- `/#/api-connection`
- `/#/text-block/default`
- `/#/dialog/sheet`
- `/little-jay/#/pebble-state/empty` for a pathname-prefixed build

The earlier `#pebble-states` URL remains an alias for the all-states showcase. Browser Back/Forward restores page/example selection. Missing pages and examples provide recovery UI instead of silently showing unrelated documentation. Preview-local state is not stored in the URL and resets when changing examples or leaving a page.

## Shared controls

- **Switch to light/dark theme / Use system theme:** reuse the existing persisted document-level preference and browser theme-color behavior. The switch button names the next action, including when following system appearance. Theme changes do not remount the active example.
- **Preview width:** available width, 640 px, or 320 px, constrained by the actual available space. This resizes a content box, **not an iframe viewport**; CSS media queries still follow the browser. Use a real narrow browser viewport for responsive checks.
- **Reset preview:** remounts only the active preview, restoring local demo state. It leaves theme, selected page/example, search, and documentation intact. It does not clear the shared Query cache; use Refresh API for fresh health data.
- **Example:** chooses a named, URL-addressable example. Button also demonstrates an explicit local state control rather than a generic automatic props editor.

The sidebar uses ordinary links and `aria-current`. A keyboard-visible skip link moves focus to documentation without changing the route. Changing catalog pages focuses the new page heading; changing examples preserves the example selector. Narrow layouts stack navigation above content, with a bounded scrollable navigation list. Code and props tables scroll within their own containers.

## Source organization

```text
apps/playground/src/
  CatalogApp.tsx                 shell composition and hash subscription
  shell/
    Sidebar.tsx                 searchable grouped navigation
    Toolbar.tsx                 theme, width, reset
    PreviewFrame.tsx             constrained preview and local remount boundary
  catalog/
    registry.ts                 typed navigation metadata and lazy page modules
    types.ts                    app-local document/example contracts
    DocumentationPage.tsx       shared docs, example selection, snippets, props
    foundations/{page,examples}.tsx
    button/{page,examples}.tsx
    forms/{page,examples}.tsx
    feedback/{page,examples}.tsx
    inspection/{page,examples}.tsx
    patterns/{page,examples}.tsx
```

Small related pages currently share a lazy module per category rather than creating many tiny chunks. Only the selected category is requested initially. Large future pages can get a separate lazy import in the registry. PNGs retain their existing lazy public-asset workflow; catalog metadata never eagerly imports every state illustration.

Components stay in `packages/ui`, canonical artwork in `packages/brand`, and tokens in `packages/tokens`. Catalog docs, controls, preview state, and application patterns remain in the playground. Do not make a UI component import catalog code or add domain policy to the library.

## Adding a page or example

1. Add a stable page ID/title/group/search keywords to `catalog/registry.ts` and point its component to an appropriate lazy module.
2. In that module's `page.tsx`, author a `CatalogDocument` with overview, usage, props, accessibility notes, and at least one named example. Use stable example IDs for links.
3. Put executable examples in the adjacent `examples.tsx`. Keep them local-only unless explicitly demonstrating a real read such as API health. Label simulated behavior; do not start workflows or create real records.
4. Render with `DocumentationPage`, passing the selected `pageId` and `exampleId`. Example components own local state, while the shared preview frame provides reset behavior.
5. Add meaningful tests for changed behavior and documentation wiring. No artwork snapshots are needed. Check keyboard use, both themes, and actual narrow viewports.

The workflow form, workflow feedback, isolated ErrorBoundary failure, Pebble Retry/Create demos, and Fastify health check are preserved as dedicated catalog entries. Inspection adds native metadata/disclosure, inert TextBlock, named IconButton, and Dialog/Sheet. Modal previews use a document-level portal and viewport, so the preview width control does not resize the modal; check a real narrow viewport. Only the API connection page mounts the real health query, now through `@ljay/http`. The existing health contract and port remain intact; `/api/ready` and the stateless TypeBox `/api/text-preview` endpoint are added locally. Production still needs the application's API reverse proxy.

`pnpm ready` runs the existing formatting/lint, builds, TypeScript, tests, and external package-consumer checks. The catalog adds tests for registry/search/links, docs wiring, reset/width state, missing routes/examples, clipboard failure, and local navigation. Explicit browser checks remain necessary; a constrained preview is not full responsive or accessibility validation.
