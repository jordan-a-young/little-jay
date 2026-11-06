# @ljay/tokens

Private, framework-independent CSS theme tokens. No React, JavaScript runtime entry point, or global reset is required. Public CSS/JSON subpaths are listed in [package.json](package.json); there is no root JavaScript import.

## Imports

```css
@import "@ljay/tokens/theme.css";

.application-panel {
  background: var(--lj-surface);
  color: var(--lj-content);
  border: 1px solid var(--lj-border);
}
```

Use a bundler that resolves package CSS imports, or copy the exported stylesheet through the application's asset pipeline. `@ljay/tokens/palette.json` exposes the approved palette for tools that support JSON imports; import syntax depends on the tool/runtime. Do not import `source/tokens.css` alongside the generated theme or maintain a duplicate palette.

## CSS and theming

`theme.css` provides semantic `--lj-*` variables with light defaults and explicit `data-theme="light"` / `data-theme="dark"` scopes. The application selects/persists the theme; this package does not read system preferences or local storage. Override semantic properties after the theme stylesheet and under an appropriate theme/container selector. Brand blue and primary action blue intentionally differ.

`tailwind.css` is an optional Tailwind 4 `@theme inline` utility mapping, used alongside the theme in a Tailwind compilation; it is not standalone component CSS. Applications using `@ljay/ui/styles.css` already get the theme and compiled components without installing Tailwind; do not add a second theme import merely to use UI components.

## Accessibility

Preserve foreground/background pairs and verify contrast in both themes after overrides. Tokens alone do not guarantee accessible names, focus behavior, semantics, reduced motion, or contrast for arbitrary combinations. Do not communicate status only by color.

## Application policy and verification

Tokens own presentation values, not theme preference storage, routing, network calls, or application policy. Use your application's production CSS build and test actual themed/nested layouts, keyboard focus, contrast, and narrow viewports. Do not hand-edit installed/generated token files to change application behavior. The private source repository's `docs/BRANDING.md` describes maintainer generation; it is not shipped here.

## License

Project-authored code and documentation are covered by [MIT](LICENSE). The code/documentation grant does not grant rights to Little Jay/Pebble artwork or trademarks; consult the installed `@ljay/brand` README and notices before asset reuse.
