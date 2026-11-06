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
} from "@ljay/ui";

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
