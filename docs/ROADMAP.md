# Little Jay roadmap

Build small, useful pieces for Graph Workbench first. Other project consumers are evidence for reuse, not authorization to migrate them. The five libraries are prepared for public npm publication; root/apps remain private. Release automation is manual and disabled until separately activated; see [the release runbook](RELEASING.md).

## Implemented

- App-local component catalog with searchable navigation, lazy category pages, URL-addressable examples, usage/props/accessibility docs, theme/width controls, and isolated preview reset. No Storybook dependency.

- Canonical `@littlejay/brand` assets with reserved artwork rights, approved Pebble palette, generated shared tokens, and document-level persisted/system appearance. Browser icons and manifest synchronize automatically for development and builds.

- Framework-independent light/dark tokens and semantic feedback colors.
- Native Button; Alert, EmptyState, StatusIndicator, and resettable ErrorBoundary.
- Field, Input, Textarea, NativeSelect, and Checkbox, with per-field React 19 context, native refs/constraints, controlled/uncontrolled support, and no shared value store.
- Local workflow form using React 19 Actions, useActionState/useFormStatus, and draft-preserving validation. No workflow is saved or started.
- Playground examples for workflow feedback and isolated rendering failures.
- Native DescriptionList/Disclosure, inert escaped TextBlock, and named IconButton with local catalog consumers.
- Focused Radix Dialog modal foundation and sheet variant, with controlled dismissal, portal, keyboard/focus coverage, and reset-free theme styling.
- Accessible horizontal Tabs with manual activation, controlled/uncontrolled selection, disabled/RTL keyboard navigation, lazily mounted preserved panels and local catalog examples. No consumer migration is included.
- `@littlejay/http`: bounded platform-fetch JSON transport, cancellation/deadlines, runtime decoders, and safe structured errors; consumed by the existing TanStack Query health read.
- Configurable Fastify factory; opt-in canonical safe-error and configurable health/readiness plugins; app-owned routes, startup, logging, and shutdown.
- Matched TypeBox/provider packages through one concrete stateless `/api/text-preview` endpoint. No shared validation abstraction.
- Five-package tarball coverage, strict external NodeNext declarations, and a no-Tailwind UI consumer including inspection and modal controls.

## Next: prepare components for workflows

1. The [pinned Graph Workbench assessment](GRAPH-WORKBENCH-PILOT.md#broader-component-readiness-assessment) covers representative current presentation needs at local commit `6ff4334`. The user's objective is Little Jay readiness: **do not rebuild, migrate or adopt packages in Graph Workbench now**. Existing controls/app-local composition cover the inspected forms, feedback, metadata and inert review needs. Consumer-toolchain/private-package/CSS integration stays deferred until adoption is separately requested.
2. Tabs is implemented in Little Jay against that responsive content-panel use case; see UI-002 in the [backlog](BACKLOG.md) for its manual activation/state-preservation contract and verification. This does not migrate Graph Workbench or supply its responsive breakpoint policy. No further shared component gap is confirmed by the current inspection. Pressed node/history selection already uses native Button props; ToggleGroup, Menu/Tooltip and additional complex widgets need missing-behavior evidence.

Each slice needs meaningful interaction tests, theme/no-reset checks, strict declarations, and an external tarball consumer before adoption. New exported contracts require independent review. A Graph Workbench adoption change needs its own scoped implementation and regression checks; existing workflow limits, approvals, historical behavior, and sandbox policies must remain intact.

## Next: fetch and backend foundations

- Use TanStack React Query for client caching and invalidation. Keep query keys, authentication scope, mutation policy, and SSE projections in applications. Do not build a second query cache or replace an existing generated OpenAPI client solely for consistency.
- Add real app-owned readiness checks when dependencies exist; keep their timeouts and resource lifecycle explicit.
- Separate `@littlejay/validation` only when real shared formats, decoders, or error mapping justify it. Do not migrate other projects' Zod contracts as a side effect.

## Deferred

- Generic snapshot/SSE reconciliation until there is another independent consumer.
- Complex tables, calendar widgets, form-framework adapters, and date utilities until concrete demand.
- Authentication, database layers, job queues, agent/workflow execution, and graph rendering. Keep domain policy in applications and graph rendering in the existing archgraph packages.

No empty future packages should be created.
