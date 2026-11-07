import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@littlejay/ui";
import { CatalogAncestorLink } from "./navigation.js";
import { catalogPages } from "./registry.js";

export function CatalogBreadcrumb({
  pageId,
  exampleTitle,
}: {
  pageId: string;
  exampleTitle?: string;
}) {
  const page = catalogPages.find((candidate) => candidate.id === pageId);
  const isIntroduction = pageId === "introduction";
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {!isIntroduction && (
          <BreadcrumbItem>
            <CatalogAncestorLink pageId="introduction">Introduction</CatalogAncestorLink>
          </BreadcrumbItem>
        )}
        <BreadcrumbItem>
          {!isIntroduction && <BreadcrumbSeparator />}
          {page && exampleTitle ? (
            <CatalogAncestorLink
              pageId={page.id}
              onClick={(event) => {
                if (
                  event.button === 0 &&
                  !event.defaultPrevented &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey
                ) {
                  document.getElementById("catalog-page-title")?.focus();
                }
              }}
            >
              {page.title}
            </CatalogAncestorLink>
          ) : (
            <BreadcrumbPage>{page?.title ?? "Page not found"}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {page && exampleTitle && (
          <BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{exampleTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
