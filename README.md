# Little Jay

A minimal monorepo for reusable React components, theme tokens, bounded JSON transport, and Fastify server foundations.

## Run on your workstation

Open a terminal in the `little-jay` directory with Node 26.13.0 LTS (`.node-version`) and pnpm 12.18.0 available. The supported Node range is `^26.13.0`. With fnm, run `fnm install` and `fnm use` in this directory. No global Vite+ installation is needed:

```sh
pnpm install --frozen-lockfile
pnpm secrets:install
git config --local core.hooksPath .githooks
pnpm ready
pnpm dev
```

On this workstation, both required tools are already installed. From a fresh checkout, neither `pnpm ready` nor `pnpm dev` requires existing build output or a Vite+ task cache.

The secret-scanner installer downloads checksum-pinned Gitleaks into ignored `.tools/` (Linux/macOS x64 or ARM64; requires curl, tar, and SHA-256 tooling). Hooks must be enabled in each clone; Git does not activate cloned hooks automatically. Commit scans check staged additions; push scans check all local Git history. Both refuse to proceed if the scanner is missing or ignored files are tracked. Run `pnpm secrets:staged` before committing and `pnpm secrets:scan` to audit history. See [secret handling and limitations](docs/PUBLISHING.md#secret-prevention-and-response).

- Playground: http://localhost:5173
- API: http://127.0.0.1:5050/api/health

`pnpm dev` generates tokens and builds the UI, HTTP, and server packages first, then runs the React playground and API watcher. UI component source edits hot-reload, including their Tailwind classes and component CSS: the playground aliases the UI stylesheet to its workspace source during development only. Production builds still consume packaged compiled CSS. API app edits restart the backend. After editing token sources, HTTP/server libraries, or UI build configuration, restart `pnpm dev` to rebuild them. Branding browser files synchronize automatically on development and production startup.

Stop development with Ctrl+C before running `pnpm build` or `pnpm ready`: clean library builds replace the generated files that the running apps consume.

`pnpm ready` checks formatting/lint, builds packages in dependency order, checks TypeScript (including root tooling), runs tests, and verifies local tarballs. Build before running standalone `pnpm typecheck`, `pnpm test`, or `pnpm test:packages` on a fresh checkout: consumers use built package exports.

Individual checks: `pnpm check`, `pnpm build`, `pnpm typecheck`, `pnpm test`, and `pnpm test:packages`. Check includes generated-token freshness. `pnpm fmt` formats files in place. The tarball check packs all five libraries, installs them into an isolated temporary consumer, checks every export target, exercises HTTP and server plugins, checks strict NodeNext declarations, and builds a React application with brand images and no Tailwind installed. It never publishes. Because the packages are unpublished, the consumer overrides the UI's local brand/tokens dependencies to their tarballs. The temporary consumer path is printed and retained for inspection; set `TMPDIR` to select its parent directory. Installation may need registry access or an existing pnpm store. To preserve running apps' dist files, run production/package checks in an isolated source copy with its own install and build outputs.

## Layout

```text
apps/
  playground/    Searchable component catalog and application-pattern sandbox
  api/           Example server using @ljay/server
packages/
  brand/         @ljay/brand: canonical Pebble artwork and browser assets
  tokens/        @ljay/tokens: framework-independent theme CSS
  ui/            @ljay/ui: controls, workflow feedback, and compiled CSS
  http/          @ljay/http: bounded, decoded JSON requests using platform fetch
  server/        @ljay/server: factory and opt-in error/health/readiness plugins
```

Layers are introduced only when they contain useful code. Radix Dialog supports the modal slice; TypeBox validates one local API endpoint. Each real project owns its application-specific schemas.

## Button

The [component catalog](docs/CATALOG.md) organizes Foundations, Components, and Patterns with searchable navigation, deep-linked examples, usage snippets, props, and accessibility notes. Run `pnpm dev`, then open the printed playground URL. For example, `/#/button/disabled` opens Button's disabled example.

```tsx
import { Button } from "@ljay/ui/button";
import "@ljay/ui/styles.css";

export function Example() {
  return <Button onClick={() => console.log("Clicked")}>Continue</Button>;
}
```

The root `@ljay/ui` export also works. Button forwards native React button props, including ref, disabled, aria attributes, and explicit submit type. Its default type is `button` so it does not accidentally submit forms. It includes keyboard focus and disabled styles. No interaction primitive dependency is needed for a native button.

Compiled component CSS includes the default theme and does not include a global reset. Consumers do not need Tailwind to render the Button. `className` adds classes without resolving conflicts between competing utilities.

## Workflow feedback

These components are designed for run lists, connection feedback, and isolated inspectors, starting with Graph Workbench's needs. They do not know about workflows, approvals, or execution permissions.

```tsx
import { Alert, Button, EmptyState, ErrorBoundary, StatusIndicator } from "@ljay/ui";
import "@ljay/ui/styles.css";

<StatusIndicator tone="warning">Awaiting review</StatusIndicator>;
<Alert tone="danger" title="Connection lost" action={<Button onClick={reload}>Reload</Button>}>
  The last saved checkpoint is still available.
</Alert>;
<EmptyState title="No checkpoints yet">Start a run to create its first checkpoint.</EmptyState>;
<ErrorBoundary resetKey={runId}>
  <CheckpointInspector runId={runId} />
</ErrorBoundary>;
```

Subpath imports also work: `@ljay/ui/alert`, `@ljay/ui/empty-state`, `@ljay/ui/status-indicator`, and `@ljay/ui/error-boundary`. `Alert`, `EmptyState`, and `StatusIndicator` accept native attributes, refs, and `className`. Tone is `neutral`, `info`, `success`, `warning`, or `danger`; applications choose the label and tone, rather than the library interpreting domain states. `EmptyState` has no implicit announcement role. `StatusIndicator` includes caller-supplied text and is not a live region unless the caller requests one. `Alert` defaults to `role="alert"` for danger and `role="status"` otherwise; override `role` (for example, `note`) for static explanatory content.

`ErrorBoundary` catches descendant rendering/lifecycle failures and errors React routes from Actions. Its default fallback exposes no diagnostic message and offers a non-submit retry button. Supply `onError(error, info)` for your own reporting policy; sanitize diagnostic data before sending it anywhere. Supply a static `fallback` node, or `fallback={({ error, reset }) => ...}` for a custom view. `onReset` runs before clearing the error, and changing `resetKey` while failed also resets it—use a run/panel identity, not a frequently changing event cursor. Ordinary rerenders do not reset a failure. Reset remounts the failed subtree, so its effects may run again; it must not trigger an unapproved command or replay a mutation.

Boundaries do not catch server-rendering errors, ordinary event-handler/async failures, or failures in their own fallback. Expected network/validation failures normally belong in `Alert`, preserving drafts and existing data. With TanStack Query's `throwOnError` or suspense queries, pair the boundary's `onReset` with `QueryErrorResetBoundary`'s reset callback. Core UI has no dependency on TanStack Query.

The playground demonstrates a render failure without taking down sibling controls. Its health read uses `@ljay/http` over native `fetch`, the Query-provided abort signal, and TanStack React Query with a 30-second stale window; explicit Refresh requests fresh data. Responses are bounded to 4 KiB, decoded at runtime, and time out after 10 seconds. When offline, Query pauses the request and the UI labels the cached result rather than claiming a fresh check; it resumes on reconnection. No library-owned cache or automatic mutation retries are introduced. See [the transport contract](docs/HTTP.md).

## Inspection and modals

`DescriptionList`, `Disclosure`, `TextBlock`, and `IconButton` are exported at the root and their kebab-case subpaths. DescriptionList uses native `dl` with caller-supplied `dt`/`dd` pairs; Disclosure uses native `details`/`summary`. TextBlock requires a `text` string, escapes it as React text, wraps long lines, and provides a keyboard-focusable scrolling area. Supply a descriptive `aria-label` or `aria-labelledby`; named output defaults to a region, while unnamed output adds no landmark. An explicit role is preserved. It accepts neither children nor HTML injection. IconButton requires a descriptive nonblank `label`, hides its decorative icon from assistive technology, and retains Button's native disabled, non-submit, ref, and focus behavior.

`Dialog`, `DialogTrigger`, `DialogContent`, and `DialogClose` are available at `@ljay/ui/dialog`. Content requires a nonblank visible `title`, supports an optional `description`, and includes a Close button. `variant="sheet"` uses the same modal behavior in a side layout. Controlled `open`/`onOpenChange` and uncontrolled `defaultOpen` use Radix's portal, focus trap/restoration, and dismiss behavior. Keep the trigger mounted for restoration. Portals inherit tokens at their destination: document themes work directly; scoped overrides need `portalContainer` inside that scope. No modal animation or global reset is added.

The focused `@radix-ui/react-dialog@1.3.1` package supports React 19; its [documented APIs](https://www.radix-ui.com/primitives/docs/components/dialog) cover this slice without pulling in an entire widget collection. UI now declares React DOM 19 as a peer alongside React. Catalog pages include safe local interactions and a controlled sheet example at `/#/dialog/sheet`.

## Form components

`Field`, `Input`, `Textarea`, `NativeSelect`, and `Checkbox` are available from `@ljay/ui` or their lowercase subpaths (`@ljay/ui/field`, `@ljay/ui/input`, `@ljay/ui/textarea`, `@ljay/ui/native-select`, `@ljay/ui/checkbox`). They use native elements, React 19 ref props, and compiled reset-free CSS. They have no form-library dependency or internal value state.

```tsx
import { Field, Input, Textarea, NativeSelect, Checkbox } from "@ljay/ui";
import "@ljay/ui/styles.css";

<Field id="run-name" label="Run name" description="A short, recognizable name" required>
  <Input name="name" defaultValue="Review notes" maxLength={80} />
</Field>;
<Field label="Instructions" error={errors.prompt}>
  <Textarea name="prompt" defaultValue={draft.prompt} rows={4} />
</Field>;
<Field label="Mode">
  <NativeSelect name="mode" defaultValue="plan">
    <option value="plan">Plan</option>
    <option value="review">Review</option>
  </NativeSelect>
</Field>;
<Field label="Require review" orientation="horizontal">
  <Checkbox name="review" value="yes" defaultChecked />
</Field>;
```

Use exactly one labelable control per `Field`. `Field.id` names that control, not the wrapper, and takes precedence over a contained control's `id`; put custom IDs on `Field`. Without it, React `useId` supplies stable associations. Standalone controls honor their own IDs and need your own label or accessible name. Multiple independently rendered React roots need distinct `identifierPrefix` values; SSR hydration requires matching prefixes and trees.

`Field` links its label, description, and error to the control. Consumer `aria-describedby` tokens are merged and deduplicated. Only rendered description/error containers are referenced. `required`, `disabled`, and `aria-invalid` default from the field; explicit control props, including `false`, override those defaults. Keep those overrides consistent with your field's required indicator. Explicit `aria-label`/`aria-labelledby` are preserved. Native `fieldset disabled` also works. These flags are presentation/validation conveniences, not authorization controls.

Supply `name` for `FormData`. Use `defaultValue`/`defaultChecked` for uncontrolled inputs, or native `value`/`checked` and `onChange` for application-controlled inputs. `NativeSelect` also supports `multiple` and array defaults. Unchecked checkboxes and disabled controls are omitted from `FormData`; checked checkboxes use their native `value` (or `on` when absent). The checkbox type is fixed. Local errors are not announced assertively by every field; use a submission summary such as `Alert` when appropriate. Field errors do not replace server-side validation.

### State and React 19 Actions

Field context uses React 19's `<Context value>` provider and `use(Context)`. Its memoized value contains only primitive IDs and accessibility flags, not labels, message content, input values, callbacks, or form action state. Changing error wording without changing its presence does not broadcast a new context value. Each field has its own provider; native typing does not update a form-wide store. This limits context-triggered updates, not ordinary parent renders—keep controlled state close to the fields that own it. No blanket component memoization, registration effects, or child cloning is used.

The playground's workflow form uses `useActionState` for submission results and `useFormStatus` under the native form for pending UI. It validates locally and never saves or starts a workflow. Editing after validation marks the result outdated and clears the edited field's previous error without claiming the new value is valid. Revalidation supplies a fresh result. Uncontrolled inputs, textareas, and checkboxes preserve submitted drafts by returning them in action state and updating their defaults before React's reset. React does not apply a changed `defaultValue` to an already-mounted uncontrolled select: the example uses `key={state.draft.mode}` to remount only that select when the submitted default changes. An application-controlled select is another option. A pending native fieldset prevents edits from being overwritten by that reset. Generic controls do not subscribe to pending state. React DOM is a UI peer for the modal portal foundation.

After a submission started with focus inside the workflow form, validation focuses its first invalid control or restores the submit button after success. It does not take focus back if the user has moved elsewhere while validation was pending.

## Forms and data direction

Prefer native controls and React 19 Actions, `useActionState`, and `useFormStatus` for straightforward forms. Client Actions work in Vite; Server Functions require a supporting server framework and are not automatically provided by Fastify. Successful Actions reset uncontrolled fields, including when returning a validation result, so preserve drafts explicitly. React 19 is not a replacement for complex field arrays, field-level validation, or server authorization; adopt a form library only when those needs justify it. See the [React form documentation](https://react.dev/reference/react-dom/components/form).

Use `@ljay/http` for bounded decoded JSON over `fetch` on both client and server. TanStack React Query owns client request caching, invalidation, and query lifecycle. Existing OpenAPI clients and application-specific schemas stay in their owning applications. TypeBox now validates the local `/api/text-preview` example; it does not establish shared domain schemas.

Next priorities are recorded in [the roadmap](docs/ROADMAP.md); these are not implemented packages or changes to Graph Workbench.

## Themes

The [Pebble app-state showcase](docs/PEBBLE-STATES.md) is available at `#pebble-states` in the playground. It demonstrates static loading, success, error, and empty illustrations with local-only Retry/Create project actions.

The approved Pebble branding kit is integrated in `@ljay/brand` and `@ljay/tokens`. The playground applies the active theme to the document, persists explicit light/dark choices, otherwise follows system appearance, and updates browser theme-color. See [branding documentation](docs/BRANDING.md) for canonical files, asset imports, token generation, project overrides, deployment paths, and automatic public-file synchronization. The manifest does not add offline/PWA functionality; no public site URL or social metadata is configured.

Use `@ljay/tokens/theme.css` independently of React. Tailwind projects can import `@ljay/tokens/tailwind.css` after Tailwind to expose semantic utility classes. UI retains `@ljay/ui/theme.css` and `@ljay/ui/tailwind.css` convenience entries.

Override variables after the default theme import:

```css
:root {
  --lj-primary: #7c3aed;
  --lj-radius-control: 0.25rem;
}
```

Set `data-theme="dark"` on an ancestor for the dark palette, or `data-theme="light"` to restore the light palette inside a dark section. Project overrides can also be scoped to a container. The playground consumes the compiled UI CSS and scans local UI source for hot updates.

## Server

```ts
import { createServer } from "@ljay/server";

const server = createServer({ logger: true });
server.get("/hello", async () => ({ message: "Hello" }));
await server.listen({ port: 5050, host: "127.0.0.1" });
// Call server.close() during shutdown.
```

The factory returns a normal Fastify instance. It does not bind a port, add routes, or install process listeners. The consuming app owns lifecycle, plugins, and route composition. `safeErrorsPlugin` adds canonical safe error/not-found responses only when registered; `healthRoutes` adds configurable liveness/readiness paths with injected checks only when registered. See [server contracts](docs/SERVER.md) and `apps/api` for graceful shutdown, explicit safe request-logging policy, probes, and the validated stateless text-preview endpoint.

## Ports

Defaults: API 5050 on `127.0.0.1`, playground 5173 (tries the next available port if occupied; check the terminal for its URL). Override `PORT` and `HOST` for the API; `WEB_PORT` for the playground; `API_PROXY_TARGET` if the API URL changes. For example, on Linux/macOS:

```sh
PORT=8080 WEB_PORT=5174 API_PROXY_TARGET=http://127.0.0.1:8080 pnpm dev
```

In PowerShell:

```powershell
$env:PORT = '8080'
$env:API_PROXY_TARGET = 'http://127.0.0.1:8080'
pnpm dev
```

The Vite proxy is development-only. Production deployments need a matching reverse proxy or an explicitly configured API URL.

## Tooling and distribution

pnpm workspaces link packages; Vite+ supplies build orchestration, formatting, linting, tests, and package builds. CI runs a frozen install and `pnpm ready`.

The packages are local and private. `@ljay` remains provisional; nothing is published to npm or pushed to GitHub. Confirm scope ownership before any future npm publishing. This directory currently has no Git metadata; CI is configured but requires a GitHub repository to run remotely. A public GitHub repository does not publish npm packages, and `private: true` does not hide files in a public repository.

## License and artwork

Project-authored code and documentation are available under the [MIT License](LICENSE). Third-party material retains its own terms and notices.

The Little Jay/Pebble logos, mascot, icons, banners, and illustrations in `packages/brand` and their generated copies are **not covered by the MIT license grant**. Their creator reports creating the artwork using ChatGPT. No separate artwork reuse license or trademark permission is granted; any rights held in the artwork remain reserved. See [brand provenance and rights](packages/brand/README.md#provenance-and-rights) and retain the existing font notices. AI-assisted provenance does not establish copyright protection, exclusivity, or trademark clearance.

Before making the repository public, complete the [public-repository checklist](docs/PUBLISHING.md), including review of the exact initial commit and any history. This documentation does not authorize a push, publication, or deployment.

## Agentic coding

Start with [AGENTS.md](AGENTS.md), then read the guidance in `apps/` or `packages/` and the specific workspace being changed. These files document pnpm commands, focused verification, architecture boundaries, generated sources, and isolated local servers. Keep shared rules at the root and add only area-specific rules below it. `.ignore` excludes dependencies and generated output from tools such as ripgrep even before Git is initialized; it does not restrict tool permissions or packaging.
