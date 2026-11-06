import { lazy, Suspense, useState } from "react";
import { Button, ErrorBoundary } from "@ljay/ui";

export type CodeLanguage = "tsx" | "css";
const HighlightedCode = lazy(() => import("./HighlightedCode.js"));

export function CodeBlock({
  code,
  label,
  language = "tsx",
}: {
  code: string;
  label: string;
  language?: CodeLanguage;
}) {
  const [message, setMessage] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Copied.");
    } catch {
      setMessage("Copy unavailable. Select and copy the code below.");
    }
  }

  return (
    <div className="catalog-code">
      <div className="catalog-code-toolbar">
        <span>{label}</span>
        <span role="status" className="catalog-copy-status">
          {message}
        </span>
        <Button
          className="catalog-copy-button"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => void copy()}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
          Copy
        </Button>
      </div>
      <pre tabIndex={0} role="region" aria-label={label}>
        <code className={`language-${language}`}>
          <ErrorBoundary fallback={code}>
            <Suspense fallback={code}>
              <HighlightedCode code={code} language={language} />
            </Suspense>
          </ErrorBoundary>
        </code>
      </pre>
    </div>
  );
}
