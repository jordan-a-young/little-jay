# @littlejay/ui

ESM React 19 components prepared for public npm distribution. React and React DOM `^19.0.0` are peer dependencies; use the same React installation as the application. Consume only the public exports in [package.json](package.json), not `src` or hashed build chunks. No CommonJS entry point is provided.

## Imports

Root and component subpath imports expose the same components and types:

```tsx
import { Button, Field, Input } from "@littlejay/ui";
import { LoadingIndicator } from "@littlejay/ui/loading-indicator";
import "@littlejay/ui/styles.css";

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

Load `@littlejay/ui/styles.css` once at the application entry. It contains compiled component utilities and the semantic theme: **no Tailwind installation or global reset is required**. The optional `@littlejay/ui/theme.css` is theme-only; `@littlejay/ui/tailwind.css` supplies mappings for apps already using Tailwind 4, not a replacement for compiled component CSS.

Use `data-theme="light"` or `data-theme="dark"` on the document root or a subtree. The application owns preference persistence and system-theme selection. Override semantic `--lj-*` properties after the library stylesheet, scoped to the relevant theme/container; review foreground/background contrast together. Brand blue is not the primary action color. For locally themed dialogs, place the portal in the themed subtree using `portalContainer`; document-root themes inherit normally.

PebbleState needs application-served assets. Copy the state PNGs from the installed `@littlejay/brand/states/manifest.json` into your own public asset pipeline, preserving names and proportions. Pass a deployment-aware `assetBaseUrl` ending in `/` (for example `/my-app/branding/`, with images under `states/`). The library does not copy assets or infer the app base URL. Artwork has separate reserved rights; read the installed brand README before reuse.

## Accessibility

- Give controls visible labels. Field associates exactly one supported labelable control with its label, description, and error; put its ID on Field, not the child. Native form semantics/ref props remain available. Button defaults to `type="button"`; opt into submission explicitly.
- IconButton requires a meaningful `label`. DialogContent requires a nonblank visible `title`; optional `description` explains the task. Preserve modal focus trapping, Escape dismissal, and trigger focus restoration. Use `variant="sheet"` for a sheet, not a second modal system.
- Alert `onDismiss` is optional and caller-owned: update visibility and restore appropriate focus yourself. `dismissLabel` defaults to `"Dismiss alert"`. Choose announcement roles for context; do not use an urgent alert for routine status.
- LoadingIndicator's `label` is optional. Omitted/blank text retains hidden `"Loading"` text; the application owns live announcements and `aria-busy` on the affected region. Its motion respects reduced-motion preferences.
- Use visible state text and meaningful actions with PebbleState. Do not rely on color or artwork alone. Use TextBlock for inert untrusted text, not HTML evaluation.

## Application policy

These components own presentation, not authentication, authorization, workflow transitions, network calls, caches, validation schemas, or routing. Disabled controls and accessibility attributes are not security boundaries. The application owns pending state, retries, draft preservation, reset behavior, and safe error reporting; ErrorBoundary is not a catch-all for asynchronous/event-handler failures.

## Switch

`Switch` and `SwitchProps` are available from `@littlejay/ui` and `@littlejay/ui/switch`. Load the compiled stylesheet as above.

```tsx
import { Field, Switch } from "@littlejay/ui";

<Field label="Enable notifications" orientation="horizontal">
  <Switch name="notifications" defaultChecked />
</Field>;
```

This is a native checkbox with fixed `role="switch"`: Space or clicking the label toggles it. Keep the label stable and describe the setting, not the current state. Use `checked` with `onChange={(event) => setEnabled(event.currentTarget.checked)}` for controlled state, or `defaultChecked` for uncontrolled state. Native input props, ref, required, disabled, Field descriptions/errors, form reset and submission are supported. Unchecked/disabled controls are omitted from FormData; the default submitted value is `"on"`. Controlled reset and any persistence or side effects are application-owned. Do not set a separate `aria-checked`; the native checked state supplies it. Use Checkbox for selection/consent rather than an on/off setting.

## Tabs

`Tabs`, `TabsProps`, and `TabsItem` are available from the root and `@littlejay/ui/tabs`:

```tsx
import { Tabs } from "@littlejay/ui/tabs";
import "@littlejay/ui/styles.css";

export function DocumentViews() {
  return (
    <Tabs
      label="Document views"
      items={[
        {
          value: "draft",
          label: "Draft",
          content: <input aria-label="Draft notes" defaultValue="Unsaved notes" />,
        },
        { value: "preview", label: "Preview", content: <p>Local preview</p> },
        { value: "unavailable", label: "Unavailable", content: null, disabled: true },
      ]}
    />
  );
}
```

Items need stable, unique, nonblank string values and meaningful, noninteractive labels. `label` is the required nonblank accessible tab-list name. `defaultValue` sets uncontrolled initial selection; `value` and `onValueChange` support caller-controlled selection. Missing/removed/disabled selections display the first enabled item without a callback; empty/all-disabled lists have no selected panel. Fallback does not overwrite the requested value, so keep controlled values valid when they have domain meaning.

Horizontal Left/Right arrows wrap through enabled tabs (mirrored in RTL); Home/End move focus to the ends. **Activation is manual**: Enter/Space or click selects a panel. Tab enters the list once and can continue to the named, focusable panel; Up/Down retain native behavior. Triggers never submit a form. External selection changes do not move focus; the application owns focus recovery if it hides focused content.

Content mounts on first activation and stays mounted, hidden when inactive, while its item remains. Hidden content is removed from the keyboard/accessibility flow, but effects keep running: applications own pausing requests/timers and remeasuring canvases on visibility changes. Removing an item unmounts its content. No URL routing, graph-node selection, automatic activation, or responsive breakpoint policy is added. Styling requires the same compiled stylesheet and semantic theme as other components.

## Verification

Use your consuming application's checks. Exercise affected keyboard/focus flows, form behavior, both themes, narrow layouts, and reduced motion where relevant. Verify production CSS and asset base paths, not just a workspace preview. Do not rebuild this dependency merely to iterate on application UI. Source-checkout maintainer commands and catalog examples live in the private source repository (`AGENTS.md`, `apps/playground`, and `docs/`); they are not installed-package instructions.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Branding artwork is excluded from that grant; no artwork reuse or trademark permission is implied. Preserve dependency notices and the installed `@littlejay/brand` provenance/font notices.
