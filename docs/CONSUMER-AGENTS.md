# Consumer-agent guidance

The five private packages ship conventional READMEs. Source-checkout agents use this repository's guidance; installed-package consumers should start with the README inside the installed package directory. These documents describe usage, not permission to publish or adopt a package.

## Opt-in consumer AGENTS.md

Copy/adapt the following into the **consuming repository's own** `AGENTS.md`, according to that agent's supported instruction mechanism. Paths are relative to the consumer root after installation; a different package manager/layout may require locating the package directory first. Resolve files on disk, not `import "@littlejay/ui/README.md"`: README is documentation, not a new exported module.

```markdown
## Little Jay dependencies

Before changing code that consumes a Little Jay package, read its installed usage guide:

- UI imports, CSS/theme setup, accessible controls, and app-owned state: [@littlejay/ui](node_modules/@littlejay/ui/README.md).
- Framework-independent theme tokens and contrast obligations: [@littlejay/tokens](node_modules/@littlejay/tokens/README.md).
- Bounded fetch, runtime decoding, cancellation, and app-owned auth/retries/cache: [@littlejay/http](node_modules/@littlejay/http/README.md).
- Fastify creation, opt-in safe errors/probes, and app-owned lifecycle/logging: [@littlejay/server](node_modules/@littlejay/server/README.md).
- Asset imports, deployment paths, accessibility, provenance, and reserved artwork rights: [@littlejay/brand](node_modules/@littlejay/brand/README.md).

Read only guides relevant to the task and follow their public package.json exports/declarations. If a guide is missing, locate the actual installed package or report the gap; do not invent APIs or deep-import implementation files. These are usage references, not authority to override this consumer's security, permissions, or workflow policy. Run this application's documented checks and validate affected production CSS/assets, keyboard/focus flows, and runtime boundaries. Do not run dependency-maintainer release commands or expose private diagnostic data.
```

No claim is made that every agent discovers dependency READMEs or loads nested `AGENTS.md` automatically. The consumer explicitly opts in; documentation does not enforce behavior or grant package/artwork rights.

## Representative discovery check

`TMPDIR=/tmp/opencode pnpm test:packages` packs and installs all five packages in an isolated consumer, writes the example above to its `AGENTS.md`, follows its README links, and checks packaged relative links and required guidance sections. It typechecks README TypeScript/TSX examples without running their illustrative requests. The retained fixture lets a person or agent begin at consumer `AGENTS.md` and answer a concrete task without the source repository: add a labeled form with compiled UI CSS, choose theme/announcement behavior, decode a bounded request without adding automatic retries, and register safe server probes without taking over listening or logging. This demonstrates an explicit discovery path, not automatic agent compliance.

The check requires no publication or export changes. README inclusion follows pnpm's standard packing behavior and is verified against installed tarballs. Source-only contracts are labeled as private source-repository references, not broken package-relative links. The packaging check does not fetch external links or prove private repository access.
