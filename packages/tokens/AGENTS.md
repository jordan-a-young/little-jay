# Theme tokens

- Read `docs/BRANDING.md`. Approved sources are `source/palette.json` and `source/tokens.css`; keep them consistent. `theme.css` is generated, not a second hand-maintained palette.
- Change sources (or `scripts/build-tokens.mjs` when changing generation), then run `pnpm --filter @littlejay/tokens build`. Run `pnpm check` to verify freshness, lint, and formatting.
- Preserve existing `--lj-*` names, explicit light/dark scopes, and semantic feedback colors. Brand blue and primary action blue are intentionally different. Review foreground/background pairs together for contrast.
- Keep tokens framework-independent. `tailwind.css` maps semantic utilities; consumers may use `theme.css` without React or Tailwind. Do not import the approved source CSS alongside the generated theme.
- Rebuild downstream UI and check both themes for token changes; restart task-owned dev sessions instead of rebuilding beneath running consumers. There is no package-local test/typecheck script.
