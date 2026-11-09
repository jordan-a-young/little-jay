import { DescriptionList } from "@littlejay/ui";
import { CatalogLink } from "../navigation.js";
import type { CatalogDocument } from "../types.js";

const healthQueryExample = `import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@littlejay/http";

export const healthQueryOptions = queryOptions({
  queryKey: ["api", "health"],
  queryFn: ({ signal }) => fetchJson("/api/health", {
    signal,
    maxResponseBytes: 4096,
    decode: (value) => {
      if (typeof value !== "object" || value === null ||
          !("status" in value) || value.status !== "ok") {
        throw new Error("Unexpected health response");
      }
      return value.status;
    },
  }),
  staleTime: 30_000,
  retry: false,
});`;
const providerExample = `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function Application({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}`;
const queryViewExample = `import { useQuery } from "@tanstack/react-query";
import { healthQueryOptions } from "./health-query";

export function ConnectionMessage() {
  const health = useQuery(healthQueryOptions);
  const message = health.isPaused ? "Waiting for connection…"
    : health.isPending ? "Checking API…"
    : health.isError ? "Unable to reach the API"
    : "API is healthy";
  return <p>{message}</p>;
}`;

function RelatedPatterns() {
  return (
    <ul className="space-y-2">
      <li>
        <CatalogLink pageId="api-connection">Read the local server demo guide</CatalogLink> (static
        instructions; no requests or server required).
      </li>
      <li>
        <CatalogLink pageId="workflow-form">
          Explore React Actions and form pending state
        </CatalogLink>{" "}
        (local validation only).
      </li>
      <li>
        <a href="https://github.com/jordan-a-young/little-jay/blob/main/docs/HTTP.md">
          Read the JSON transport contract
        </a>{" "}
        (external documentation).
      </li>
    </ul>
  );
}

function HookOwnershipGuide() {
  return (
    <div className="space-y-5">
      <h3 className="font-semibold">Keep hooks with their owner</h3>
      <DescriptionList>
        <dt>Application hooks</dt>
        <dd>
          The playground's useTheme depends on its theme store and bootstrap. It is not a shared UI
          export.
        </dd>
        <dt>Internal UI hooks</dt>
        <dd>
          useFieldControl composes Field context internally. Consume Field and its controls, not
          internal hooks or source paths.
        </dd>
        <dt>API reads</dt>
        <dd>
          Use TanStack Query's useQuery with app-owned queryOptions. Keep keys, schemas,
          authentication scope, retries, and invalidation policy in the application.
        </dd>
        <dt>Form actions</dt>
        <dd>
          The local form uses useActionState and useFormStatus. React Actions own its pending state;
          a second Query cache or generic form hook is unnecessary.
        </dd>
      </DescriptionList>
      <p>
        In an application that fetches server state, keep a stable QueryClient and share it through
        QueryClientProvider, as in the illustrative code below. This frontend-only catalog does not
        install those runtime dependencies or create a query observer.
      </p>
      <p>
        This catalog uses TanStack Router with hash history and no data-query context. In
        applications that need loaders, an app-owned QueryClient can be shared explicitly. React
        hooks such as useNavigate belong inside routed React components, not loader functions.
      </p>
      <RelatedPatterns />
    </div>
  );
}

function QueryOwnershipGuide() {
  return (
    <div className="space-y-5">
      <h3 className="font-semibold">Let Query own the request lifecycle</h3>
      <DescriptionList>
        <dt>Initial loading</dt>
        <dd>
          Check isPaused before isPending: an offline query may be pending without actively
          fetching. Show checking text only for active initial loading.
        </dd>
        <dt>Background refresh</dt>
        <dd>
          isFetching can be true while cached data remains available. Preserve that data and
          distinguish a refresh from a newly confirmed result.
        </dd>
        <dt>Offline pause</dt>
        <dd>
          Use isPaused to explain waiting for a connection. A cached result is not a fresh health
          check; do not replace it with an active spinner.
        </dd>
        <dt>Errors and cancellation</dt>
        <dd>
          Pass Query's signal into fetchJson. Its required decoder validates unknown data, while
          bounded transport errors keep private diagnostics out of UI copy. Use app-owned safe error
          messages.
        </dd>
      </DescriptionList>
      <p>
        The illustrative health options use a 30-second stale window, no automatic retries, and a 4
        KiB response bound. An application can explicitly refetch when requested. These are example
        policies, not defaults for every endpoint or live behavior of this catalog.
      </p>
      <p>
        This is a non-executing guide, not a live query. useFormStatus and Actions remain
        responsible for the separate local validation form.
      </p>
      <RelatedPatterns />
    </div>
  );
}

export const hooksDocument: CatalogDocument = {
  overview:
    "A guide to app-owned hooks, internal UI composition, and TanStack Query data reads. The snippets are illustrative application code, not imports or live data requests in this frontend-only catalog. No hooks package or new public hook is introduced.",
  usage: healthQueryExample,
  props: [],
  accessibility: [
    "All Query/HTTP snippets are explicitly illustrative and are not executed or installed as catalog runtime dependencies. Applications using them must supply the shown dependencies and adapt URLs, keys, decoders and credentials policy.",
    "Create a stable QueryClient at the application boundary and supply QueryClientProvider; do not recreate the cache during component renders. Reuse queryOptions directly rather than adding a wrapper hook solely for naming consistency.",
    "The catalog router needs no QueryClient. Applications that do use server-state loaders may share their own client through route context rather than create a second data cache. Hooks still belong inside React components.",
    "Query owns cache freshness, cancellation, offline pause/resume, and invalidation. fetchJson owns bounded transport and runtime decoding, not React state, caching, authentication, or authorization. Include relevant data identity/auth scope in application query keys; do not put secrets in keys or logs.",
    "Choose announcement roles and aria-busy at the application boundary. Preserve cached data during background work, communicate offline/error/loading states in text, and avoid duplicate live regions or forced focus changes.",
    "Form validation/pending state uses React Actions, useActionState, and useFormStatus in the workflow example. Mutation approval, draft preservation, retries, and permissions remain app policy; this guide does not replace generated clients or introduce mutation abstractions.",
    "The local server demo link opens static instructions. Neither that page nor this guide needs a backend or API proxy. External documentation links navigate only when followed.",
  ],
  examples: [
    {
      id: "default",
      title: "Hook ownership and provider setup",
      component: HookOwnershipGuide,
      code: providerExample,
    },
    {
      id: "query",
      title: "Cached API reads and lifecycle",
      component: QueryOwnershipGuide,
      code: queryViewExample,
    },
  ],
};
