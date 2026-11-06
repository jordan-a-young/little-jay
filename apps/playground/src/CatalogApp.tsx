import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ErrorBoundary } from "@ljay/ui";
import logoLight from "@ljay/brand/logos/lockup-light.svg";
import logoDark from "@ljay/brand/logos/lockup-dark.svg";
import { useTheme } from "./use-theme.js";
import { catalogHref, catalogPages, parseCatalogHash } from "./catalog/registry.js";
import { Sidebar } from "./shell/Sidebar.js";
import { Toolbar } from "./shell/Toolbar.js";
import { PreviewContext, type PreviewWidth } from "./shell/PreviewFrame.js";

function subscribeLocation(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function CatalogApp() {
  const hash = useSyncExternalStore(
    subscribeLocation,
    () => window.location.hash,
    () => "",
  );
  const { pageId, exampleId } = parseCatalogHash(hash);
  const page = catalogPages.find((candidate) => candidate.id === pageId);
  const Page = page?.component;
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
        <a
          href={catalogHref("introduction")}
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
        </a>
        <span className="playground-label">Component catalog</span>
      </header>
      <Sidebar selectedPage={pageId} />
      <main id="catalog-content" tabIndex={-1} className="catalog-main">
        <h1 ref={heading} tabIndex={-1}>
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
        <p role="status" className="text-sm text-muted">
          {resetMessage}
        </p>
        <PreviewContext value={{ width, resetCount }}>
          {Page ? (
            <ErrorBoundary
              key={pageId}
              resetKey={hash}
              fallback={<p>This catalog page could not load. Reload the page to try again.</p>}
            >
              <Suspense fallback={<p role="status">Loading documentation…</p>}>
                <Page key={pageId} pageId={pageId} {...(exampleId ? { exampleId } : {})} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <p>
              That catalog link does not exist.{" "}
              <a href={catalogHref("introduction")}>Return to Introduction</a>.
            </p>
          )}
        </PreviewContext>
      </main>
    </div>
  );
}
