import { DescriptionList } from "@ljay/ui";
import healthQuerySource from "../../health.ts?raw";
import applicationSource from "../../main.tsx?raw";
import apiConnectionSource from "../patterns/examples.tsx?raw";
import { CatalogLink } from "../navigation.js";
import type { CatalogDocument } from "../types.js";

function RelatedPatterns() {
  return (
    <ul className="space-y-2">
      <li>
        <CatalogLink pageId="api-connection">Open the live API connection pattern</CatalogLink>{" "}
        (opening that pattern starts the health read).
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
        (source repository access required).
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
        Keep a stable QueryClient and share it through QueryClientProvider, as in the application
        source below. Opening this guide does not create a query observer or make a request.
      </p>
      <p>
        TanStack Router is configured directly in this application with hash history. Its typed
        route context receives that same QueryClient, so future loaders can reuse app-owned query
        options without adding a router or hooks package. React hooks such as useNavigate belong
        inside routed React components, not loader functions.
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
        The health options below use a 30-second stale window, no automatic retries, and a 4 KiB
        response bound. Refresh API explicitly refetches. These are local health-read policies, not
        defaults for every endpoint.
      </p>
      <p>
        This is a source walkthrough, not a live query. useFormStatus and Actions remain responsible
        for the separate local validation form.
      </p>
      <RelatedPatterns />
    </div>
  );
}

export const hooksDocument: CatalogDocument = {
  overview:
    "A guide to app-owned hooks, internal UI composition, and TanStack Query data reads. No hooks package or new public hook is introduced. This page documents existing code without making API requests.",
  usage: healthQuerySource.trim(),
  props: [],
  accessibility: [
    "The Usage snippet is the current health.ts source; example snippets are the current application/provider and API pattern sources. Their relative imports belong to this playground: adapt URLs, keys, decoders, and credentials policy to your application.",
    "Create a stable QueryClient at the application boundary and supply QueryClientProvider; do not recreate the cache during component renders. Reuse queryOptions directly rather than adding a wrapper hook solely for naming consistency.",
    "The application passes that QueryClient to createCatalogRouter and RouterProvider. Route context makes it available to future loaders; no health loader or automatic link prefetch is enabled. Keep Query as the data cache rather than duplicating request state in the router.",
    "Query owns cache freshness, cancellation, offline pause/resume, and invalidation. fetchJson owns bounded transport and runtime decoding, not React state, caching, authentication, or authorization. Include relevant data identity/auth scope in application query keys; do not put secrets in keys or logs.",
    "Choose announcement roles and aria-busy at the application boundary. Preserve cached data during background work, communicate offline/error/loading states in text, and avoid duplicate live regions or forced focus changes.",
    "Form validation/pending state uses React Actions, useActionState, and useFormStatus in the workflow example. Mutation approval, draft preservation, retries, and permissions remain app policy; this guide does not replace generated clients or introduce mutation abstractions.",
    "Only follow the live API connection link when its matching API/proxy is available. This guide itself has no network dependency; the JSON transport contract link requires access to the private source repository.",
  ],
  examples: [
    {
      id: "default",
      title: "Hook ownership and provider setup",
      component: HookOwnershipGuide,
      code: applicationSource.trim(),
    },
    {
      id: "query",
      title: "Cached API reads and lifecycle",
      component: QueryOwnershipGuide,
      code: apiConnectionSource.trim(),
    },
  ],
};
