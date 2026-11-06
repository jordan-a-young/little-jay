# @ljay/ui

Private ESM React 19 components. React and React DOM `^19.0.0` are peer dependencies; use the same React installation as the application. Consume only the public exports in [package.json](package.json), not `src` or hashed build chunks. No CommonJS entry point is provided.

## Imports

Root and component subpath imports expose the same components and types:

```tsx
import { Button, Field, Input } from "@ljay/ui";
import { LoadingIndicator } from "@ljay/ui/loading-indicator";
import "@ljay/ui/styles.css";

export function NameForm() {
  return (
    <form>
      <Field label="Name" required description="Your display name">
        <Input name="name" autoComplete="name" />
      </Field>
      <Button type="submit">Save</Button>
      <LoadingIndicator />
    </form>
  );
}
```

The indicator above is illustrative, not connected to submission. Other public components include Alert, EmptyState, PebbleState, StatusIndicator, ErrorBoundary, Textarea, NativeSelect, Checkbox, DescriptionList, Disclosure, TextBlock, IconButton, and Dialog/Trigger/Content/Close. Use shipped declarations for exact props.

## CSS and theming

Load `@ljay/ui/styles.css` once at the application entry. It contains compiled component utilities and the semantic theme: **no Tailwind installation or global reset is required**. The optional `@ljay/ui/theme.css` is theme-only; `@ljay/ui/tailwind.css` supplies mappings for apps already using Tailwind 4, not a replacement for compiled component CSS.

Use `data-theme="light"` or `data-theme="dark"` on the document root or a subtree. The application owns preference persistence and system-theme selection. Override semantic `--lj-*` properties after the library stylesheet, scoped to the relevant theme/container; review foreground/background contrast together. Brand blue is not the primary action color. For locally themed dialogs, place the portal in the themed subtree using `portalContainer`; document-root themes inherit normally.

PebbleState needs application-served assets. Copy the state PNGs from the installed `@ljay/brand/states/manifest.json` into your own public asset pipeline, preserving names and proportions. Pass a deployment-aware `assetBaseUrl` ending in `/` (for example `/my-app/branding/`, with images under `states/`). The library does not copy assets or infer the app base URL. Artwork has separate reserved rights; read the installed brand README before reuse.

## Accessibility

- Give controls visible labels. Field associates exactly one supported labelable control with its label, description, and error; put its ID on Field, not the child. Native form semantics/ref props remain available. Button defaults to `type="button"`; opt into submission explicitly.
- IconButton requires a meaningful `label`. DialogContent requires a nonblank visible `title`; optional `description` explains the task. Preserve modal focus trapping, Escape dismissal, and trigger focus restoration. Use `variant="sheet"` for a sheet, not a second modal system.
- Alert `onDismiss` is optional and caller-owned: update visibility and restore appropriate focus yourself. `dismissLabel` defaults to `"Dismiss alert"`. Choose announcement roles for context; do not use an urgent alert for routine status.
- LoadingIndicator's `label` is optional. Omitted/blank text retains hidden `"Loading"` text; the application owns live announcements and `aria-busy` on the affected region. Its motion respects reduced-motion preferences.
- Use visible state text and meaningful actions with PebbleState. Do not rely on color or artwork alone. Use TextBlock for inert untrusted text, not HTML evaluation.

## Application policy

These components own presentation, not authentication, authorization, workflow transitions, network calls, caches, validation schemas, or routing. Disabled controls and accessibility attributes are not security boundaries. The application owns pending state, retries, draft preservation, reset behavior, and safe error reporting; ErrorBoundary is not a catch-all for asynchronous/event-handler failures.

## Verification

Use your consuming application's checks. Exercise affected keyboard/focus flows, form behavior, both themes, narrow layouts, and reduced motion where relevant. Verify production CSS and asset base paths, not just a workspace preview. Do not rebuild this dependency merely to iterate on application UI. Source-checkout maintainer commands and catalog examples live in the private source repository (`AGENTS.md`, `apps/playground`, and `docs/`); they are not installed-package instructions.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Branding artwork is excluded from that grant; no artwork reuse or trademark permission is implied. Preserve dependency notices and the installed `@ljay/brand` provenance/font notices.
