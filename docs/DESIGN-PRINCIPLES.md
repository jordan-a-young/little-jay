# Design principles

Little Jay should feel calm, clear, consistent, and trustworthy. Build small, useful foundations that help people complete a task without requiring them to learn a new interaction model. These principles guide issue refinement, feature design, implementation, and review; they cover both user experience and library architecture.

This is a design direction, not a claim that every existing component or consuming application already meets it. It does not introduce new APIs, tokens, or automatic behavior. Existing public contracts and safety boundaries still apply; identify conflicts explicitly rather than silently changing them.

## UI and UX

### 1. Start with the person's task

- State who needs the change, what they are trying to do, and the observable improvement. Prefer a complete, understandable task flow over adding a widget for its own sake.
- Reuse existing components and familiar platform conventions before introducing a new control or interaction. Add options only for a demonstrated need.
- Use progressive disclosure for secondary detail, not to hide essential status, consequences, required input, or recovery actions.

### 2. Make hierarchy and composition clear

- Group related content with consistent alignment and spacing. Reuse established typography, spacing, surface, and radius patterns rather than introducing one-off styles for each screen.
- Make the page purpose and next action easy to find. Keep primary emphasis selective; do not give every action or surface equal visual weight. A primary action is optional, not mandatory in every component.
- Use meaningful heading levels, readable text, and predictable reading order. Do not encode hierarchy only through color, shadows, or larger text. Shared containers must not guess a consuming page's heading level or landmarks.
- Use semantic theme tokens for visual roles. Brand color is not automatically an action color; decorative artwork must support, not replace, useful content. See [branding](BRANDING.md) for canonical values and rights.

### 3. Make accessibility foundational

- Design toward [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/) for applicable web experiences. A token palette or an automated test alone does not establish conformance; record unverified criteria and known limitations.
- Prefer native semantics and controls. Provide visible labels, meaningful accessible names, logical keyboard order, visible unobscured focus, and appropriate focus restoration. Do not require hover, precision pointing, or dragging as the only way to complete a task.
- Make interactive targets usable and separated; check applicable target-size requirements and alternatives. Use text or another non-color cue for state, errors, and selection.
- Check text and non-text contrast for the actual foreground/background/state combinations in both themes. Support zoom, text resizing, reflow, and reduced-motion preferences without losing content or actions.

### 4. Keep interaction predictable and user-controlled

- Use consistent labels and behavior for the same action. Preserve native button, link, form, selection, and keyboard expectations; a visual variant must not silently change an action's meaning.
- Preserve drafts, selections, and focus through pending work, validation, theme changes, and layout changes. Make resets and dismissals deliberate; document intentional unmounting or state retention.
- Prevent accidental destructive actions with clear consequences and appropriate application-owned confirmation or undo. Never imply that a disabled control or confirmation dialog provides authorization.

### 5. Explain state and provide recovery

- Design relevant default, hover, focus, active, selected, disabled, read-only, pending, empty, success, and error states. These are a checklist, not mandatory props or every possible combination for every component.
- Distinguish initial loading from background refresh, empty results from failure, and cached/offline data from a fresh response. Keep useful existing content available when safe; do not flash a success state before an operation succeeds.
- Make empty and error states explain what happened and the next useful action. Preserve input after validation failures, associate errors with their fields, and keep diagnostics private.
- Choose live announcements for the context, not by default everywhere. Avoid duplicate or assertive announcements for routine updates. Applications own request lifecycle, retry decisions, and status wording.

### 6. Write useful, respectful interface copy

- Use concise, specific labels and familiar language. Prefer action labels such as “Save draft” over an ambiguous “OK” when the result needs explanation.
- Explain constraints before mistakes occur. Error copy should describe the problem and recovery without blaming the person or exposing private data.
- Keep terminology consistent. Do not promise saving, security, connectivity, or completion that the application has not established.

### 7. Adapt without losing meaning

- Design for available space, long labels, realistic content, and text enlargement, not only a fixed desktop screenshot. Keep essential actions reachable and reading/focus order coherent on narrow layouts.
- Use wrapping and deliberate, named overflow where appropriate; do not clip information or shrink controls until they are unusable. Respect directionality when relevant to the control.
- Light and dark themes must preserve hierarchy, legibility, state cues, and portal inheritance, not merely invert colors. Theme and responsive-breakpoint policy remain application-owned.

### 8. Use restraint in decoration and motion

- Prefer a quiet visual foundation with deliberate emphasis. Avoid ornamental containers, competing highlights, or animation that obscures content or creates a new interaction burden.
- Use motion only to explain a transition or provide useful feedback; respect reduced motion and do not make animation the sole state cue. Do not add motion solely to make a component feel more elaborate.
- Measure a representative interaction before claiming a performance improvement. Do not trade away accessibility, correctness, drafts, validation, or resource bounds for a faster-looking demo.

## Library architecture

- **Small, composable public APIs:** Start with the smallest useful slice and native props/composition where appropriate. Keep new exports, declarations, examples, and installed documentation aligned; do not add speculative abstractions or empty future packages.
- **Explicit ownership:** Libraries own reusable presentation, theme values, bounded transport, or opt-in server foundations. Applications own domain schemas, routing, authorization, caches, workflow decisions, preference persistence, and process lifecycle. Follow the relevant [HTTP](HTTP.md) and [server](SERVER.md) contracts.
- **Minimal integration burden:** Reuse established dependencies and justify new ones against the concrete behavior needed. UI must work with its compiled, reset-free CSS without requiring consumers to install Tailwind or rebuild the dependency. Import through public exports, not implementation files.
- **Safe, verifiable behavior:** Bound resources, forward cancellation, clean up owned effects/resources, and keep diagnostics safe. Preserve compatibility unless a breaking change is explicitly scoped. Tests, browser evidence, and an installed-package consumer establish different kinds of confidence.

## Apply during planning and review

Before marking an issue ready or implementing a feature, record a proportionate design check in the issue or existing task discussion:

1. **Need and reuse:** Who benefits, what task improves, and why do existing components or app-local composition not already solve it?
2. **Experience:** What hierarchy, content, interactions, relevant states, and recovery behavior should the person experience? For UI work, use the principles above; a short description is enough unless a sketch or prototype resolves real uncertainty.
3. **Access and adaptation:** Which keyboard/focus, contrast, theme, narrow-layout, zoom/reflow, and motion cases are affected? Mark genuine non-applicability with a reason rather than inventing UI requirements for transport-only work.
4. **Ownership and compatibility:** Which workspace owns the change? What stays app-owned, which public contracts change, and are new dependencies or deviations justified?
5. **Evidence:** Turn the relevant decisions into observable acceptance criteria. Select automated, browser, package-consumer, and independent-review requirements from the [verification matrix](VERIFICATION.md) and applicable agent guidance. Record unresolved questions and their readiness impact.

Review the final behavior and documentation against these decisions. If a principle conflicts with an established contract or the requested outcome, explain the tradeoff and obtain agreement before a consequential deviation; it is not permission to bypass safety, accessibility verification, review gates, or publication approval. Scope any existing gap separately instead of silently redesigning unrelated areas.

## Guidance for agents and consumers

Source-checkout agents start with the root and applicable scoped `AGENTS.md` files, then read this guide when refining issues, designing features, or reviewing design decisions. Use the [task-to-file map](REPO-MAP.md) and relevant contracts rather than loading unrelated documentation.

Installed consumers do not receive this repository's maintainer instructions automatically. The UI and token READMEs carry self-contained usage principles; [consumer-agent setup](CONSUMER-AGENTS.md) explains how a consuming application's own `AGENTS.md` directs agents to the installed, version-matched guides. Documentation guides behavior but does not enforce agent compliance or grant artwork/publication rights.
