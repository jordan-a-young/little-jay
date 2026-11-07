import {
  Field,
  NativeSelect,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableScroll,
} from "@littlejay/ui";
import { CodeBlock } from "./CodeBlock.js";
import { PreviewFrame } from "../shell/PreviewFrame.js";
import { useNavigate } from "@tanstack/react-router";
import { catalogRoutePath } from "./navigation.js";
import type { CatalogDocument, CatalogPageProps } from "./types.js";
import { CatalogBreadcrumb } from "./CatalogBreadcrumb.js";

export function DocumentationPage({
  document,
  pageId,
  exampleId,
}: CatalogPageProps & { document: CatalogDocument }) {
  const navigate = useNavigate();
  const example = exampleId
    ? document.examples.find((candidate) => candidate.id === exampleId)
    : document.examples[0];
  const Example = example?.component;
  return (
    <div className="catalog-document">
      <CatalogBreadcrumb
        pageId={pageId}
        {...(exampleId ? { exampleTitle: example?.title ?? "Example not found" } : {})}
      />
      <section aria-label="Overview">
        <p>{document.overview}</p>
      </section>
      <section aria-labelledby="catalog-examples-title">
        <h2 id="catalog-examples-title">Examples</h2>
        <Field label="Example">
          <NativeSelect
            value={example?.id ?? ""}
            onChange={(event) => {
              void navigate({
                to: catalogRoutePath,
                params: { pageId, exampleId: event.target.value },
              });
            }}
          >
            {!example && (
              <option value="" disabled>
                Unknown example
              </option>
            )}
            {document.examples.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.title}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {Example && example ? (
          <>
            <PreviewFrame exampleId={example.id}>
              <Example />
            </PreviewFrame>
            <CodeBlock
              key={example.id}
              code={example.code}
              label="Example code"
              language={example.language}
            />
          </>
        ) : (
          <p role="status">Example not found. Choose a named example above.</p>
        )}
      </section>
      <section aria-labelledby="catalog-usage-title">
        <h2 id="catalog-usage-title">Usage</h2>
        <CodeBlock
          key={document.usage}
          code={document.usage}
          label="Usage code"
          language={document.usageLanguage}
        />
      </section>
      <section aria-labelledby="catalog-props-title">
        <h2 id="catalog-props-title">{document.props.length ? "Props" : "Notes"}</h2>
        {document.props.length ? (
          <TableScroll aria-label="Props table">
            <Table className="catalog-props-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Prop</TableHead>
                  <TableHead>Type / default</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {document.props.map((prop) => (
                  <TableRow key={prop.name}>
                    <TableHead scope="row">
                      <code>{prop.name}</code>
                    </TableHead>
                    <TableCell>
                      <code>{prop.type}</code>
                    </TableCell>
                    <TableCell>{prop.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        ) : (
          <p>This is an application guide or pattern, not a separate library component.</p>
        )}
      </section>
      <section aria-labelledby="catalog-accessibility-title">
        <h2 id="catalog-accessibility-title">Accessibility & behavior</h2>
        <ul>
          {document.accessibility.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
