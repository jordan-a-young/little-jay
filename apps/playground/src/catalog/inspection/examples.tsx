import { useState } from "react";
import {
  DescriptionList,
  Disclosure,
  TextBlock,
  IconButton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
  Tabs,
  Field,
  Input,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@littlejay/ui";

export function CardExample() {
  const [inspections, setInspections] = useState(0);
  return (
    <Card>
      <CardHeader>
        <h3 className="m-0 font-semibold">Local draft</h3>
        <p>Composed content and actions. Nothing is saved or sent.</p>
      </CardHeader>
      <CardContent>
        <Field label="Card draft">
          <Input defaultValue="Keep these unsaved notes" />
        </Field>
        <p>{"long-draft-identifier-".repeat(8)}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={() => setInspections((count) => count + 1)}>Inspect locally</Button>
        <p role="status">Local inspections: {inspections}</p>
      </CardFooter>
    </Card>
  );
}

export function MinimalCardExample() {
  return (
    <Card>
      <CardContent>A simple content surface. Sections and actions are optional.</CardContent>
    </Card>
  );
}

function LocalDraft() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Field label="Local draft">
        <Input defaultValue="Keep these unsaved notes" />
      </Field>
      <Button onClick={() => setCount(count + 1)}>Count locally: {count}</Button>
      <p>Switch panels and return: the draft and count are preserved. No records or requests.</p>
    </div>
  );
}

const localTabs = [
  { value: "draft", label: "Draft", content: <LocalDraft /> },
  {
    value: "preview",
    label: "Preview",
    content: <p>Local preview only. Arrow keys focus; Enter or Space activates.</p>,
  },
  { value: "unavailable", label: "Unavailable", disabled: true, content: null },
];

export function TabsExample() {
  return <Tabs label="Local document views" items={localTabs} />;
}

export function ControlledTabsExample() {
  const [value, setValue] = useState("preview");
  return (
    <div>
      <Button onClick={() => setValue("draft")}>Select draft externally</Button>
      <Tabs
        label="Controlled local views"
        items={localTabs}
        value={value}
        onValueChange={setValue}
      />
      <p role="status">Selected panel: {value}. Local-only application state.</p>
    </div>
  );
}

export function MetadataExample() {
  return (
    <DescriptionList aria-label="Checkpoint metadata">
      <dt>Name</dt>
      <dd>Local preview</dd>
      <dt>State</dt>
      <dd>Saved draft</dd>
      <dt>Identifier</dt>
      <dd>{"local-preview-".repeat(8)}</dd>
    </DescriptionList>
  );
}

export function DisclosureExample() {
  return (
    <Disclosure summary="Inspect saved metadata">
      <MetadataExample />
    </Disclosure>
  );
}

export function TextExample() {
  return (
    <TextBlock
      aria-label="Inert artifact output"
      text={'<script>alert("This remains text")</script>\n' + "A-very-long-token-".repeat(50)}
    />
  );
}

function RefreshIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      focusable="false"
    >
      <path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" />
    </svg>
  );
}

export function IconExample() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <IconButton label="Refresh local preview" onClick={() => setCount(count + 1)}>
        <RefreshIcon />
      </IconButton>{" "}
      <IconButton label="Refresh unavailable" disabled>
        <RefreshIcon />
      </IconButton>
      <p role="status">Local refreshes: {count}</p>
    </div>
  );
}

export function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger>Open local dialog</DialogTrigger>
      <DialogContent
        title="Inspect local draft"
        description="This preview does not save or execute anything."
      >
        <TextBlock text="Only escaped text is displayed here." />
        <DialogClose>Done inspecting</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export function SheetExample() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>Open metadata sheet</DialogTrigger>
      <DialogContent
        variant="sheet"
        title="Checkpoint metadata"
        description="Read-only local example."
      >
        <MetadataExample />
      </DialogContent>
    </Dialog>
  );
}
