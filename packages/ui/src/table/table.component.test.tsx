import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableScroll,
} from "./index.js";
import { Button } from "../button/index.js";

describe("Table", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([
    [Table, "table", "lj-table"],
    [TableHeader, "thead", "lj-table-header"],
    [TableBody, "tbody", "lj-table-body"],
    [TableFooter, "tfoot", "lj-table-footer"],
    [TableRow, "tr", "lj-table-row"],
    [TableHead, "th", "lj-table-head"],
    [TableCell, "td", "lj-table-cell"],
    [TableCaption, "caption", "lj-table-caption"],
    [TableScroll, "div", "lj-table-scroll"],
  ] as const)(
    "forwards native props/ref and additive styling to %s",
    async (Component, tag, className) => {
      let reference: HTMLElement | null = null;
      const onClick = vi.fn();
      const content = <>{"<script>inert content</script>"}</>;
      let children: ReactNode = content;
      if (tag === "table" || tag === "div")
        children = (
          <tbody>
            <tr>
              <td>{content}</td>
            </tr>
          </tbody>
        );
      if (["thead", "tbody", "tfoot"].includes(tag))
        children = (
          <tr>
            <td>{content}</td>
          </tr>
        );
      if (tag === "tr") children = <td>{content}</td>;
      if (tag === "div") children = <table>{children}</table>;
      let element = (
        <Component
          ref={(value: HTMLElement | null) => {
            reference = value;
          }}
          id="native-table-element"
          aria-label="Native example"
          data-source="test"
          className="consumer-class"
          hidden
          onClick={onClick}
        >
          {children}
        </Component>
      );
      if (["th", "td"].includes(tag))
        element = (
          <table>
            <tbody>
              <tr>{element}</tr>
            </tbody>
          </table>
        );
      else if (tag === "tr")
        element = (
          <table>
            <tbody>{element}</tbody>
          </table>
        );
      else if (["thead", "tbody", "tfoot", "caption"].includes(tag))
        element = <table>{element}</table>;
      await act(() => root.render(element));
      const native = container.querySelector<HTMLElement>("#native-table-element")!;
      expect(reference).toBe(native);
      expect(native.tagName.toLowerCase()).toBe(tag);
      expect(native.classList.contains(className)).toBe(true);
      expect(native.classList.contains("consumer-class")).toBe(true);
      expect(native.getAttribute("data-source")).toBe("test");
      expect(native.hidden).toBe(true);
      expect(native.textContent).toBe("<script>inert content</script>");
      expect(native.querySelector("script")).toBeNull();
      expect(native.getAttribute("role")).toBe(tag === "div" ? "region" : null);
      expect(native.hasAttribute("tabindex")).toBe(tag === "div");
      await act(() => native.click());
      expect(onClick).toHaveBeenCalledOnce();
    },
  );

  it("preserves native caption, header relationships, spans and footer without grid behavior", async () => {
    await act(() =>
      root.render(
        <TableScroll aria-label="Draft summary">
          <Table>
            <TableCaption>Local drafts</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead id="name">Name</TableHead>
                <TableHead id="state">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableHead scope="row" id="draft">
                  Draft A
                </TableHead>
                <TableCell headers="draft state" rowSpan={2}>
                  Local only
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell headers="name">Draft B</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Two drafts</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableScroll>,
      ),
    );
    const table = container.querySelector("table")!;
    expect(table.caption?.textContent).toBe("Local drafts");
    expect(table.tHead?.rows[0]?.cells[0]?.scope).toBe("col");
    expect(table.tBodies[0]?.rows[0]?.cells[0]?.scope).toBe("row");
    expect(table.tBodies[0]?.rows[0]?.cells[1]?.headers).toBe("draft state");
    expect(table.tBodies[0]?.rows[0]?.cells[1]?.rowSpan).toBe(2);
    expect(table.tFoot?.rows[0]?.cells[0]?.colSpan).toBe(2);
    expect(container.querySelector('[role="grid"], [aria-selected]')).toBeNull();
    const scroll = container.querySelector<HTMLElement>(".lj-table-scroll")!;
    scroll.focus();
    expect(document.activeElement).toBe(scroll);
    expect(table.hasAttribute("tabindex")).toBe(false);
  });

  it("keeps child actions native and does not submit an enclosing form", async () => {
    const action = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    await act(() =>
      root.render(
        <form>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Button onClick={action}>Inspect draft</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </form>,
      ),
    );
    container.querySelector("form")!.addEventListener("submit", submit);
    const button = container.querySelector("button")!;
    button.focus();
    await act(() => button.click());
    expect(action).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
  });

  it("leaves empty, loading and error presentation to the caller", async () => {
    await act(() =>
      root.render(
        <Table>
          <TableBody />
        </Table>,
      ),
    );
    expect(container.querySelector("tbody")?.children).toHaveLength(0);
    expect(container.querySelector('[role="status"], [role="alert"]')).toBeNull();
    for (const [role, message] of [
      ["status", "Loading drafts"],
      ["alert", "Drafts unavailable"],
    ] as const) {
      await act(() =>
        root.render(
          <Table aria-busy={role === "status"}>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3}>
                  <p role={role}>{message}</p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>,
        ),
      );
      expect(container.querySelector(`[role="${role}"]`)?.textContent).toBe(message);
      expect(container.querySelector("td")?.colSpan).toBe(3);
      expect(container.querySelector("table")?.getAttribute("aria-busy")).toBe(
        String(role === "status"),
      );
    }
  });

  it("supports an externally labelled scroller and rejects missing or blank names", async () => {
    await act(() =>
      root.render(
        <>
          <h2 id="table-name">Drafts</h2>
          <TableScroll aria-labelledby="table-name">
            <Table>
              <TableBody />
            </Table>
          </TableScroll>
        </>,
      ),
    );
    expect(container.querySelector(".lj-table-scroll")?.getAttribute("aria-labelledby")).toBe(
      "table-name",
    );
    for (const props of [{}, { "aria-label": "  " }, { "aria-labelledby": "" }]) {
      expect(() => Reflect.apply(TableScroll, undefined, [props])).toThrow("requires a nonblank");
    }
    expect(
      renderToStaticMarkup(<TableScroll aria-label="" aria-labelledby="table-name" />),
    ).toContain('aria-labelledby="table-name"');
  });
});
