# @littlejay/ui

ESM React 19 components prepared for public npm distribution. React and React DOM `^19.0.0` are peer dependencies; use the same React installation as the application. Consume only the public exports in [package.json](package.json), not `src` or hashed build chunks. No CommonJS entry point is provided.

OpenCode and Codex: have the consuming project's `AGENTS.md` explicitly request this installed README for UI tasks. See the [shared setup/template](https://github.com/jordan-a-young/little-jay/blob/main/docs/CONSUMER-AGENTS.md); installation alone does not activate agent instructions. Read [Optimization guidance](#optimization-guidance) before tuning application usage.

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

Button supplies its own border reset and typography baseline (1rem text, 1.5 line height, medium weight) in every variant. Its font family follows `--lj-font-sans`, including scoped overrides. Checkbox keeps native rendering and follows `--lj-color-scheme` in the nearest light/dark theme scope, including nested opposite-theme sections. Neither control sets the application's native theme preference policy.

PebbleState needs application-served assets. Copy the state PNGs from the installed `@littlejay/brand/states/manifest.json` into your own public asset pipeline, preserving names and proportions. Pass a deployment-aware `assetBaseUrl` ending in `/` (for example `/my-app/branding/`, with images under `states/`). The library does not copy assets or infer the app base URL. Artwork has separate reserved rights; read the installed brand README before reuse.

## UI and UX design principles

- Start with the person's task and reuse existing controls before adding a new interaction. Keep primary emphasis selective, group related content with consistent spacing/alignment, and use meaningful headings and readable typography. Containers do not choose your page's heading levels or landmarks.
- Style through semantic tokens and established application patterns; do not introduce one-off colors, a second theme, or decorative containers for every section. Preserve hierarchy, contrast, and state cues in both themes. Brand color is not automatically an action color.
- Prefer native semantics and predictable interaction. Provide visible labels, usable separated targets, keyboard access, visible focus, and appropriate restoration. Design toward applicable WCAG 2.2 AA requirements; components and tokens alone do not establish application conformance.
- Design the relevant pending, empty, success, error, selected, disabled, and read-only experiences, not only the default screenshot. Use text rather than color alone, distinguish background refresh/cached data from initial loading, preserve drafts, and provide clear recovery without exposing diagnostics. Choose announcements deliberately to avoid duplicate or unnecessary alerts.
- Use concise, specific action labels and consistent terminology. Explain constraints and destructive consequences; confirmation/undo remains application-owned and is never authorization. Disclose secondary detail progressively without hiding essential information or actions.
- Adapt to narrow space, long content, zoom/text resizing, and reduced motion without losing information or essential controls. Use deliberate accessible overflow where needed. Theme/layout changes should not unexpectedly reset drafts, selection, or focus; hidden content may still have running effects.

These are usage principles, not additional automatic behavior or new component props. The application owns composition, content, state transitions, recovery, and verification; preserve the documented contract of each component.

## Accessibility

- Give controls visible labels. Field associates exactly one supported labelable control with its label, description, and error; put its ID on Field, not the child. Native form semantics/ref props remain available. Button defaults to `type="button"`; opt into submission explicitly.
- IconButton requires a meaningful `label`. DialogContent requires a nonblank visible `title`; optional `description` explains the task. Preserve modal focus trapping, Escape dismissal, and trigger focus restoration. Use `variant="sheet"` for a sheet, not a second modal system.
- Alert `onDismiss` is optional and caller-owned: update visibility and restore appropriate focus yourself. `dismissLabel` defaults to `"Dismiss alert"`. Choose announcement roles for context; do not use an urgent alert for routine status.
- LoadingIndicator's `label` is optional. Omitted/blank text retains hidden `"Loading"` text; the application owns live announcements and `aria-busy` on the affected region. Its motion respects reduced-motion preferences.
- Use visible state text and meaningful actions with PebbleState. Do not rely on color or artwork alone. Use TextBlock for inert untrusted text, not HTML evaluation.

## Application policy

These components own presentation, not authentication, authorization, workflow transitions, network calls, caches, validation schemas, or routing. Disabled controls and accessibility attributes are not security boundaries. The application owns pending state, retries, draft preservation, reset behavior, and safe error reporting; ErrorBoundary is not a catch-all for asynchronous/event-handler failures.

## Link and ButtonLink

Use `Link` for inline navigation and `ButtonLink` when navigation needs button-style emphasis. Both render native anchors, require `href`, and are available from the root or their `@littlejay/ui/link` and `@littlejay/ui/button-link` subpaths.

```tsx
import { Link, ButtonLink } from "@littlejay/ui";

<Link href="/projects" aria-current="page">
  Projects
</Link>;
<ButtonLink href="/projects/new" variant="secondary">
  New project form
</ButtonLink>;
```

Native anchor attributes, refs, `className` and `style` are forwarded. `ButtonLink` uses the same `ButtonVariant` choices as Button, defaulting to `primary`; `Link` inherits surrounding typography. Compiled reset-free CSS supplies semantic colors, visible focus and long-label wrapping while preserving native `hidden` behavior.

Enter, modified/middle clicks, `target`, `rel` and `download` keep native browser behavior. There is no button role, synthetic Space activation, disabled/loading-link API or router adapter. Applications own routing, destinations and `aria-current`; use Button for actions. Visual variants do not supply confirmation or authorization.

## Dialog

`Dialog`, `DialogTrigger`, `DialogContent`, `DialogClose` and their Props types are available from the root or `@littlejay/ui/dialog`. Content requires a nonblank visible `title`; an optional `description` explains the task. The built-in Close action remains visible and non-submit by default.

```tsx
import { Dialog, DialogTrigger, DialogContent } from "@littlejay/ui/dialog";

<Dialog>
  <DialogTrigger>Review local changes</DialogTrigger>
  <DialogContent title="Local review" closeDisabled closeLabel="Close local review">
    This example disables only the built-in Close action.
  </DialogContent>
</Dialog>;
```

Dialog uses the existing React Aria foundation for modal focus containment, background isolation, scroll locking and nested overlay ordering. This increment targets Chromium browsers; iOS, Safari and WebKit are unsupported. Use `open`/`onOpenChange` for controlled state or `defaultOpen` for uncontrolled state. Closing unmounts content: lift drafts/selections into application state when they must survive reopening. `variant="sheet"` changes layout, not modal behavior. No animation is added.

`closeDisabled` defaults to `false` and disables only the built-in action. `closeLabel` supplies its nonblank accessible name while visible text stays “Close”; omit it for the native name. `dismissOnEscape` and `dismissOnOutsidePress` both default to `true` independently of Close. For pending work, set the relevant flags to `false` and guard controlled `onOpenChange`; `DialogClose` buttons need their own `disabled` prop. Keep a reachable recovery action. Pending state, cancellation, persistence and authorization remain application-owned.

Content's native section props, `ref` (`HTMLElement`), `className` and `style` target the named dialog, not its overlay. Keep `portalContainer` mounted inside the intended theme scope; the default destination is `document.body`. A Combobox popup inside a Dialog needs its own `portalContainer` inside the content. The first Escape closes open options, the next follows `dismissOnEscape`.

Initial focus defaults to the dialog section; a descendant's native `autoFocus` can select the initial control. React Aria restores focus to the previously focused control, including controlled opening without `DialogTrigger` and whole-Dialog removal. Focus the actual opening control before setting `open` and keep it connected where practical. There is no custom target/lifecycle override prop. If an application removes that origin, a **surviving application owner** must recover otherwise-lost focus after committed teardown. For example, with current opener/fallback refs and application-owned `open`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, DialogContent } from "@littlejay/ui";

export function LocalFocusRecovery() {
  const [open, setOpen] = useState(false);
  const [hasOpener, setHasOpener] = useState(true);
  const opener = useRef<HTMLButtonElement>(null);
  const fallback = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open && document.activeElement === document.body) {
      (opener.current ?? fallback.current)?.focus();
    }
    wasOpen.current = open;
  }, [open]);
  return (
    <>
      <Button ref={fallback}>Refresh</Button>
      {hasOpener && (
        <Button
          ref={opener}
          onClick={(event) => {
            event.currentTarget.focus();
            setOpen(true);
          }}
        >
          Review local item
        </Button>
      )}
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent title="Local focus recovery">
            <Button
              onClick={() => {
                setHasOpener(false);
                setOpen(false);
              }}
            >
              Simulate removing the opener and close
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

Keep this passive effect in the surviving owner, not inside conditionally removed Dialog content. Modal background-inert cleanup must run before attempting focus; a layout effect can run too early while the fallback is still inert. Resolve a connected, usable card-or-fallback target from the latest application state; skip recovery when reopened or meaningful external focus already exists. Do not schedule an unconditional delayed focus override or use upstream private restoration events. The library cannot guarantee fallback recovery when that application owner also disappears.

The current portal adapter uses React Aria Components' public but deprecated `UNSTABLE_portalContainer` internally. Little Jay does not expose that vendor prop; a future upstream change may require an adapter migration. Keep a scoped portal/theme regression when updating React Aria.

### Content Security Policy

Load `@littlejay/ui/styles.css` as external compiled CSS. React Aria also inserts runtime style elements (including press/scroll-lock support). Under a restrictive CSP, the **application server** must generate a fresh cryptographically random style nonce per HTML response, authorize that nonce in the response header, and expose the same value before any React Aria component mounts:

```html
<meta property="csp-nonce" content="SERVER_GENERATED_NONCE" />
```

The matching header includes `style-src 'self' 'nonce-SERVER_GENERATED_NONCE'`; if a more-specific `style-src-elem` directive is present, it must authorize the nonce too. Keep `script-src 'self'` with external scripts. Do not use the placeholder literally, reuse a fixed nonce, authorize scripts with it, add `unsafe-inline`, or patch dependencies. For example, a Node server can generate the value with `randomBytes(32).toString("base64")` from `node:crypto`. Bind header and meta in the same response and prevent caches from replaying stale HTML/nonces (for example, `Cache-Control: no-store`). Preserve the application's other CSP directives and request protections. Little Jay does not generate a nonce or change server policy.

This is **nonce-authorized styling, not literal `style-src 'self'` compatibility**. Missing or mismatched nonces remain blocked by the browser. Verify the real response policy, applied style sheets and CSP violations with mounted components and an open modal, not rendering alone. See [React Aria CSP guidance](https://react-spectrum.adobe.com/react-aria/ssr.html#content-security-policy).

### Migration from the Radix-backed Dialog

Public component names stay the same, but vendor-derived props and lifecycle callbacks are removed. Replace `onEscapeKeyDown`/`onInteractOutside` vetoes with `dismissOnEscape`/`dismissOnOutsidePress` and controlled state. `onOpenAutoFocus`, `onCloseAutoFocus`, `onPointerDownOutside` and `onFocusOutside` are not public contracts. Content refs now target a section (`HTMLElement`), not a div. Load the matching compiled CSS; do not depend on vendor data attributes or internal wrapper markup.

## EmptyState

`EmptyState` and `EmptyStateProps` are available from the root or `@littlejay/ui/empty-state`. The title defaults to the existing `strong` element. Set `titleLevel` to an integer from 1 through 6 to render that native heading directly, without nesting a heading inside `strong`:

```tsx
import { EmptyState } from "@littlejay/ui/empty-state";

<EmptyState titleLevel={2} title="No checkpoints yet">
  Start a local task to create its first checkpoint.
</EmptyState>;
```

Choose the level for the surrounding document hierarchy; it changes semantics, not presentation size. No arbitrary element/component polymorphism, automatic heading-level selection or announcement role is added. Root native attributes, refs, `className` and `style` still target the wrapper. Title/body/actions remain ordinary React content; application state, data loading and meaningful actions stay consumer-owned.

## Combobox

`Combobox`, `ComboboxProps` and `ComboboxOption` are available from the root and `@littlejay/ui/combobox`. It is a searchable local single-select backed by React Aria Components. Keep NativeSelect for small lists that do not need search. Load the compiled stylesheet once:

```tsx
import { Combobox, Field } from "@littlejay/ui";
import "@littlejay/ui/styles.css";

const projects = [
  { value: "atlas", label: "Atlas" },
  { value: "cedar", label: "Cedar" },
  { value: "unavailable", label: "Unavailable", disabled: true },
];

<Field label="Choose a project" required>
  <Combobox name="project" options={projects} defaultValue="cedar" />
</Field>;
```

Options are `readonly { value: string; label: string; disabled?: boolean }[]`. Values must be unique; labels must be nonblank. Duplicate labels are allowed. An empty string ID is distinct from no selection (`null`), although both serialize as an empty form value. Use `value` and `onValueChange: (value: string | null) => void` for caller-owned selection, or `defaultValue` for uncontrolled selection. The editable query is internal: it filters labels, never creates an option or becomes the submitted value. Unknown/removed IDs display no selection and serialize as empty; a disabled selected option stays visible but is omitted from FormData. No first-option fallback is added.

The input, clear action and caret share one field border; input text reserves space for both icons. Typing filters, arrows explore, Enter selects, Escape restores the selected label and dismisses, and Tab commits a focused option or restores the label while leaving normally. The input retains focus during option navigation. Native editing, clipboard and IME handling remain available. Clear selects `null` and returns focus to the input; emptying the input also requests `null`. Only actual selection changes call `onValueChange`, not queries or native resets.

Field owns the input ID, label, messages and default required/invalid/disabled flags; explicit flags override those defaults. Without Field, provide `aria-label` or `aria-labelledby`. Native input props, `ref`, `className` and `style` target the input, not the wrapper; selection/query/combobox ARIA attributes are reserved. Built-in non-submit actions have independent nonblank `triggerLabel` / `clearLabel` names (defaults “Show options” / “Clear selection”). `emptyMessage` defaults to “No matching options.” and `requiredMessage` to “Choose an available option.” Disabled controls/fieldsets are inert and omitted from FormData; read-only choices remain submitted but cannot be edited or cleared. `hidden` hides the complete composition and closes its popup.

`name` and optional native `form` associate one hidden selected-ID input with the form; the visible label/query is not named. Required validation requires an available selection, not merely nonempty search text. Field errors remain accessibility/presentation flags rather than native custom errors. An uncancelled current-form reset restores the uncontrolled default and closes the popup without calling `onValueChange`; cancelled/unrelated resets retain selection/query. Controlled reset policy remains application-owned. Reset settles after event dispatch in a microtask and React's update: do not read FormData synchronously immediately after `form.reset()`; wait for the rendered reset state. Application/server validation remains necessary.

The popup portals to the document by default. For subtree themes or an enclosing Dialog, pass an element inside that theme/modal as `portalContainer`; keep it mounted while the popup is open. Document-root themes inherit normally. Remote search, freeform creation, multi-select, grouping and virtualization are not included; option data, requests, announcements beyond the control's accessibility behavior and workflow policy remain caller-owned.

When a controlled selection changes externally, its new label replaces any old search query. Ordinary rerenders with the same selection preserve typing. Input width/maxWidth constraints retain embedded icon alignment and determine popup width; use a shrinkable parent on narrow layouts.

Inside the shared Dialog, the first Escape dismisses an open Combobox and restores its selected label while keeping modal focus and local drafts. A subsequent Escape follows `dismissOnEscape`. Keep the popup's `portalContainer` inside the modal content. Restrictive CSP applications need the nonce setup described under Dialog even when a Combobox is mounted without a modal.

## NumericInput

`NumericInput` and `NumericInputProps` are available from the root and `@littlejay/ui/numeric-input`. It composes the existing Input as a native number control for integer settings; values and application saves are separate:

```tsx
import { Field, NumericInput } from "@littlejay/ui";
import "@littlejay/ui/styles.css";

<Field label="Duration in seconds" required>
  <NumericInput name="duration" defaultValue={30} min={5} max={3600} step={1} />
</Field>;
```

Supply `value` for a caller-owned committed integer or `defaultValue` for an uncontrolled initial/reset integer. Native `onChange` observes editing events; `onValueChange` requests a valid changed integer only when the input blurs or Enter commits. Empty, invalid, fractional, step-mismatched or out-of-range commits restore the last committed value instead of truncating or clamping it. Restoration, unchanged commits, resets and external prop changes do not request a new number. A numeric commit is not persistence, domain validation or server authorization.

Exactly one of `value` or `defaultValue` is required. Values and bounds must be safe integers, `min` must not exceed `max`, and `step` must be a positive safe integer (default `1`); unsupported configuration throws a `TypeError`. Do not switch controlled/uncontrolled mode. Native step validation uses `min`, otherwise the input's value attribute, otherwise zero as its base; supply `min` when a stable step grid matters. An externally supplied integer remains authoritative even when it is outside the current constraints; the native input then reports invalid rather than silently correcting application state.

Normal numeric editing can be temporarily empty. Unrelated renders with the same controlled number preserve the draft; a genuinely changed number is authoritative and replaces it. Browser number controls may reject or normalize incomplete numeric text; this is not an arbitrary-text buffer. Native bounds and integer step validity still apply. Keep drafts, application errors, committed values and saved server values conceptually separate.

A controlled callback requests a commit: echo its number through `value` to acknowledge it. Until then, the candidate stays displayed across same-value renders and Enter followed by blur does not duplicate the request. An invalid later commit restores the actual parent-committed number. Native `onBlur` and `onKeyDown` run before internal commit handling; `preventDefault()` opts out of that commit, not native focus movement. Enter's submission default is preserved, and composition Enter does not commit. Caller-owned custom validity is not cleared.

The ref, `className`, `style`, ID, `name`, `form` and native events target the actual number input. Field provides the label, description/error associations and default required/disabled/invalid flags. Native spinbutton keyboard behavior, disabled fieldsets and read-only submission remain platform-owned. Uncancelled reset restores the uncontrolled default or current controlled value; cancelling a reset preserves the draft. Applications may deliberately change their controlled value in `onReset`.

`disableWheelChange` defaults to `false`. Opting in cancels vertical wheel defaults over the focused, editable, effectively enabled input without blurring it. **This also stops page scrolling over that input.** Scrolling elsewhere remains native; Ctrl-wheel zoom and horizontal-only wheel events are not intercepted. React `onWheel` still runs and observes the native cancellation. Reset settles after event dispatch in a microtask; inspect reset FormData after that work has settled.

## PasswordField

`PasswordField` and `PasswordFieldProps` are available from the root and `@littlejay/ui/password-field`. It composes Input with a native non-submit Button; the input starts masked. Load the stylesheet once:

```tsx
import { Field, PasswordField } from "@littlejay/ui";
import "@littlejay/ui/styles.css";

<Field label="Password" description="Use the password for this account.">
  <PasswordField name="password" autoComplete="current-password" />
</Field>;
```

Use `autoComplete="new-password"` when creating a new password. Autocomplete intent, value/defaultValue/onChange, constraints and authentication are caller-owned; no default autocomplete policy, value store, strength score, logging, persistence, clipboard interception or network call is added. `type` is fixed by visibility and excluded from the public props. All other native input props are forwarded; `ref`, `className` and `style` target the input, not its wrapper. `hidden` hides the entire input/action composition.

Optional nonblank `showLabel` / `hideLabel` strings default to “Show password” / “Hide password” and supply visible, changing action names. The button uses `aria-controls` for the input and no `aria-pressed` alongside the changing name. Generated IDs work standalone; a Field owns the input ID, label, description/error associations and default required/invalid/disabled flags. The auxiliary action has its own name rather than consuming the Field association. Explicit native flag overrides follow Input's rules. Disabled inputs/Field defaults and native disabled fieldsets keep the reveal action inert; read-only inputs can still be revealed.

The same input, name, value and selection range/direction survive visibility changes. The component does not programmatically move focus: keyboard activation keeps button focus, and pointer focus follows native browser behavior. Long labels and narrow layouts wrap instead of overlapping the input. Ref exposes the native input for application focus/selection policy.

An uncancelled native form reset re-masks the input and restores uncontrolled native defaults. Explicit `form` association is respected; unrelated and cancelled resets do not change visibility. Controlled values and controlled reset handling remain with the application. Reveal state is local and resets on unmount. These are presentation semantics, not authentication or authorization; validate submitted credentials on the server and do not expose real credentials in examples or diagnostics.

## Breadcrumb

`Breadcrumb` (`nav`), `BreadcrumbList` (`ol`), `BreadcrumbItem` (`li`), `BreadcrumbSeparator` (`span`) and `BreadcrumbPage` (`span`), with matching `*Props` types, are available from the root and `@littlejay/ui/breadcrumb`:

```tsx
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@littlejay/ui/breadcrumb";
import "@littlejay/ui/styles.css";

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <a href="/">Home</a>
    </BreadcrumbItem>
    <BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbPage>Current page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>;
```

Breadcrumb defaults to `aria-label="Breadcrumb"`; give multiple breadcrumb landmarks distinct names with `aria-label` or `aria-labelledby`. Other native props, refs and additive `className` are forwarded. BreadcrumbList retains `role="list"` with its reset-free marker-free styles. Labels wrap, and native ancestor links receive a visible focus outline in both themes.

Supply exactly one BreadcrumbPage per breadcrumb. It fixes `aria-current="page"` on plain text and adds no link, disabled-link semantics or keyboard stop. Put a decorative BreadcrumbSeparator inside each item except the first; it fixes `aria-hidden="true"` and defaults to `/`. Custom separator children must be noninteractive and decorative. Keeping separators inside items avoids extra list entries. Helpers require no provider or generated hierarchy; omit links/separators for a single current item.

Use native anchors or your application's router-aware links directly as children. Supply real ancestor URLs and ensure ancestor links do not mark themselves as the current page (some routers do this automatically). Routing, hierarchy, focus, history and any collapsing/menu behavior stay application-owned. No router dependency, click handling or state is added. Keep injected HTML restricted to trusted content, as with native elements; ordinary string children are escaped by React.

## Table

`Table`, `TableHeader` (`thead`), `TableBody` (`tbody`), `TableFooter` (`tfoot`), `TableRow` (`tr`), `TableHead` (`th`), `TableCell` (`td`), `TableCaption` (`caption`) and `TableScroll` (`div`) are available from the root and `@littlejay/ui/table`, with matching `*Props` types. Native props, refs and additive `className` are forwarded. Load the compiled reset-free stylesheet once:

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableScroll,
} from "@littlejay/ui/table";
import "@littlejay/ui/styles.css";

<TableScroll aria-label="Draft summary">
  <Table>
    <TableCaption>Local drafts</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Draft</TableHead>
        <TableHead>State</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableHead scope="row">Notes</TableHead>
        <TableCell>Unsaved</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</TableScroll>;
```

`TableHead` defaults to `scope="col"`; use `scope="row"` for row headers and native `id`/`headers` associations for more complex tables. Captions, spans, ordering and child buttons/links remain native. No grid role, row selection, focus management or sorting keyboard model is added. Do not make an entire row clickable instead of supplying real controls.

`TableScroll` is optional and separate from Table. It requires a nonblank `aria-label` or `aria-labelledby` (blank/missing names throw), fixes `role="region"` and `tabIndex={0}`, and provides a visible focus outline and horizontal overflow. Referenced label IDs must exist. The table itself is not a tab stop. Use caller-owned widths such as `style={{ minWidth: "36rem" }}` when columns need horizontal scrolling; place the wrapper in a shrinkable parent. Default cells wrap long text, with no imposed column minimum. Section helpers do not require a provider, and using Table does not create a wrapper automatically.

Data, empty/loading/error content, announcements, requests, pagination and any future sorting/filtering engine remain application-owned. Use an ordinary `TableCell colSpan={columnCount}` for caller-owned empty content. No TanStack dependency is installed or required. Native HTML injection props, if used, require trusted content just as native elements do; ordinary string children are escaped by React.

## Card

`Card`, `CardHeader`, `CardContent` and `CardFooter`, with matching `*Props` types, are available from the root and `@littlejay/ui/card`. All render native divs with forwarded props/ref/className. Import the compiled stylesheet once:

```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@littlejay/ui/card";
import { Button } from "@littlejay/ui/button";
import "@littlejay/ui/styles.css";

export function DraftCard() {
  return (
    <Card>
      <CardHeader>
        <h2>Draft notes</h2>
      </CardHeader>
      <CardContent>Local content supplied by your application.</CardContent>
      <CardFooter>
        <Button>Inspect</Button>
      </CardFooter>
    </Card>
  );
}
```

Card supplies a semantic surface/background, content color, border, radius and long-text wrapping, but no root padding. Each optional helper adds 1rem padding; Footer lays out children in a wrapping flex row. Use only the sections you need, such as `<Card><CardContent>Content</CardContent></Card>`. The helpers need no provider and do not create headings or header/footer landmarks. Supply an appropriate heading level; add a named region only when the content merits one. Native child-element margins remain caller-owned, including in applications without a reset.

There is no card-wide click target, tab stop, loading state or implicit role. Put real buttons/links inside rather than making the surface an inaccessible action or wrapping nested controls in a link. Application state, layout width, focus and actions stay with the caller. Native `hidden` is preserved, including on the flex footer; hidden actions are excluded from keyboard navigation. Keep native HTML injection props restricted to trusted content, just as for a native div; ordinary string children are escaped by React.

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

## Optimization guidance

- Reuse the public components before introducing another control/modal library. Root and subpath imports are supported; subpaths make dependencies explicit but do not guarantee a smaller bundle. Compare the consuming application's production output before claiming tree-shaking or size improvements. Preserve CSS side effects.
- Import compiled `styles.css` once at the app entry. It already includes the default theme; do not install Tailwind, scan this package's source, add a second theme import, or rebuild the dependency just to render components. Change application styling through semantic tokens and app-owned CSS, not installed files.
- Keep controlled state close to the affected controls; prefer native uncontrolled inputs when the application does not need per-keystroke state. Avoid copying props into state, effects for derived values, and blanket memoization. Profile a real interaction before adding memo/useMemo/useCallback or a global store; preserve form resets and drafts.
- Tabs mounts each panel on first activation and retains visited panels. Hidden panels still run effects: pause application subscriptions, timers, queries and expensive visualizations when inactive, and remeasure on visibility changes. Do not assume hidden means unmounted or discard user state merely to reduce renders.
- Scope data subscriptions and ErrorBoundary reset keys to the owning view, not a frequently changing event cursor. For large tables, measure rendering and use application-owned pagination/windowing only when justified; preserve native table semantics, names and keyboard access.
- Compare production bundle/CSS size, React commit/render behavior, or interaction latency under the same workload as relevant. Optimization must retain accessible labels, focus/restoration, announcements, both themes, narrow layouts and reduced motion; disabled UI is never authorization.

## Verification

Use your consuming application's checks. Exercise affected keyboard/focus flows, form behavior, both themes, narrow layouts, and reduced motion where relevant. Verify production CSS and asset base paths, not just a workspace preview. Do not rebuild this dependency merely to iterate on application UI. Source-checkout maintainer commands and catalog examples live in the source repository (`AGENTS.md`, `apps/playground`, and `docs/`); they are not installed-package instructions.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). Branding artwork is excluded from that grant; no artwork reuse or trademark permission is implied. Preserve dependency notices and the installed `@littlejay/brand` provenance/font notices.
