import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite-plus";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = process.env.TMPDIR ?? tmpdir();
const consumer = await mkdtemp(path.join(temporaryRoot, "little-jay-pack-"));
const pnpm = process.env.npm_execpath;
assert.ok(pnpm, "Run package checks with pnpm test:packages");
const pnpmIsScript = /\.(?:cjs|mjs|js)$/i.test(pnpm);

function run(arguments_, cwd) {
  execFileSync(
    pnpmIsScript ? process.execPath : pnpm,
    pnpmIsScript ? [pnpm, ...arguments_] : arguments_,
    {
      cwd,
      stdio: "inherit",
    },
  );
}

const dependencies = {
  react: "19.3.1",
  "react-dom": "19.3.1",
  "@types/react": "19.3.0",
  "@types/react-dom": "19.3.0",
  "@types/node": "26.6.6",
};

for (const name of ["brand", "tokens", "ui", "server", "http"]) {
  run(["pack", "--pack-destination", consumer], path.join(workspace, "packages", name));
  dependencies[`@littlejay/${name}`] = `file:./littlejay-${name}-0.0.0.tgz`;
}

await writeFile(
  path.join(consumer, "package.json"),
  JSON.stringify({ name: "little-jay-consumer", private: true, type: "module", dependencies }),
);
await writeFile(
  path.join(consumer, "pnpm-workspace.yaml"),
  'overrides:\n  "@littlejay/tokens": file:./littlejay-tokens-0.0.0.tgz\n  "@littlejay/brand": file:./littlejay-brand-0.0.0.tgz\n',
);
run(["install", "--ignore-scripts"], consumer);

async function checkDocumentationLinks(directory, filename, visited = new Set()) {
  const resolved = path.resolve(directory, filename);
  const relative = path.relative(directory, resolved);
  assert.ok(
    !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative),
    `Documentation link escapes package: ${filename}`,
  );
  if (visited.has(resolved)) return;
  visited.add(resolved);
  const markdown = await readFile(resolved, "utf8");
  const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
    const target = match[1];
    if (/^https?:\/\//.test(target) || target.startsWith("mailto:")) continue;
    assert.ok(!/^[a-z][a-z\d+.-]*:/i.test(target), `Unsupported documentation URL: ${target}`);
    const [pathname, fragment] = target.split("#");
    const linked = pathname
      ? path.resolve(path.dirname(resolved), decodeURIComponent(pathname))
      : resolved;
    const linkedRelative = path.relative(directory, linked);
    assert.ok(
      linkedRelative !== ".." &&
        !linkedRelative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(linkedRelative),
      `Documentation link escapes package: ${target}`,
    );
    await access(linked);
    if (fragment) {
      assert.match(linked, /\.md$/i, `Fragment requires Markdown target: ${target}`);
      const content = await readFile(linked, "utf8");
      const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) =>
        heading[1]
          .toLowerCase()
          .replace(/[^\p{L}\p{N}_\s-]/gu, "")
          .replace(/\s/g, "-"),
      );
      assert.ok(headings.includes(decodeURIComponent(fragment)), `Missing heading: ${target}`);
    }
    if (/\.md$/i.test(linked)) {
      await checkDocumentationLinks(directory, linkedRelative, visited);
    }
  }
}

const documentationFixture = path.join(consumer, "documentation-regression");
await mkdir(documentationFixture);
await assert.rejects(checkDocumentationLinks(documentationFixture, "README.md"), {
  code: "ENOENT",
});
await writeFile(path.join(documentationFixture, "README.md"), "[missing](missing.md)");
await assert.rejects(checkDocumentationLinks(documentationFixture, "README.md"), {
  code: "ENOENT",
});
await writeFile(path.join(documentationFixture, "README.md"), "[escape](../package.json)");
await assert.rejects(checkDocumentationLinks(documentationFixture, "README.md"), /escapes package/);
await writeFile(path.join(documentationFixture, "README.md"), "# Present\n[missing](#absent)");
await assert.rejects(checkDocumentationLinks(documentationFixture, "README.md"), /Missing heading/);
await writeFile(path.join(documentationFixture, "README.md"), "# Present\n[valid](#present)");
await checkDocumentationLinks(documentationFixture, "README.md");

const consumerGuide = await readFile(path.join(workspace, "docs/CONSUMER-AGENTS.md"), "utf8");
const consumerInstructions = consumerGuide.match(/```markdown\n([\s\S]*?)\n```/);
assert.ok(consumerInstructions, "Consumer guide must contain an AGENTS.md example");
await writeFile(path.join(consumer, "AGENTS.md"), consumerInstructions[1]);
const installedInstructions = await readFile(path.join(consumer, "AGENTS.md"), "utf8");
const discoveredGuides = [
  ...installedInstructions.matchAll(/\]\((node_modules\/@littlejay\/[^)]+)\)/g),
];
assert.deepEqual(
  discoveredGuides.map((match) => match[1]).sort(),
  ["brand", "http", "server", "tokens", "ui"].map(
    (name) => `node_modules/@littlejay/${name}/README.md`,
  ),
  "Consumer instructions must lead to each installed package README",
);
for (const [, guide] of discoveredGuides) {
  const directory = path.dirname(path.join(consumer, guide));
  await checkDocumentationLinks(directory, "README.md");
  const content = await readFile(path.join(consumer, guide), "utf8");
  for (const heading of ["Imports", "Application policy", "Verification"]) {
    assert.match(content, new RegExp(`^## .*${heading}`, "im"), `${guide}: missing ${heading}`);
  }
  assert.match(
    content,
    /^## (License|Provenance and rights)$/m,
    `${guide}: missing rights guidance`,
  );
  for (const [index, snippet] of [...content.matchAll(/```(tsx|ts)\n([\s\S]*?)\n```/g)].entries()) {
    await writeFile(
      path.join(consumer, `documented-${path.basename(directory)}-${index}.${snippet[1]}`),
      snippet[2],
    );
  }
}
console.log("Consumer AGENTS.md discovers all five installed READMEs; packaged links verified.");

const stateSource = path.join(consumer, "node_modules/@littlejay/brand/states");
const stateManifest = JSON.parse(await readFile(path.join(stateSource, "manifest.json"), "utf8"));
const statePublic = path.join(consumer, "public/branding/states");
await mkdir(statePublic, { recursive: true });
for (const illustration of Object.values(stateManifest)) {
  await copyFile(
    path.join(stateSource, illustration.file),
    path.join(statePublic, illustration.file),
  );
}

async function checkExportTargets(directory, target) {
  if (typeof target === "string") {
    assert.ok(target.startsWith("./"), `Unexpected export target: ${target}`);
    await access(path.join(directory, target));
  } else {
    for (const value of Object.values(target)) await checkExportTargets(directory, value);
  }
}

for (const name of ["brand", "tokens", "ui", "server", "http"]) {
  const directory = path.join(consumer, "node_modules", "@littlejay", name);
  const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  assert.equal(manifest.private, true);
  await checkExportTargets(directory, manifest.exports);
  assert.ok(!JSON.stringify(manifest).includes("workspace:"));
  if (name === "brand") {
    for (const excluded of [
      "preview.png",
      "mascot/pebble-original.png",
      "little-jay-brand-kit.zip",
    ])
      await assert.rejects(access(path.join(directory, excluded)));
  }
  if (name === "ui") {
    assert.equal(manifest.peerDependencies.react, "^19.0.0");
    assert.equal(manifest.peerDependencies["react-dom"], "^19.0.0");
    assert.equal(manifest.dependencies.react, undefined);
    const outputFiles = await readdir(path.join(directory, "dist"));
    const modules = await Promise.all(
      outputFiles
        .filter((file) => file.endsWith(".js"))
        .map((file) => readFile(path.join(directory, "dist", file), "utf8")),
    );
    assert.match(modules.join("\n"), /from ["']react\/jsx-runtime["']/);
  }
}

await writeFile(
  path.join(consumer, "server.mjs"),
  `import assert from "node:assert/strict";
import { createServer, healthRoutes, safeErrorsPlugin } from "@littlejay/server";
import { fetchJson, HttpError } from "@littlejay/http";
const before = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
const server = createServer({ exposeHeadRoutes: false });
try {
  assert.deepEqual([process.listeners("SIGINT"), process.listeners("SIGTERM")], before);
  server.get("/consumer", async () => ({ ok: true }));
  server.register(safeErrorsPlugin);
  server.register(healthRoutes, { prefix: "/probes", checks: [async () => false] });
  server.get("/failure", async () => { throw new Error("private diagnostic"); });
  assert.deepEqual((await server.inject("/consumer")).json(), { ok: true });
  assert.equal((await server.inject({ method: "HEAD", url: "/consumer" })).statusCode, 404);
  assert.equal(server.server.listening, false);
  assert.deepEqual((await server.inject("/probes/health")).json(), { status: "ok" });
  assert.equal((await server.inject("/probes/ready")).statusCode, 503);
  assert.deepEqual((await server.inject("/failure")).json(), { statusCode: 500, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  assert.equal(await fetchJson("https://example.test", { fetch: async () => Response.json({ ok: true }), decode: (value) => value.ok }), true);
  await assert.rejects(fetchJson("https://example.test/private", { fetch: async () => new Response("secret", { status: 500 }), decode: (value) => value }), (error) => error instanceof HttpError && error.code === "status" && !String(error).includes("secret"));
} finally {
  await server.close();
}
`,
);
execFileSync(process.execPath, ["server.mjs"], { cwd: consumer, stdio: "inherit" });

await writeFile(
  path.join(consumer, "index.html"),
  '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Little Jay package consumer</title><link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/main.tsx"></script></html>',
);
await writeFile(
  path.join(consumer, "main.tsx"),
  `import { useActionState, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useFormStatus } from "react-dom";
import { Button, Alert as RootAlert, LoadingIndicator as RootLoadingIndicator, type LoadingIndicatorProps as RootLoadingIndicatorProps, type AlertProps as RootAlertProps, type ButtonVariant as RootButtonVariant } from "@littlejay/ui";
import { Button as SubpathButton, type ButtonProps, type ButtonVariant } from "@littlejay/ui/button";
import { Alert, type AlertProps } from "@littlejay/ui/alert";
import { EmptyState } from "@littlejay/ui/empty-state";
import { PebbleState, type PebbleStateProps } from "@littlejay/ui/pebble-state";
import { StatusIndicator } from "@littlejay/ui/status-indicator";
import { LoadingIndicator, type LoadingIndicatorProps } from "@littlejay/ui/loading-indicator";
import { ErrorBoundary } from "@littlejay/ui/error-boundary";
import { Field } from "@littlejay/ui/field";
import { Input, type InputProps } from "@littlejay/ui/input";
import { Textarea } from "@littlejay/ui/textarea";
import { NativeSelect } from "@littlejay/ui/native-select";
import { Checkbox } from "@littlejay/ui/checkbox";
import { Switch, type SwitchProps } from "@littlejay/ui/switch";
import { Switch as RootSwitch, type SwitchProps as RootSwitchProps } from "@littlejay/ui";
import { DescriptionList, type DescriptionListProps } from "@littlejay/ui/description-list";
import { Disclosure, type DisclosureProps } from "@littlejay/ui/disclosure";
import { TextBlock, type TextBlockProps } from "@littlejay/ui/text-block";
import { IconButton, type IconButtonProps } from "@littlejay/ui/icon-button";
import { Dialog, DialogTrigger, DialogContent, DialogClose, type DialogProps, type DialogTriggerProps, type DialogContentProps, type DialogCloseProps } from "@littlejay/ui/dialog";
import { Tabs, type TabsProps, type TabsItem } from "@littlejay/ui/tabs";
import { Tabs as RootTabs, type TabsProps as RootTabsProps, type TabsItem as RootTabsItem } from "@littlejay/ui";
import { fetchJson, HttpError, type FetchJsonOptions, type HttpErrorCode } from "@littlejay/http";
import type { HealthRoutesOptions, SafeErrorResponse, healthRoutes, safeErrorsPlugin } from "@littlejay/server";
import logoLight from "@littlejay/brand/logos/lockup-light.svg";
import logoDark from "@littlejay/brand/logos/lockup-dark.svg";
import pebblePng from "@littlejay/brand/mascot/pebble.png";
import type { createServer, FastifyInstance } from "@littlejay/server";
import "@littlejay/ui/styles.css";
import "./overrides.css";
type ServerResult = ReturnType<typeof createServer>;
const serverTypecheck: ServerResult | FastifyInstance | undefined = undefined;
void serverTypecheck;
type Assert<Condition extends true> = Condition;
type MatchingSwitchProps = Assert<RootSwitchProps extends SwitchProps ? SwitchProps extends RootSwitchProps ? true : false : false>;
type FixedSwitchSemantics = Assert<Extract<"type" | "role" | "aria-checked", keyof SwitchProps> extends never ? true : false>;
const switchContracts: [MatchingSwitchProps, FixedSwitchSemantics] = [true, true];
void switchContracts;
type MatchingButtonVariants = Assert<RootButtonVariant extends ButtonVariant ? ButtonVariant extends RootButtonVariant ? true : false : false>;
type ValidButtonVariants = Assert<"unsupported" extends ButtonVariant ? false : true>;
type AlertDismissContract = Assert<AlertProps["onDismiss"] extends (() => void) | undefined ? true : false>;
type MatchingAlertProps = Assert<RootAlertProps extends AlertProps ? AlertProps extends RootAlertProps ? true : false : false>;
type OptionalLoadingText = Assert<{} extends LoadingIndicatorProps ? true : false>;
type MatchingLoadingProps = Assert<RootLoadingIndicatorProps extends LoadingIndicatorProps ? LoadingIndicatorProps extends RootLoadingIndicatorProps ? true : false : false>;
type MatchingTabsProps = Assert<RootTabsProps extends TabsProps ? TabsProps extends RootTabsProps ? true : false : false>;
type MatchingTabsItems = Assert<RootTabsItem extends TabsItem ? TabsItem extends RootTabsItem ? true : false : false>;
const tabsItems = [
  { value: "draft", label: "Draft", content: <Field label="External tab draft"><Input defaultValue="Preserved consumer draft" /></Field> },
  { value: "preview", label: "Preview", content: <p>External preview; manually activated.</p> },
  { value: "disabled", label: "Disabled", content: null, disabled: true },
] satisfies readonly TabsItem[];
const tabsContracts: [MatchingTabsProps, MatchingTabsItems] = [true, true];
void tabsContracts;
const dismissibleAlertProps = { onDismiss: () => {}, dismissLabel: "Dismiss consumer notice" } satisfies AlertProps;
const buttonVariants = ["primary", "secondary", "outline", "ghost", "danger"] as const satisfies readonly ButtonVariant[];
type RequiredLabel = Assert<{} extends Pick<IconButtonProps, "label"> ? false : true>;
type InertText = Assert<"dangerouslySetInnerHTML" extends keyof TextBlockProps ? false : true>;
type PublicContracts = [DescriptionListProps, DisclosureProps, TextBlockProps, IconButtonProps, DialogProps, DialogTriggerProps, DialogContentProps, DialogCloseProps, FetchJsonOptions<boolean>, HttpErrorCode, HealthRoutesOptions, SafeErrorResponse, typeof healthRoutes, typeof safeErrorsPlugin, RequiredLabel, InertText, MatchingButtonVariants, ValidButtonVariants, AlertDismissContract, MatchingAlertProps, OptionalLoadingText, MatchingLoadingProps];
const publicContracts: PublicContracts | undefined = undefined;
void publicContracts;
void fetchJson;
void HttpError;
const nativeProps: ButtonProps = { name: "action", value: "save" };
const inputProps: InputProps = { autoComplete: "off", maxLength: 80 };
function SubmitFields() {
  const { pending } = useFormStatus();
  return <SubpathButton type="submit" disabled={pending}>{pending ? "Saving fields…" : "Save fields"}</SubpathButton>;
}
function NativeForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(async (_previous: { name: string; prompt: string; mode: string; review: boolean; submitted: boolean }, data: FormData) => ({
    name: String(data.get("name") ?? ""), prompt: String(data.get("prompt") ?? ""), mode: String(data.get("mode") ?? ""), review: data.get("review") === "yes", submitted: true,
  }), { name: "Example", prompt: "Draft notes", mode: "plan", review: false, submitted: false });
  return <section aria-label="External native form">
    <form action={action}>
      <Field id="consumer-name" label="External name" required description="Name help" error={state.submitted ? "Example validation error; draft preserved" : undefined}>
        <Input {...inputProps} ref={inputRef} name="name" defaultValue={state.name} />
      </Field>
      <Field label="External prompt"><Textarea name="prompt" defaultValue={state.prompt} /></Field>
      <Field label="External mode"><NativeSelect key={state.mode} name="mode" defaultValue={state.mode}><option value="plan">Plan</option><option value="review">Review</option></NativeSelect></Field>
      <Field label="External review" orientation="horizontal"><Checkbox name="review" value="yes" defaultChecked={state.review} /></Field>
      <Field label="External notifications" orientation="horizontal" error="Example switch error"><Switch name="notifications" defaultChecked /></Field>
      <Field label="External controlled switch" orientation="horizontal"><RootSwitch checked={state.review} onChange={() => {}} /></Field>
      <Field label="External disabled" disabled><Input name="disabled" defaultValue="Unavailable" /></Field>
      <SubmitFields />
    </form>
    <Button onClick={() => inputRef.current?.focus()}>Focus input ref</Button>
    {state.submitted && <Alert tone="warning">External draft preserved</Alert>}
    <div data-theme="dark"><Field label="Dark input"><Input defaultValue="Dark control" /></Field></div>
    <div className="project"><Field label="Project input"><Input defaultValue="Project control" /></Field></div>
  </section>;
}
function Panel({ broken }: { broken: boolean }) {
  if (broken) throw new Error("Private external diagnostic");
  return <EmptyState title="No checkpoints yet">Awaiting a workflow step.</EmptyState>;
}
function ExternalDismissibleAlert({ theme }: { theme: "light" | "dark" }) {
  const [visible, setVisible] = useState(true);
  const [submits, setSubmits] = useState(0);
  const showButton = useRef<HTMLButtonElement>(null);
  return <section data-theme={theme} aria-label={"External " + theme + " dismissal"}>
    <Button ref={showButton} onClick={() => setVisible(true)}>Show {theme} notice</Button>
    <form onSubmit={event => { event.preventDefault(); setSubmits(count => count + 1); }}>
      {visible && <Alert role="note" title="External dismissible notice" dismissLabel={"Dismiss external " + theme + " notice"} onDismiss={() => { setVisible(false); showButton.current?.focus(); }}>
        Dismissal changes local state only; saved drafts remain available.
      </Alert>}
    </form>
    <p role="status">Submits: {submits}; visible: {String(visible)}</p>
  </section>;
}
function App() {
  const ref = useRef<HTMLButtonElement>(null);
  const [clicks, setClicks] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [focused, setFocused] = useState(false);
  const [broken, setBroken] = useState(false);
  return <>
    <h1>External package consumer</h1>
    <img src={logoLight} alt="Little Jay" width={275} height={75} />
    <div data-theme="dark"><img src={logoDark} alt="Little Jay on dark" width={275} height={75} /></div>
    <img src={pebblePng} alt="" width={128} height={128} />
    <PebbleState {...{ state: "empty", heading: "No projects yet.", assetBaseUrl: "/branding/" } satisfies PebbleStateProps} />
    <form onSubmit={(event) => { event.preventDefault(); setSubmits(submits + 1); }}>
      <Button {...nativeProps} ref={ref} onClick={() => setClicks(clicks + 1)}>Count</Button>
      <SubpathButton type="submit">Submit</SubpathButton>
      <Button disabled onClick={() => setClicks(999)}>Disabled</Button>
      <button type="button" onClick={() => { ref.current?.focus(); setFocused(ref.current === document.activeElement); }}>Focus ref</button>
    </form>
    <p role="status">Clicks: {clicks}; submits: {submits}; ref: {String(focused)}</p>
    <div data-theme="dark"><Button>Dark</Button><div data-theme="light"><Button>Nested light</Button></div></div>
    <div className="project"><Button>Override</Button></div>
    <section aria-label="External button variants">
      {(["light", "dark"] as const).map(theme => <div key={theme} data-theme={theme}>
        {buttonVariants.map(variant => <div key={variant}>
          <Button variant={variant}>{variant}</Button>
          <SubpathButton variant={variant} disabled>{variant} disabled</SubpathButton>
        </div>)}
      </div>)}
    </section>
    <NativeForm />
    <section aria-label="External inspection components">
      <Disclosure summary="Metadata"><DescriptionList><dt>State</dt><dd>Local preview</dd></DescriptionList></Disclosure>
      <TextBlock aria-label="Inert output" text={'<script>alert("inert")</script>'} />
      <IconButton label="Count local preview" variant="ghost" onClick={() => setClicks(clicks + 1)}><span>+</span></IconButton>
      <IconButton label="Unavailable action" disabled><span>+</span></IconButton>
      <Dialog><DialogTrigger>Open external dialog</DialogTrigger><DialogContent title="External dialog" description="Local package fixture."><DialogClose>Done</DialogClose></DialogContent></Dialog>
      <Dialog><DialogTrigger>Open external sheet</DialogTrigger><DialogContent title="External sheet" variant="sheet"><TextBlock text="Safe text" /></DialogContent></Dialog>
      <Tabs label="External content views" items={tabsItems} />
      <div data-theme="dark"><RootTabs label="External controlled views" items={tabsItems} value="preview" onValueChange={() => {}} /></div>
    </section>
    <section aria-label="External workflow feedback">
      <section aria-label="External loading indicators">
        {(["light", "dark"] as const).map(theme => <div key={theme} data-theme={theme}>
          <RootLoadingIndicator />
          <LoadingIndicator label="Loading consumer preview…" />
        </div>)}
      </section>
      <RootAlert role="note" {...dismissibleAlertProps}>Caller keeps this root-import Alert visible after dismissal.</RootAlert>
      <ExternalDismissibleAlert theme="light" />
      <ExternalDismissibleAlert theme="dark" />
      <StatusIndicator tone="warning">Awaiting review</StatusIndicator>
      <Alert title="Connection lost" tone="danger">Viewing the last saved checkpoint.</Alert>
      <div data-theme="dark"><Alert tone="warning">Dark feedback</Alert></div>
      <div className="project"><Alert tone="danger">Project feedback</Alert></div>
      <Button disabled={broken} onClick={() => setBroken(true)}>Break external panel</Button>
      <ErrorBoundary onReset={() => setBroken(false)}><Panel broken={broken} /></ErrorBoundary>
    </section>
  </>;
}
createRoot(document.getElementById("root")!).render(<App />);
`,
);
await writeFile(
  path.join(consumer, "overrides.css"),
  ".project { --lj-primary: #7c3aed; --lj-danger: #7c3aed; --lj-border: #7c3aed; --lj-radius-control: 0.25rem; }",
);
await writeFile(
  path.join(consumer, "styles.d.ts"),
  'declare module "*.css" {}\ndeclare module "*.svg" { const source: string; export default source; }\ndeclare module "*.png" { const source: string; export default source; }\n',
);
await writeFile(
  path.join(consumer, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ["node", "react", "react-dom"],
    },
    include: ["main.tsx", "styles.d.ts", "documented-*.tsx", "documented-*.ts"],
  }),
);
run(["exec", "tsc", "-p", path.join(consumer, "tsconfig.json")], workspace);
await build({
  root: consumer,
  configFile: false,
  build: { outDir: "dist" },
});
console.log(`Package checks passed. Tailwind-free browser fixture: ${consumer}`);
