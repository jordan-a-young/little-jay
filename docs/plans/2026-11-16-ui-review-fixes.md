# UI review fixes implementation plan

**Goal:** Fix PasswordField current-form reset masking (#71) and valid PebbleState semantic-heading composition (#72).

**Architecture:** PasswordField observes reset in capture so stopped propagation does not hide uncancelled resets, then settles in a cancellable later task after application handlers and native dispatch. Settlement rechecks cancellation, current owner and subscription. PebbleState keeps its public React-node heading API, renders its image separately, and places the unchanged heading node in a neutral block rather than EmptyState's strong element. EmptyState's public behavior remains unchanged.

**Tech Stack:** React 19, TypeScript, pnpm 12.18.0, Node 26.13.1, Vite+ tests, compiled reset-free CSS.

## Design and success criteria

- Existing consumers keep the same props; no cloning, heading inference, new dependency, application policy, or unrelated #73/#74 work.
- A reset that ceases to own PasswordField before settlement preserves reveal state; the new owner's reset masks it. Existing cancellation and cleanup tests remain passing.
- String and native heading-node PebbleState content remain supported. No heading sits inside strong, the image remains decorative and outside the heading, and root props/ref/action/description still work.
- Reuse existing semantic surface/spacing and title styling. Do not change EmptyState to accommodate a single consumer.
- Automated red/green regressions, strict packaged declarations, installed markup assertions, both-theme/narrow reset-free browser evidence, full ready gate and independent review establish completion. If browser access remains unavailable, report that gate as blocked.
- Commits, pushes, publication, issue closure and unrelated fixes are not authorized.

## Task 1: PasswordField reset ownership

**Files:** `packages/ui/src/password-field/index.tsx`, `packages/ui/src/password-field/password-field.component.test.tsx`.

- [x] Add a failing regression using synchronous form reassociation during reset.

```tsx
function ReassociatedPassword() {
  const [owner, setOwner] = useState("first-form");
  return (
    <>
      <form id="first-form" onReset={() => flushSync(() => setOwner("second-form"))} />
      <form id="second-form" />
      <PasswordField form={owner} />
    </>
  );
}
```

- [x] Run `pnpm test packages/ui/src/password-field`; expect the new revealed-state assertion to fail.
- [x] Add the deferred guard alongside cancellation/subscription checks.

```tsx
if (subscribed && !event.defaultPrevented && event.target === inputReference.current?.form) {
  pendingSelection.current = null;
  setRevealed(false);
}
```

- [x] After native-browser investigation, retain capture observation and use tracked later-task settlement rather than a microtask or bubbling-only observer.

```tsx
const resetTimers = new Set<ReturnType<typeof setTimeout>>();
function handleReset(event: Event) {
  if (event.target !== inputReference.current?.form) return;
  const timer = setTimeout(() => {
    resetTimers.delete(timer);
    if (subscribed && !event.defaultPrevented && event.target === inputReference.current?.form) {
      pendingSelection.current = null;
      setRevealed(false);
    }
  }, 0);
  resetTimers.add(timer);
}
root.addEventListener("reset", handleReset, true);
return () => {
  subscribed = false;
  root.removeEventListener("reset", handleReset, true);
  resetTimers.forEach((timer) => clearTimeout(timer));
  resetTimers.clear();
};
```

- [x] Rerun the focused suite and `pnpm --filter @littlejay/ui typecheck`; expect success.

## Task 2: PebbleState heading composition

**Files:** `packages/ui/src/pebble-state/index.tsx`, its colocated component test, `scripts/test-packages.mjs`, `docs/PEBBLE-STATES.md`, `packages/ui/README.md`.

- [x] Add a retained regression with `heading={<h2>No projects yet</h2>}`.

```tsx
expect(container.querySelector("h2")?.closest("strong")).toBeNull();
expect(container.querySelector("h2")?.contains(container.querySelector("img"))).toBe(false);
```

- [x] Run `pnpm test packages/ui/src/pebble-state`; expect the invalid-ancestor assertion to fail.
- [x] Replace the EmptyState wrapper locally with the same native root presentation, image as its own child, neutral heading block, and unchanged supporting/action composition.

```tsx
<div
  {...props}
  className={`min-w-0 space-y-3 rounded-control border border-dashed border-border bg-surface p-6 text-content ${className}`}
>
  <img
    src={`${assetBaseUrl.replace(/\/$/, "")}/states/${illustration.file}`}
    alt=""
    width={illustration.width}
    height={illustration.height}
    loading="lazy"
    decoding="async"
    className="block"
    style={{
      width: size,
      maxWidth: "100%",
      height: "auto",
      aspectRatio: "1 / 1",
      objectFit: "contain",
    }}
  />
  <div className="lj-pebble-state-heading font-semibold">{heading}</div>
  {description != null && <div className="break-words text-muted">{description}</div>}
  {action != null && <div>{action}</div>}
</div>
```

- [x] Keep title typography and long-text wrapping through the existing `.lj-empty-state-title` CSS rules, extending their selector to the local heading and direct native headings without changing EmptyState. Preserve image spacing through the existing outer spacing rather than doubling it.
- [x] Verify native props/ref, plain text and custom heading content; document the neutral container and caller-owned heading level. Add packed root/subpath heading usages and markup assertions.
- [x] Run focused tests, rebuild UI, scoped typecheck and package-consumer checks; expect all passing.

## Task 3: Integration and review

**Files:** `.changeset/ui-review-reset-heading.md`, this plan, consumer guidance and scoped UI guidance where needed.

- [x] Add a UI-only compatible patch note describing both user-visible fixes.
- [x] Format changed files with `pnpm exec vp fmt <changed-paths>`.
- [x] Run `TMPDIR=/private/tmp/opencode PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/ pnpm ready`; expect all tests, coverage, lint, build, typings and five packed consumers to pass.
- [x] Verify the changed heading rendering in light/dark and wide/narrow reset-free packaged consumers, plus the form reassociation flow. Record setup and elapsed validation time.
- [x] Obtain independent final diff review and address in-scope findings.
- [x] Update GitHub issues with exact verification evidence, leaving them open until delivery is authorized. Report files changed and remaining gates. Do not commit or push.

## Verification evidence

- PasswordField regression failed before the guard (14 passed / 1 failed), then all 15 cases passed. Native Chromium Tab/Enter reset follow-up still re-masked after A-to-B reassociation with the corrected build: #71 was not complete at that checkpoint. Native microtask checkpoints let capture-scheduled work precede React onReset. A second regression simulates that checkpoint and fails before moving the component listener to bubbling. Temporary real-browser bubbling verification passes reassociation, current-owner masking and cancellation. Final source/build verification follows.
- PebbleState heading regression failed with the strong ancestor before implementation; all 10 focused cases passed after the fix, including native root props and custom heading components.
- `TMPDIR=/private/tmp/opencode PNPM_CONFIG_REGISTRY=https://registry.npmjs.org/ pnpm ready` passed on Node 26.13.1 / pnpm 12.18.0: 69 files, 876 tests, 90-source coverage inventory, 96.29% statements, 94.46% branches, 95.69% functions and 97.12% lines. Build, typecheck, formatting/lint, changeset validation, strict installed declarations and all five packed consumers passed. The known TypeScript experimental-API build advisory remains nonfatal.
- Packed fixture retained at `/private/tmp/opencode/little-jay-pack-K85vAa`; root/subpath semantic heading markup and declarations verified.
- No ownership, workspace, entry-point or test-location changes: the repository navigation map remains accurate.

- Independent review identified direct heading weight retaining browser bold (700). A source-style regression failed before adding the scoped inheritance rule; focused tests and the full final integration gate passed after correction. Final static re-review cleared all findings.

- Native reset ordering: component capture → component microtask → React onReset under Enter activation; programmatic reset keeps those callbacks in one JavaScript stack and queues the microtask afterward. Moving only PasswordField’s reset observer to bubbling fixes the demonstrated native ordering. Other controls remain unchanged and require independent evidence before any fix.

- Independent re-review rejected bubbling-only observation because stopPropagation does not cancel native reset. Capture observation with a later-task settlement is the selected correction; pending timers must be cancelled on unmount. The implemented Set tracks each reset timer, deletes settled handles and clears all pending handles during cleanup; the retained test verifies two pending resets are removed. This is an evidence-driven change to the original microtask plan.
- One broad run reported a Dialog Escape dismissal assertion failure; the same unchanged 23-case suite passed immediately in isolation. Cause remains unconfirmed, and no Dialog assertions or implementation were changed.

- Final capture/later-task PasswordField implementation: stopped-propagation regression failed before correction, then all 17 focused cases passed. Final `pnpm ready` passed with 876 tests; the unchanged Dialog suite passed within that gate. Independent final review cleared.
- #72 final browser typography passed: computed weight 600, margin zero, image gap 12px and zero horizontal overflow in both themes at 390×844, reusing earlier 1440×1000/390×844 semantics/layout/keyboard checks. Initial broad browser window was 21:17:42–21:19:53 UTC (2m11s); correction/reset follow-up 21:24:22–21:25:50 UTC (1m28s), ordering investigation 21:26:51–21:27:17 UTC (26s), later-task hypothesis 21:29:37–21:30:39 UTC (62s). All owned processes/listeners were stopped.

- Final #71 browser verification passed against the unmodified installed artifact from `/private/tmp/opencode/little-jay-pack-K85vAa/node_modules/@littlejay/ui/dist/`, SHA-256 `7e1fbc1c863ac00f12adbc610196b2a1e32e888d97004b1719a3cb9fd9dea79d`. Chrome 157.0.8103.52 at 390×844: native Tab/Enter and programmatic resets both preserve reveal after A-to-B reassociation, mask on uncancelled B reset, preserve reveal on cancelled B reset and mask on stopped-propagation-only B reset. No runtime errors or credential values recorded. Setup through cleanup confirmation 21:31:45–21:32:44 UTC (about 58s); all owned listeners/processes stopped. Retained evidence: `/private/var/folders/zf/b676n85x1b33m8nmnsd7p6jc0000gq/T/opencode/password71-browser-HcDW4t/evidence.json`.
- Both issues are implemented and verified locally. No commit, push, version change, publication or issue closure was performed.
