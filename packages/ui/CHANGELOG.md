# @littlejay/ui

## 0.2.0

### Minor Changes

- 6e435fc: Add PasswordField composed from Input and a native show/hide button, preserving Field associations, native refs/form values, selection and reset behavior, with reset-free responsive styles and root/subpath exports.
- 6885a6f: Add a local single-select Combobox with built-in search, popup and clear controls, Field associations, selected-ID form values, native input refs and reset-free themed styles, backed by React Aria Components.

  Preserve enclosing Dialogs when Escape dismisses an open descendant Combobox; a subsequent Escape retains normal modal dismissal.

- 6e435fc: Add lightweight native Table section, row, cell and caption helpers, plus an optional named keyboard-scrollable TableScroll wrapper, with reset-free theme styles and root/subpath exports.
- 9ec4796: Add a lightweight Card surface with optional CardHeader, CardContent and CardFooter helpers. All four components support native div props and refs through root and card subpath imports, with semantic-theme styling and no required Tailwind reset, implicit landmarks or interactive state.
- 6e435fc: Add router-independent Breadcrumb composition with a named navigation landmark, ordered list, decorative separators, plain current-page text, and reset-free wrapping styles.
- 9919700: Add optional `closeDisabled` and `closeLabel` props to `DialogContent`. The built-in action keeps its visible Close text and non-submit behavior; a supplied accessible label must be nonblank. Disabling Close does not prevent Escape or outside dismissal. Applications retain ownership of controlled state, dismissal callbacks, and pending policy.
- 9919700: Add optional `EmptyState.titleLevel` values from 1 through 6 to render a native heading without changing the title's component presentation. Omitting it preserves the existing strong title; unsupported JavaScript values safely fall back to strong. Heading hierarchy and announcements remain application-owned.

### Patch Changes

- 6885a6f: Add installed-package optimization guidance and a shared OpenCode/Codex consumer setup reference. Document CSS and component reuse, local React state and retained tab effects, bounded requests and cache ownership, server lifecycle and probe costs, and selective asset delivery. Performance recommendations require representative measurements and preserve accessibility, validation, safe diagnostics, and artwork rights. No runtime APIs or behavior change.
- cf6055d: Give every Button variant a reset-free border and token-aware typography baseline, including scoped `--lj-font-sans` overrides. Make native Checkbox rendering follow the active semantic color scheme in nested light/dark sections. Native control, form, ref and accessibility behavior is unchanged; no Tailwind installation or application reset is required.
- 6885a6f: Preserve native `hidden` behavior for Input, Textarea, NativeSelect, Switch, LoadingIndicator, IconButton, and StatusIndicator without requiring a consumer CSS reset. Showing a component again restores its default display without remounting it.
- 6885a6f: Include PebbleState's illustration spacing in the compiled stylesheet so consumers retain the intended gap between the image and heading without compiling Tailwind themselves.
- Updated dependencies [6885a6f]
  - @littlejay/tokens@0.1.1
  - @littlejay/brand@0.1.1

## 0.1.0

### Minor Changes

- Initial release of the Little Jay libraries: canonical branding assets, semantic theme tokens, accessible React controls, bounded JSON transport, and opt-in Fastify foundations. Applications retain state, validation, authorization, asset serving, and lifecycle policy. Branding artwork remains excluded from the code/documentation MIT license; preserve the packaged provenance and font notices.

### Patch Changes

- Updated dependencies
  - @littlejay/brand@0.1.0
  - @littlejay/tokens@0.1.0
