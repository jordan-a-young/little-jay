# UI wrapping and forced-colors implementation plan

**Goal:** Address #73's Field-label and Alert-title wrapping gaps and investigate/fix #74's Combobox active-option forced-colors visibility.

**Architecture:** Use local semantic label/title classes and reset-free CSS rather than component API changes. Keep native associations, focus, dismissal and selection logic unchanged. Change forced-colors styling only after real-browser reproduction.

**Tech Stack:** React 19, TypeScript, Vite+ tests, Node 26.13.1, pnpm 12.18.0, public npm registry, isolated Chrome DevTools Protocol verification.

## Design decisions and success criteria

- Existing consumers with long identifiers or localized compound words benefit without new props or dependencies. Wrapping is presentation owned by UI; application copy and state remain caller-owned.
- Field labels shrink and break long tokens in vertical and horizontal layout; Switch/Checkbox retain native label activation and usable focus.
- Alert titles wrap without painting over Close; dismissal remains a non-submit request with caller-owned visibility/focus.
- Combobox active option needs a visible moving cue in actual forced-colors mode, distinct from selected state. First reproduce the suspected failure; if absent, document evidence without speculative styling.
- Preserve prior uncommitted #71/#72 fixes. Do not commit, push, publish, version or close issues.
- Evidence: failing automated regressions, browser red/green, light/dark normal themes, real narrow layout and enlarged text, forced-colors native keyboard navigation, strict packaged styles/consumers, final ready gate and independent review. No claims of full accessibility conformance or performance improvement.

## Task 1: Establish browser baseline

**Files:** Temporary isolated fixtures only; no source edit.

- [x] Measure Field long-token overflow in 280px vertical/horizontal compositions and Alert title overflow/Close overlap.
- [x] Open Combobox and navigate using real keys with forced-colors emulated; confirm media query, active descendant and computed visible cues. Record active versus selected/disabled behavior.

## Task 2: Field and Alert wrapping

**Files:** `packages/ui/src/field/index.tsx`, `packages/ui/src/alert/index.tsx`, their existing component tests, `packages/ui/src/styles.css`.

- [x] Add failing regressions for long content, semantic styling hooks and retained native semantics.
- [x] Run `pnpm test packages/ui/src/field packages/ui/src/alert`; expect missing wrapping classes/rules to fail.
- [x] Add styling hooks to existing native elements and scoped rules.

```tsx
<label id={labelId} htmlFor={controlId} className="lj-field-label block text-sm font-medium text-content">
  {label}
  {required && <span aria-hidden="true"> *</span>}
</label>
<strong className="lj-alert-title block font-semibold">{title}</strong>
```

```css
.lj-field-label {
  min-width: 0;
  overflow-wrap: anywhere;
}
.lj-alert-title {
  overflow-wrap: anywhere;
}
```

- [x] Run focused suites and scoped typecheck; expect all passing without weakening assertions.

## Task 3: Combobox forced colors

**Files:** `packages/ui/src/styles.css`, `packages/ui/src/combobox/combobox.component.test.tsx`, `scripts/test-packages.mjs` only if failure is reproduced.

- [x] After confirmed failure, add a focused source/packaged-style regression for a system-color active outline. Existing keyboard assertions must continue to verify active-descendant movement and disabled skipping.
- [x] Add forced-colors-only active outline, with selected state separate, based on measured browser output. Proposed minimal rule:

```css
@media (forced-colors: active) {
  .lj-combobox-option[data-focused] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }
}
```

- [x] Run `pnpm test packages/ui/src/combobox`; expect passing tests, then verify real native keyboard behavior and visible cue in browser.

## Task 4: Distribution and verification

**Files:** `scripts/test-packages.mjs`, `.changeset/ui-wrap-forced-colors.md`, this plan.

- [x] Extend installed fixture with constrained long Field labels and dismissible Alert titles; retain styles in compiled package checks.
- [x] Add UI-only compatible patch changeset for confirmed fixes.
- [x] Format changed paths; run `TMPDIR=/private/tmp/opencode PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/ pnpm ready`. Expected: build, lint/format, typings, coverage thresholds and packed consumers all pass.
- [x] Verify final installed artifact at wide/narrow actual viewports, enlarged text, both normal themes and forced colors. Record timings including setup and stop owned processes.
- [x] Independent final review; address only in-scope findings.
- [x] Update #73/#74 with evidence and report local completion; leave delivery actions for explicit authorization.

## Evidence

- Unchanged installed baseline Chrome157 at actual1440×1000 with280px containers: horizontal Field Switch overflow1227px, Checkbox1210px, vertical Input1171px; Alert1408px and title text intersects Close. No runtime errors. Browser setup/review21:34:41–21:36:16UTC (1m35s); owned processes stopped.
- Retained tests failed before fixes: six expected failures,16 passes. After scoped semantic rules,22 Field/Alert cases passed and UI typecheck passed; combined feedback/Field/Alert suites28 tests passed.
- #74 temporary-bundle failures did not establish runtime behavior. Investigation uses existing built consumer to avoid unnecessary dependency changes.

- #74 confirmed using existing built consumer: forced-colors media active, native ArrowDown moves from selected Cedar past disabled Unavailable to long option. Active descendant and accessibility tree are correct, but focused option has no outline/border/shadow and black/white colors indistinguishable from neighbors. Screenshot confirmed invisible virtual focus. Setup/review about30s (21:37:13–21:37:35UTC including execution/cleanup confirmation); owned processes stopped.
- Forced-colors source-style regression failed before scoped Highlight outline implementation. Ordinary theme styling and selection logic are unchanged.

- Full integration initially found the catalog PasswordField reset test asserting before later-task masking settled (introduced by the approved #71 correction). Its unchanged masking assertion now uses `vi.waitFor`; no application behavior or assertion was weakened. Scoped run had passed depending on timing; final gate rerun follows.

- Final `TMPDIR=/private/tmp/opencode PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/ pnpm ready` passed: 69 files,883 tests,90-source coverage inventory; statements96.29%, branches94.46%, functions95.69%, lines97.12%. Changeset validation, formatting/lint, builds, all typings and five packed consumers passed. Known TypeScript experimental-API advisory remains nonfatal. Final fixture `/private/tmp/opencode/little-jay-pack-FjDKMS`.
- Independent static review cleared #73/#74 and the catalog reset timing adjustment. No public prop, dependency, workspace, entry-point or ownership changes; navigation map remains accurate.

- Final installed-artifact browser validation passed in isolated Chrome157.0.8103.52 with matching copied JavaScript/CSS hashes: light/dark1440×1000,390×844 and390×844 at200% text enlargement in280px containers. Label/Field/title/Alert/section overflow0px; complete labels and titles retained, no Close overlap. Label clicks toggle Checkbox/Switch; Tab shows2px outlines and reaches Dismiss alert; Enter clicks once without submission.
- Forced-colors media active: outline solid2px system color at offset−2px moves from selected Cedar to long option, skipping disabled. Selected bold and active outline remain distinct; input focus/active-descendant correct, Enter selects and closes. Normal light/dark backgrounds unchanged with no outline. No runtime warnings/errors or failed asset requests captured.
- Browser setup/review/cleanup21:40:28–21:41:53UTC (about85s). Artifacts: `/private/var/folders/zf/b676n85x1b33m8nmnsd7p6jc0000gq/T/opencode/issues73-74-final-LcAj1p/`. All owned Chrome/listeners stopped. Both issues implemented and verified locally; no commit/push/publication/version change or issue closure.
