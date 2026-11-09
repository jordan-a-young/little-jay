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
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableScroll,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@littlejay/ui";
import { CatalogAncestorLink } from "../navigation.js";

export function BreadcrumbExample() {
  return (
    <Breadcrumb aria-label="Example breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <CatalogAncestorLink pageId="introduction">Introduction</CatalogAncestorLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function LongBreadcrumbExample() {
  return (
    <Breadcrumb aria-label="Long-label example breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <CatalogAncestorLink pageId="introduction">Introduction</CatalogAncestorLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <CatalogAncestorLink pageId="breadcrumb">Breadcrumb</CatalogAncestorLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbSeparator>›</BreadcrumbSeparator>
          <BreadcrumbPage>{"long-current-location-".repeat(10)}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function TableExample() {
  const [inspections, setInspections] = useState(0);
  return (
    <>
      <TableScroll aria-label="Local draft table">
        <Table style={{ minWidth: "36rem" }}>
          <TableCaption>Local drafts. Nothing is saved or sent.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Draft</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableHead scope="row">{"long-local-draft-name-".repeat(6)}</TableHead>
              <TableCell>Unsaved</TableCell>
              <TableCell>
                <Button onClick={() => setInspections((count) => count + 1)}>
                  Inspect locally
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableHead scope="row">Notes</TableHead>
              <TableCell>Local only</TableCell>
              <TableCell>No action needed</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>2 local drafts</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableScroll>
      <p role="status">Local inspections: {inspections}</p>
    </>
  );
}

export function EmptyTableExample() {
  return (
    <TableScroll aria-label="Empty local draft table">
      <Table>
        <TableCaption>Caller-owned empty content</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Draft</TableHead>
            <TableHead>State</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2}>
              No local drafts. This message belongs to the application.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableScroll>
  );
}

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

export function PendingDialogExample() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
    >
      <DialogTrigger>Open pending dialog demo</DialogTrigger>
      <DialogContent
        title="Local pending simulation"
        description="Toggle synthetic pending state. Nothing is saved or sent."
        closeDisabled={pending}
        closeLabel="Close pending dialog demo"
        dismissOnEscape={!pending}
        dismissOnOutsidePress={!pending}
      >
        <Button aria-pressed={pending} onClick={() => setPending((current) => !current)}>
          Simulate pending
        </Button>
        <p role="status">
          {pending
            ? "Pending simulation: finish by toggling Simulate pending off to enable dismissal."
            : "Ready: Close, Escape and outside click can dismiss the dialog."}
        </p>
        <p>
          closeDisabled affects only the built-in Close button. This example separately prevents
          Escape and outside dismissal with explicit flags and guards controlled open state. All
          dismissal decisions remain application-owned.
        </p>
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
