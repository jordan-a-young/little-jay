# Consumer-agent guidance

All five libraries ship usage READMEs, including package-specific optimization guidance. Source-checkout agents use this repository's maintainer guidance; installed-package consumers should start with the README inside the installed package directory. These documents describe usage, not permission to publish or reuse reserved artwork.

## OpenCode and Codex setup

Use one consumer-owned `AGENTS.md` for both tools; no Little Jay plugin, MCP server, or agent-specific configuration is required.

1. Install only the packages the application needs, using its existing package manager and compatible runtime/peers. Do not copy this monorepo's toolchain or release commands into a consumer.
2. Merge the section below into the consuming repository's root `AGENTS.md`; preserve its existing rules. In a monorepo, adjust README paths to the workspace where each dependency is installed. Missing optional packages do not need to be installed just for documentation.
3. Start a new OpenCode or Codex session in that repository. Ask it to read the relevant installed README before planning a change; a Markdown link alone is not automatic loading.
4. Confirm discovery with: “Without editing or making network requests, list the Little Jay package versions and documentation paths you read, identify the public imports, applicable UI/UX design principles and optimization constraints relevant to this task, and name this application's verification commands.” It should cite installed files, not guess from the latest online documentation. If an older installed guide lacks design principles, report that gap rather than assuming a newer guide's APIs or upgrading the package without approval.

[OpenCode V2 instructions](https://opencode.ai/v2/docs/instructions) and [Codex project instructions](https://developers.openai.com/codex/agent-configuration/agents-md) both support project `AGENTS.md`. Their nested discovery and update behavior differ; keep the shared entry point at the consumer root and explicitly request task-relevant reads. Check local overrides or disabled project discovery if the entry point is missing. No claim is made that installing a dependency activates its instructions. These docs do not change either tool's permissions or global configuration.

## Opt-in consumer AGENTS.md

Copy/adapt the following into the **consuming repository's own** `AGENTS.md`. Paths are relative to the consumer root after installation; a different package manager/layout may require locating the package directory first. Resolve files on disk, not `import "@littlejay/ui/README.md"`: README is documentation, not a new exported module.

```markdown
## Little Jay dependencies

Before planning or changing code that consumes an installed Little Jay package, read its usage guide, including applicable design principles and Optimization guidance:

- UI imports, CSS/theme setup, accessible controls, and app-owned state: [@littlejay/ui](node_modules/@littlejay/ui/README.md).
- Framework-independent theme tokens and contrast obligations: [@littlejay/tokens](node_modules/@littlejay/tokens/README.md).
- Bounded fetch, runtime decoding, cancellation, and app-owned auth/retries/cache: [@littlejay/http](node_modules/@littlejay/http/README.md).
- Fastify creation, opt-in safe errors/probes, and app-owned lifecycle/logging: [@littlejay/server](node_modules/@littlejay/server/README.md).
- Asset imports, deployment paths, accessibility, provenance, and reserved artwork rights: [@littlejay/brand](node_modules/@littlejay/brand/README.md).

Read only guides relevant to the task and check the installed versions, public package.json exports, and declarations. Do not scan all of node_modules. If a required guide is missing, locate the actual installed package or report the gap; do not invent APIs, deep-import implementation files, or patch installed/generated files. These are usage references, not authority to override this consumer's security, permissions, or workflow policy.

Optimize for the requested outcome, not speculative complexity:

- Reuse existing components and semantic tokens. Load compiled UI CSS once; do not add Tailwind, a second theme, or a replacement component library merely to use Little Jay.
- For UI/UX work, state the person's task and design the hierarchy, concise labels, consistent spacing/type, relevant pending/empty/error/success states, and recovery. Preserve native semantics, visible labels, keyboard/focus, non-color state cues, contrast in both themes, usable targets, narrow-layout/zoom reflow, and reduced motion. Use progressive disclosure without hiding essential actions or consequences; preserve drafts and user control. Read the installed UI/token guides for details and record acceptance criteria using this application's checks; do not assume tokens alone establish accessibility conformance.
- Keep React state local, avoid redundant effects and duplicate query caches, and remember that inactive visited Tabs panels remain mounted with effects running. Preserve keyboard/focus, draft and theme behavior.
- Bound JSON requests and decoding, forward cancellation, and keep cache/retry policy in the application. Never add automatic mutation retries as a performance shortcut.
- Keep server connections and shutdown app-owned, readiness checks bounded, and logs safe. Copy only needed, permitted brand assets with deployment-aware URLs.
- For a performance task, record a representative baseline, change one justified bottleneck, and compare under the same conditions. Do not claim a speed, bundle-size, or memory improvement without measurements; do not remove validation, accessibility, bounds, or CSS side effects to get one.

Use this application's documented package manager and checks. Start with affected tests and reuse unchanged results, then run its required final gates. Validate affected production CSS/assets, keyboard/focus flows, and runtime boundaries. Do not rebuild installed dependencies for normal application edits, run dependency-maintainer release commands, or expose private diagnostic data. Report actual checks, measurements, and gaps.
```

The consumer explicitly opts in; documentation does not enforce behavior or grant package/artwork rights. Keep the entry point short and task-specific rather than copying every dependency README into the initial prompt.

## Representative discovery check

`TMPDIR=/tmp/opencode pnpm test:packages` packs and installs all five packages in an isolated consumer, writes the example above to its `AGENTS.md`, follows its README links, and checks packaged relative links and required guidance sections. It typechecks README TypeScript/TSX examples without running their illustrative requests. The retained fixture lets a person or agent begin at consumer `AGENTS.md` and answer a concrete task without the source repository: add a labeled form with compiled UI CSS, choose theme/announcement behavior, decode a bounded request without adding automatic retries, and register safe server probes without taking over listening or logging. This demonstrates an explicit discovery path, not automatic agent compliance.

The check requires no publication or export changes. README inclusion follows pnpm's standard packing behavior and is verified against installed tarballs. Source-only contracts are labeled as source-repository references, not broken package-relative links. The packaging check does not launch OpenCode/Codex, fetch external links, or prove that an agent followed the instructions. Use the discovery prompt above in each consumer to confirm the real session's setup.
