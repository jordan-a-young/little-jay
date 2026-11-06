# Backlog

Track requested improvements, investigations, documentation, tooling, and potential component/package additions. This is a planning record, not a list of promised APIs or authorization to change another repository, publish packages, or add dependencies. See the [roadmap](ROADMAP.md) for priorities and boundaries.

## How to use this record

- Add a stable ID, concrete consumer/use case, proposed owner, missing behavior, status, and next action for each need.
- Check existing components and application code first. Record reuse decisions as well as gaps; do not turn every application pattern into a shared component.
- Use **Needs inspection**, **Ready to scope**, **In progress**, **Implemented**, **Deferred**, or **Declined**. Ready to scope means the need has evidence, not that implementation is authorized.
- Before implementation, link the owning screen/source, define acceptance criteria and verification, and obtain the scoped authorization. Link the implementation and checks when marking an item Implemented.
- Keep domain validation, permissions, drafts, query keys, mutation policy, and execution behavior in the application. Do not create empty packages for future ideas.

## Requested work

Statuses distinguish completed requests from pending work. Investigation items must establish scope before becoming implementation tasks.

### CAT-001: Alphabetize component sections

- **Status:** Implemented.
- **Owner:** Playground catalog.
- **Request:** Order component sections alphabetically, and alphabetize the components within each section. Leave Foundations and Patterns in their current order.
- **Acceptance:** Component navigation follows alphabetical display names without changing stable page/example IDs, deep links, or the ordering inside Foundations and Patterns. Search results retain the intended catalog order.
- **Scope:** Alphabetical component sections are Actions, Feedback, Forms, Inspection; entries use their displayed component names. Foundations and Patterns keep their authored order. Authorized by the request to start working through this backlog.
- **Implementation:** Reordered `apps/playground/src/catalog/registry.ts`; added registry/search and rendered navigation regression tests. No page IDs, example IDs, lazy module ownership, or navigation semantics changed.
- **Verification:** Regression test failed on the original ordering before the fix. `TMPDIR=/tmp/opencode pnpm ready` passed in an isolated source copy (26 test files / 135 tests, builds, typechecks, lint/format, and package-consumer checks). Targeted Chrome checks at 1440×1000 and 390×844 confirmed navigation/search ordering, keyboard activation and visible focus, stable links and Back/Forward, both themes, and no narrow-page overflow. No console warnings/errors or failed requests observed in the checked flows.
- **Next action:** None for this request; changes remain uncommitted.

### UI-005: Opt-in dismissible Alert

- **Status:** Implemented.
- **Owner:** `@ljay/ui`, with playground documentation/examples.
- **Request:** Let consumers opt in to a closeable Alert. Existing alerts remain non-dismissible by default.
- **Acceptance:** The opt-in API provides an accessible, keyboard-operable, non-submit close control; define dismissal ownership and callback behavior before implementation. Preserve existing tone, role, ref, and native-prop behavior, and document focus handling when dismissal removes focused content.
- **Inspection:** `packages/ui/src/alert/index.tsx` is a native div with optional title/action; it has no visibility state or dismissal API. Authored docs/examples live in `apps/playground/src/catalog/feedback/`.
- **Approved scope:** An optional `onDismiss: () => void` adds a native non-submit close control; optional `dismissLabel` customizes its accessible name (default “Dismiss alert”). The application owns visibility and removes the Alert in the callback. Without `onDismiss`, rendering stays non-dismissible. No internal hidden state, duplicate `dismissible` flag, or automatic focus movement; the application restores focus to a meaningful surviving control when needed. Authorized by the request to address the Alert after the API proposal.
- **Verification plan:** Default/opt-in rendering, callback once per activation, Enter/Space, form non-submission, caller-controlled visibility, role/tone/ref/native-prop preservation, catalog controlled-dismissal/focus example, both-theme/narrow/no-reset browser checks, strict tarball declarations/consumer checks, and independent final API review.
- **Implementation:** [Alert source](../packages/ui/src/alert/index.tsx), [component tests](../packages/ui/src/alert/alert.component.test.tsx), and `/#/alert/dismissible` in the [feedback catalog](../apps/playground/src/catalog/feedback/page.tsx). Reuses IconButton with a nonblank label; preserves non-dismissible default rendering. Root/subpath declaration and Tailwind-free runtime coverage live in `scripts/test-packages.mjs`.
- **Verification:** New dismissal tests failed before implementation. Targeted Alert/feedback checks passed (2 files / 9 tests); `TMPDIR=/tmp/opencode pnpm ready` passed in an isolated current-source copy (27 files / 141 tests, lint/format, builds, typechecks, tarball contracts/consumer build). Chrome checks at 1440×1000 and 390×844 covered Enter/Space, visible focus, app-owned removal/restoration, both themes, and non-submit behavior. The reset-free consumer retained its native body margin; close controls were 44×44 px with no native border, content overlap, or Alert overflow in either theme. No console warnings/errors were observed. Independent final API review: 0 actionable findings.
- **Next action:** None for this request; changes remain uncommitted.

### UI-006: Accordion / collapse component

- **Status:** Implemented (existing-component reuse).
- **Owner:** `@ljay/ui`, with existing playground documentation/examples.
- **Request:** Accordion/collapse support; the user confirmed that the existing Disclosure component satisfies this request and asked to mark it completed.
- **Resolution:** Reuse native Disclosure via details/summary. No new Accordion export, component, or catalog examples are needed for this request.
- **Inspection:** [Disclosure source](../packages/ui/src/disclosure/index.tsx) forwards native details props, including `name`, `open`, `onToggle`, and refs. The [catalog](../apps/playground/src/catalog/inspection/page.tsx) documents those props but its [example](../apps/playground/src/catalog/inspection/examples.tsx) only shows one collapsed metadata panel. Existing [interaction coverage](../packages/ui/src/description-list/inspection.component.test.tsx) checks one panel toggling, not grouped exclusivity. Shared CSS already supplies themed borders and summary focus outlines without animation. No external consumer screen has been inspected; a new shared primitive is not yet justified.
- **Verification boundary:** Completion records the user's reuse decision, not new implementation or grouped-accordion browser verification. A future requirement for exclusive groups, external triggers, or APG arrow-key navigation would need a separate scoped request.
- **Next action:** None for this request.

### UI-008: Surface success and warning Alert variants

- **Status:** Implemented.
- **Owner:** Playground feedback catalog and `@ljay/ui` regression coverage.
- **Request:** Add success and warning Alert variants.
- **Existing coverage:** Alert already accepts `tone="success"` and `tone="warning"`, mapped to existing semantic theme colors. No new prop, palette, or component styling is needed.
- **Implementation:** Dedicated `/#/alert/success` and `/#/alert/warning` examples and snippets; semantic tone/default-role regression tests and catalog deep-link coverage. Static examples use `role="note"`, and existing dismissal remains opt-in for either tone.
- **Acceptance:** Both examples resolve by stable link, use the active theme's semantic colors, convey their meaning in text, and preserve existing Alert behavior.
- **Verification:** Both catalog route tests failed before the examples were added. `pnpm check`, playground build/typecheck, and `pnpm test apps/playground/src packages/ui/src` passed (22 files / 114 tests) in the isolated source copy. Unchanged library build outputs and dependency installation were reused. Chrome confirmed both tones' semantic text/border colors in light/dark themes, keyboard example selection, stable links, and no page overflow at 390×844; wide layout checked at 1440×1000. No console warnings/errors or failed requests observed. No shared API/CSS change; prior package-consumer verification remains applicable.
- **Next action:** None for this request; changes remain uncommitted.

### UI-007: Loading indicators

- **Status:** Implemented.
- **Owner:** `@ljay/ui`, with application-owned loading state.
- **Request:** Implement a compact loading indicator with optional visible text. The user approved catalog-only adoption and explicitly corrected the proposal: loading text must not be required.
- **Existing coverage:** StatusIndicator and PebbleState loading presentation already exist (`packages/ui/src/status-indicator/`, `packages/ui/src/pebble-state/`); compact spinners, skeletons, or determinate progress are candidates, not confirmed requirements.
- **Acceptance:** Optional visible `label` text, hidden “Loading” text when omitted/blank, decorative spinner, caller-owned role and busy state, inline font-relative sizing, both themes, reduced motion, and reset-free rendering. Requests, caching, pending state, and disabling policy remain application-owned.
- **Inspection:** The [API connection example](../apps/playground/src/catalog/patterns/examples.tsx) already labels initial loading, refresh, and offline pause separately using Query state and Alert/Button text. The [workflow form](../apps/playground/src/WorkflowForm.tsx) exposes `aria-busy`, disables its fieldset while pending, and labels its submit button “Validating…”. [StatusIndicator](../packages/ui/src/status-indicator/index.tsx) is a text badge with a decorative dot; [PebbleState](../packages/ui/src/pebble-state/index.tsx) is static illustrated feedback. [Catalog Suspense](../apps/playground/src/CatalogApp.tsx) has a textual status fallback. None is an inline animated activity indicator, but loading is already conveyed accessibly in these local flows; no missing determinate progress or skeleton requirement was found.
- **Approved scope:** `LoadingIndicator` and `LoadingIndicatorProps` from root and `@ljay/ui/loading-indicator`, optional `label`, native span props/ref/className (excluding children/raw HTML), primary theme color, and font-relative spinner. Hidden text gives icon-only rendering accessible content without imposing a live role. Catalog default/local examples only; API/form consumers remain unchanged. No timers, progress percentages, skeletons, Button loading API, or new dependency.
- **Implementation:** `packages/ui/src/loading-indicator/`, compiled source CSS in `packages/ui/src/styles.css`, root/subpath/build wiring, alphabetically registered feedback catalog page, authored examples/docs, and strict tarball consumer coverage.
- **Verification plan:** Optional/blank/visible label rendering, safe text, refs/native props, caller-owned announcement/decorative policy, label updates without focus movement, local-only catalog state, current declarations/root/subpath exports, both-theme/reset-free browser rendering, and reduced-motion animation checks. Independent final API/CSS review is required.
- **Verification:** The initial new-suite run could not resolve the not-yet-created component; after implementation, focused component/registry checks passed (2 files / 10 tests). Frozen-lockfile installation and `TMPDIR=/tmp/opencode pnpm ready` passed in the isolated current-source copy (28 files / 151 tests, lint/format, builds, typechecks, strict declarations and all five tarball consumer checks). Chrome at 1440×1000 and 390×844 checked hidden icon-only text in the accessibility tree, optional visible text, caller-owned single live region, Enter/Space local toggling with preserved focus, both themes, no page overflow, and normal running animations versus zero active animations under reduced motion. Tailwind-free consumer rendering retained native body margin and primary theme colors, and both theme scopes retained spinner/text with animation disabled under reduced motion. No console warnings/errors observed. Independent final API/CSS review: 0 actionable findings.
- **Next action:** None for this request; changes remain uncommitted. Hooks guidance and consumer-agent documentation remain pending scope approval.

### HOOK-001: Investigate a hooks section

- **Status:** Implemented (approved documentation-first scope).
- **Owner:** Playground Foundations documentation; no shared-library hook API.
- **Request:** Explore a dedicated section for utility hooks and API-call hooks using TanStack React Query.
- **Acceptance:** Identify concrete hook use cases, distinguish reusable utilities from app-specific API hooks, and propose documentation/package placement. React Query continues to own caching and lifecycle; query keys, authentication scope, schemas, and mutation policy remain app-owned. Do not introduce a second cache or replace existing generated clients for consistency.
- **Inventory:** [useTheme](../apps/playground/src/use-theme.ts) is app-owned and tied to this playground's theme store/bootstrap; [useFieldControl](../packages/ui/src/field/context.ts) is an internal Field composition hook, not a root public export. [Health query options](../apps/playground/src/health.ts) own the one API-read key, decoder, stale time, and retry policy; [API connection](../apps/playground/src/catalog/patterns/examples.tsx) consumes them directly with `useQuery`. [Health tests](../apps/playground/src/health.test.ts) cover freshness/invalidation, offline pause/resume, decoding, and cancellation. Form pending state uses React Actions/useFormStatus rather than Query. No second independent API-hook consumer or reusable public utility hook was established in this repository.
- **Approved scope:** The user selected the documentation-first plan: a Foundations guide covering hook ownership and the existing `queryOptions` + `useQuery` + `fetchJson` pattern, with links to the API connection example and [transport contract](HTTP.md). Retain the current app-local options value rather than introducing a cosmetic `useHealth` wrapper. Do not add an empty Hooks navigation group, move useTheme into UI, expose Field internals, or add React/Query to the framework-independent HTTP package. Revisit public utility exports or a package only with a concrete independent consumer.
- **Proposed acceptance/checks:** Authored snippets match current APIs and show Query's signal reaching fetchJson, app-owned keys/decoders/auth policy, offline/loading/error distinctions, and the boundary between Query reads and Actions form state. Keep existing lazy loading, page IDs, and Foundations order; test a new guide's registration/search/deep link if approved. No new runtime dependency or hook API is necessary for this slice.
- **Implementation:** `apps/playground/src/catalog/foundations/hooks.tsx`, registered as `/#/hooks` and `/#/hooks/query` after the existing Foundations entries. Provider/health/API-pattern snippets are imported as current raw source text; guide previews make no requests. Authored ownership/lifecycle guidance, related pattern/contract links, registry/search and component coverage, and the navigation map/scoped guidance are updated.
- **Verification:** Registry/order/search tests failed before registration and passed afterward. `pnpm check`, playground build/typecheck, and `pnpm test` passed in the isolated current-source copy (28 files / 153 tests); unchanged library builds, dependency installation, and package-consumer results were reused. Guide tests cover both example deep links, current source content, related links, and no fetch calls. Chrome at 1440×1000 and 390×844 confirmed search, keyboard-visible links and local navigation, Back restoration, both themes, source snippets, and no page overflow. No fetch/XHR requests or console warnings/errors were observed in the checked guide flows. The private source-contract link's target is recorded/tested but was not opened with authenticated access.
- **Next action:** None for this scope; changes remain uncommitted. Public hooks still require independent consumer evidence and separate authorization. Consumer-agent documentation (DOC-001) is the next pending request.

### DOC-001: Make consumer guidance discoverable to coding agents

- **Status:** Ready to scope.
- **Owner:** Library documentation and distribution tooling.
- **Request:** Set up the library so coding agents using its code can discover the relevant usage guidance and constraints.
- **Open question:** Confirm what agents should be informed about: supported imports/APIs, accessibility, theming/CSS setup, application-policy boundaries, verification requirements, licensing, or other expectations. These are proposed topics, not a confirmed exhaustive requirement.
- **Acceptance:** Define the intended agent workflows and a discoverable guidance entry point, check what documentation ships through the chosen consumption path, and demonstrate discovery in a representative consumer. Do not assume repository `AGENTS.md` files are automatically loaded from installed dependencies or promise enforcement across all agents.
- **Inspection:** Root/scoped `AGENTS.md`, README, contracts, and the repository map serve source-checkout agents. Package `files` allowlists mainly ship built code/CSS/assets (UI also ships source), not repository contracts. Inspection of the five retained tarballs from the verified package-consumer fixture `/tmp/opencode/little-jay-pack-qQ1pjo` confirmed that UI, HTTP, server, and tokens have no README/agent usage guide; brand ships its README, states README, and provenance source README. Repository-level links are therefore not an installed-package guidance entry point. This is a confirmed distribution-documentation gap, not evidence that any agent automatically reads dependency instructions.
- **Recommendation (pending):** Give each package a conventional README with package-specific imports/setup, compatibility, policy boundaries, and licensing/provenance pointers. Ship a clearly named companion consumer guide only where more detail is needed, with all relative links resolvable inside the tarball or explicitly labeled as source-repository references. Have a consuming repository's own agent instructions explicitly direct agents to that entry point. Do not put maintainer build/publish duties into dependency instructions or promise automatic discovery/enforcement. Do not change export contracts, dependencies, visibility, or publish as part of documentation delivery.
- **Proposed acceptance/checks:** Confirm the intended consumer topics and consumption path first. Extend the isolated tarball consumer check to assert guide presence and valid packaged links; demonstrate a representative consumer task locating CSS/theme setup, accessible component usage, app-owned policy, and transport/server boundaries from the installed README. A packaging/allowlist change still needs package-consumer verification and independent final contract review. Existing code tests or a README in the source checkout alone do not satisfy discovery acceptance.
- **Next action:** Confirm required topics and opt-in consumer-agent discovery workflow before changing distribution files. The gap and delivery proposal are recorded; no guide has been shipped and discovery acceptance remains unmet.

### NAV-001: Adopt TanStack Router in the playground

- **Status:** Implemented.
- **Owner:** Playground application routing and catalog navigation.
- **Request:** Use TanStack Router so application hooks and routes can integrate with it when needed. Do not create a shared router package.
- **Approved scope:** App-local code-based routes and hash history, existing catalog page/example URLs and legacy alias, stable shell/preview behavior, and one shared QueryClient supplied through route context for future integration. No new shared hooks, router package, automatic health prefetch, or second data cache.
- **Dependency:** Exact `@tanstack/react-router` 1.170.46 in `@ljay/playground`; registry metadata supports the current React 19 and Node 26 toolchain. No new install-script or dependency-skill approvals were granted.
- **Acceptance/checks:** Existing deep links, malformed/missing route recovery, Back/Forward and legacy Pebble alias; route-aware links/example selection; page heading focus versus preserved example-selector focus; theme/search/width/reset and draft behavior; category-level lazy rendering; health data cache reused and no requests on documentation routes. Validate frozen installation, lint/format, build/typechecks/tests, hash/subpath and real keyboard/narrow browser flows, and independent final integrated review.
- **Implementation:** `apps/playground/src/router.tsx` defines the persistent root shell, Introduction route, and optional-example route. `catalog/navigation.tsx` provides typed app-local links/selection; `routing-history.ts` limits compatibility handling to legacy/malformed inbound locations and existing history state. Main supplies one QueryClient to the provider and route context. Custom hash observation/parsing is removed from CatalogApp/registry; navigation sites and the hooks guide are updated.
- **Verification:** Frozen-lockfile installation and `TMPDIR=/tmp/opencode pnpm ready` passed in the isolated current-source copy (29 files / 170 tests, lint/format, builds, typechecks, all five tarball consumer checks). Focused coverage includes optional-parameter clearing, 16 direct-entry/encoding cases, prefixed hashes, legacy history state, manual hash changes, selector identity/focus, Back/Forward, and QueryClient/cache reuse. A separate playground build with `--base /little-jay/` passed. Chrome checked task-owned development UI/API at 5174/5051 and production-prefix preview at 4174, at 1440×1000 and 390×844: deep links/legacy alias, malformed/missing recovery, keyboard page/example navigation, root shell/search/theme/width/reset preservation, both themes, no page overflow, and cached health reuse after navigation. Documentation visits made no API requests. Initial development API entry showed one canceled fetch followed by a successful response; returning with fresh cached data made no further request. No console warnings/errors observed. Independent integrated review: 0 actionable findings.
- **Resolved check blocker:** Tool initialization generated an unformatted `.serena/project.yml` unrelated to routing. Task-generated artifacts were preserved outside the checkout and verification copy under `/tmp/opencode/little-jay-serena-artifacts-s3fs6mls`; the unchanged gate then passed. No checks were relaxed or dependency scripts/skills approved.
- **Next action:** None for this request; changes remain uncommitted. Task-owned validation services were stopped; existing user services and unrelated changes were preserved.

## First pilot: workflow configuration and inspection

**Status:** Needs inspection. No Graph Workbench source has been inspected for this record, and no specific screen or missing component is confirmed yet.

**Goal:** Select one existing Graph Workbench configuration/inspection flow and establish whether Little Jay's current controls cover it before adding new abstractions.

### Inspection checklist

1. Record the target repository, revision, screen, source paths, existing tests, and current behavior.
2. Map current UI needs to Field/Input/Textarea/NativeSelect/Checkbox, DescriptionList/Disclosure/TextBlock/IconButton, Dialog/sheet, and feedback controls. These already exist; do not list them as missing.
3. Record draft preservation, validation, pending/permission behavior, focus restoration, and historical/read-only behavior. Preserve existing workflow limits, approvals, and sandbox policies.
4. Record the app's existing data client and supported private-package consumption path. GitHub hosting is not npm publication; do not replace an existing generated client solely for consistency.
5. Add evidenced gaps to the table below, then propose one bounded adoption slice with acceptance criteria and regression checks. Adoption requires separate authorization.

### Pilot acceptance criteria

- One real screen and its current behavior are documented, with source/test references.
- Every proposed addition has a concrete use case and an explanation of why existing controls or app-local composition are insufficient.
- The adoption plan preserves domain policy and drafts, identifies package-consumption prerequisites, and specifies focused interaction/regression checks.
- Shared UI API changes include independent review, theme/no-reset checks, strict declarations, browser checks, and an external tarball consumer per the [verification matrix](VERIFICATION.md).

## Candidates and decisions

These initial candidates come from the roadmap, not verified gaps in Graph Workbench. No new component or package is currently confirmed as required.

| ID       | Candidate / proposed owner                      | Consumer evidence or missing behavior                                                                                      | Status           | Next action                                                                                                                      |
| -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| UI-001   | Pressed-state ToggleGroup / `@ljay/ui`          | No concrete consumer identified; only useful for a real grouped pressed-state choice, not tab panels                       | Needs inspection | Inspect the pilot for an existing grouped toggle interaction; record selection and keyboard requirements before proposing an API |
| UI-002   | Tabs / `@ljay/ui`                               | No actual tab-panel consumer identified                                                                                    | Deferred         | Reconsider only when a screen needs linked tabs and panels, rather than navigation or toggle buttons                             |
| UI-003   | Menu / `@ljay/ui`                               | No concrete action-menu consumer identified                                                                                | Deferred         | Record actual actions, focus/dismissal behavior, and why ordinary buttons are insufficient                                       |
| UI-004   | Tooltip / `@ljay/ui`                            | No concrete supplementary-help consumer identified                                                                         | Deferred         | Identify nonessential help content and keyboard/touch behavior; never use as the only accessible label                           |
| PKG-001  | Shared validation / possible `@ljay/validation` | No demonstrated shared formats, decoders, or error mapping; app-owned TypeBox and existing project schemas remain in place | Deferred         | Collect real shared requirements before proposing a package; do not migrate Zod contracts incidentally                           |
| DATA-001 | Snapshot/SSE reconciliation / owner undecided   | A second independent consumer has not been established                                                                     | Deferred         | Establish independent consumer evidence and common semantics; keep current projections application-owned                         |

## Other demand-driven work

Real readiness checks belong in applications when external dependencies exist, using the existing server plugin. Complex tables, calendars, form adapters, and date utilities remain deferred until a named consumer establishes a gap. Authentication, databases, queues, workflow execution, and graph rendering are outside this component pilot.

## Completed guidance improvements

### DOC-002: Document the hot-reload development loop

- **Status:** Implemented.
- **Owner:** Repository and scoped agent guidance.
- **Request:** Avoid unnecessary UI builds/restarts and make the fast iteration path explicit.
- **Implementation:** [Root fast development loop](../AGENTS.md#fast-development-loop), application/UI scoped `AGENTS.md` files, the [README](../README.md#run-on-your-workstation), and [verification guidance](VERIFICATION.md#select-checks-without-repeating-work) distinguish live browser source from built declarations, production output, and tarballs. Focused iteration checks do not waive final gates.
- **Evidence:** `packages/ui/package.json` has source-based `development` exports; `apps/playground/vite.config.ts` aliases development CSS; root `dev` performs initial builds; API `dev` uses `tsx watch`. This records the existing configuration, not a new runtime change or a claim of measured speedup.
- **Verification:** Formatting and local documentation links/anchors checked; development export targets and documented commands checked against current manifests/configuration. No runtime rebuild, restart, or dependency installation was needed for this documentation-only change.
