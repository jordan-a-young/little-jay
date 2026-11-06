import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { CatalogApp, CatalogPage, CatalogNotFound } from "./CatalogApp.js";
import { catalogRoutePath, CatalogLink } from "./catalog/navigation.js";
import { catalogHistory, createCatalogHashHistory } from "./routing-history.js";

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: CatalogApp,
  notFoundComponent: CatalogNotFound,
  errorComponent: () => (
    <p>
      This catalog route could not load.{" "}
      <CatalogLink pageId="introduction">Return to Introduction</CatalogLink>.
    </p>
  ),
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CatalogPage,
});
const pageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: catalogRoutePath,
  component: CatalogPage,
});
const routeTree = rootRoute.addChildren([indexRoute, pageRoute]);

export function createCatalogRouter(
  queryClient: QueryClient,
  history: RouterHistory = createCatalogHashHistory(),
) {
  return createRouter({
    routeTree,
    history: catalogHistory(history),
    context: { queryClient },
    defaultPreload: false,
    defaultPreloadStaleTime: 0,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createCatalogRouter>;
  }
}
