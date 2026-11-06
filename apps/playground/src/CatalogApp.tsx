import { Suspense, useEffect, useRef, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { ErrorBoundary, LoadingIndicator } from "@littlejay/ui";
import logoLight from "@littlejay/brand/logos/lockup-light.svg";
import logoDark from "@littlejay/brand/logos/lockup-dark.svg";
import { useTheme } from "./use-theme.js";
import { catalogPages } from "./catalog/registry.js";
import { CatalogLink, useCatalogSelection } from "./catalog/navigation.js";
import { Sidebar } from "./shell/Sidebar.js";
import { Toolbar } from "./shell/Toolbar.js";
import { PreviewContext, type PreviewWidth } from "./shell/PreviewFrame.js";

export function CatalogApp() {
  const { pageId } = useCatalogSelection();
  const page = catalogPages.find((candidate) => candidate.id === pageId);
  const { theme } = useTheme();
  const [width, setWidth] = useState<PreviewWidth>("fluid");
  const [resetCount, setResetCount] = useState(0);
  const [resetMessage, setResetMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPage = useRef(pageId);

  useEffect(() => {
    if (previousPage.current !== pageId) {
      heading.current?.focus();
      previousPage.current = pageId;
      setResetMessage("");
    }
  }, [pageId]);

  return (
    <div className="catalog-shell">
      <a
        className="catalog-skip"
        href="#catalog-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("catalog-content")?.focus();
        }}
      >
        Skip to documentation
      </a>
      <header className="catalog-header">
        <CatalogLink
          pageId="introduction"
          className="brand-home"
          aria-label="Little Jay catalog home"
        >
          <img
            src={theme === "dark" ? logoDark : logoLight}
            alt="Little Jay"
            width={275}
            height={75}
            className="brand-logo"
          />
        </CatalogLink>
        <span className="playground-label">Component catalog</span>
      </header>
      <Sidebar selectedPage={pageId} />
      <main
        id="catalog-content"
        tabIndex={0}
        aria-labelledby="catalog-page-title"
        className="catalog-main"
      >
        <div className="catalog-page-header">
          <h1 id="catalog-page-title" ref={heading} tabIndex={-1}>
            {page?.title ?? "Page not found"}
          </h1>
          <Toolbar
            width={width}
            onWidthChange={setWidth}
            onReset={() => {
              setResetCount((count) => count + 1);
              setResetMessage("Preview reset to its initial state.");
            }}
          />
        </div>
        <p role="status" className="text-sm text-muted">
          {resetMessage}
        </p>
        <PreviewContext value={{ width, resetCount }}>
          <Outlet />
        </PreviewContext>
      </main>
    </div>
  );
}

export function CatalogNotFound() {
  return (
    <p>
      That catalog link does not exist.{" "}
      <CatalogLink pageId="introduction">Return to Introduction</CatalogLink>.
    </p>
  );
}

export function CatalogPage() {
  const { pageId, exampleId, href } = useCatalogSelection();
  const Page = catalogPages.find((page) => page.id === pageId)?.component;
  if (!Page) return <CatalogNotFound />;
  return (
    <ErrorBoundary
      key={pageId}
      resetKey={href}
      fallback={<p>This catalog page could not load. Reload the page to try again.</p>}
    >
      <Suspense
        fallback={
          <p role="status">
            <LoadingIndicator label="Loading documentation…" />
          </p>
        }
      >
        <Page key={pageId} pageId={pageId} {...(exampleId ? { exampleId } : {})} />
      </Suspense>
    </ErrorBoundary>
  );
}
