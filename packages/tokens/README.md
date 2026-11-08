# @littlejay/tokens

Framework-independent CSS theme tokens prepared for public npm distribution. No React, JavaScript runtime entry point, or global reset is required. Public CSS/JSON subpaths are listed in [package.json](package.json); there is no root JavaScript import.

OpenCode and Codex: have the consuming project's `AGENTS.md` explicitly request this installed README for theme tasks. See the [shared setup/template](https://github.com/jordan-a-young/little-jay/blob/main/docs/CONSUMER-AGENTS.md); installation alone does not activate agent instructions.

## Imports

```css
@import "@littlejay/tokens/theme.css";

.application-panel {
  background: var(--lj-surface);
  color: var(--lj-content);
  border: 1px solid var(--lj-border);
}
```

Use a bundler that resolves package CSS imports, or copy the exported stylesheet through the application's asset pipeline. `@littlejay/tokens/palette.json` exposes the approved palette for tools that support JSON imports; import syntax depends on the tool/runtime. Do not import `source/tokens.css` alongside the generated theme or maintain a duplicate palette.

## CSS and theming

`theme.css` provides semantic `--lj-*` variables with light defaults and explicit `data-theme="light"` / `data-theme="dark"` scopes. The application selects/persists the theme; this package does not read system preferences or local storage. Override semantic properties after the theme stylesheet and under an appropriate theme/container selector. Brand blue and primary action blue intentionally differ.

`tailwind.css` is an optional Tailwind 4 `@theme inline` utility mapping, used alongside the theme in a Tailwind compilation; it is not standalone component CSS. Applications using `@littlejay/ui/styles.css` already get the theme and compiled components without installing Tailwind; do not add a second theme import merely to use UI components.

## Visual design principles

- Use semantic roles for hierarchy: background and surface group content; content and muted distinguish text emphasis; primary identifies deliberate action emphasis. Do not use a brand swatch as a substitute for an action or feedback role.
- Reuse established typography, spacing, alignment, and radius patterns in the consuming application. This package does not provide a complete typography/spacing scale or responsive layout system; do not invent token imports that are not in the installed CSS/exports.
- Preserve readable hierarchy, foreground/background contrast, and distinguishable control/state cues in light, dark, and nested themes. Pair color with text or another non-color cue, and check actual combinations after overrides.
- Let content and controls adapt to narrow space, long text, zoom, and text resizing; colors and tokens cannot solve layout or interaction accessibility on their own. Theme changes should not reset application drafts or focus. Design toward applicable WCAG 2.2 AA requirements without treating a palette as conformance evidence.

## Accessibility

Preserve foreground/background pairs and verify contrast in both themes after overrides. Tokens alone do not guarantee accessible names, focus behavior, semantics, reduced motion, or contrast for arbitrary combinations. Do not communicate status only by color.

## Optimization guidance

- Use CSS custom properties and `data-theme` scopes rather than duplicating palette values in JavaScript state or generating per-component inline themes. Keep preference selection/persistence app-owned; changing a theme does not require rerendering every component to pass color props.
- Load the theme once: standalone apps use `theme.css`, while `@littlejay/ui/styles.css` already includes it. Add the Tailwind mapping only to an existing Tailwind 4 build that needs those utilities. Do not add React, Tailwind or a runtime styling library just to consume tokens.
- Override semantic properties in application CSS instead of forking the palette or editing installed/generated files. Compare production CSS size and theme-switch rendering when optimizing; preserve nested scopes and foreground/background contrast in both themes.

## Application policy and verification

Tokens own presentation values, not theme preference storage, routing, network calls, or application policy. Use your application's production CSS build and test actual themed/nested layouts, keyboard focus, contrast, and narrow viewports. Do not hand-edit installed/generated token files to change application behavior. The source repository's `docs/BRANDING.md` describes maintainer generation; it is not shipped here.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). The code/documentation grant does not grant rights to Little Jay/Pebble artwork or trademarks; consult the installed `@littlejay/brand` README and notices before asset reuse.
