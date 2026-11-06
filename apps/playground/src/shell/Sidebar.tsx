import { useState } from "react";
import { Field, Input } from "@ljay/ui";
import { catalogHref, filterCatalog } from "../catalog/registry.js";

export function Sidebar({ selectedPage }: { selectedPage: string }) {
  const [query, setQuery] = useState("");
  const pages = filterCatalog(query);
  const groups = [...new Set(pages.map((page) => page.group))];
  return (
    <aside className="catalog-sidebar">
      <Field label="Find a component or guide">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the catalog"
        />
      </Field>
      <nav aria-label="Component catalog">
        {groups.map((group) => (
          <section key={group} className="catalog-nav-group" aria-label={group}>
            <h2>{group}</h2>
            <ul>
              {pages
                .filter((page) => page.group === group)
                .map((page) => (
                  <li key={page.id}>
                    <a
                      href={catalogHref(page.id)}
                      aria-current={selectedPage === page.id ? "page" : undefined}
                    >
                      {page.title}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {pages.length === 0 && <p role="status">No matching components or guides.</p>}
      </nav>
    </aside>
  );
}
