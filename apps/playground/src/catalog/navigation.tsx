import { Link, useLinkProps, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";

export const catalogRoutePath = "/$pageId/{-$exampleId}";
export type CatalogSelection = { pageId: string; exampleId?: string; href: string };

export function useCatalogSelection(): CatalogSelection {
  return useRouterState({
    select: (state): CatalogSelection => {
      const missing = state.matches.some((match) => match.status === "notFound");
      const match = state.matches.find((candidate) => candidate.routeId === catalogRoutePath);
      const params = match?.params as { pageId?: string; exampleId?: string } | undefined;
      return {
        pageId: missing
          ? "not-found"
          : (params?.pageId ?? (state.location.pathname === "/" ? "introduction" : "not-found")),
        ...(params?.exampleId ? { exampleId: params.exampleId } : {}),
        href: state.location.href,
      };
    },
  });
}

type CatalogLinkProps = Omit<ComponentProps<"a">, "href"> & { pageId: string; exampleId?: string };
export function CatalogLink({ pageId, exampleId, ...props }: CatalogLinkProps) {
  return <Link {...props} to={catalogRoutePath} params={{ pageId, exampleId }} />;
}

/** Retains router-owned link behavior without marking an ancestor as the current page. */
export function CatalogAncestorLink({ pageId, exampleId, ...props }: CatalogLinkProps) {
  const linkProps = useLinkProps({ ...props, to: catalogRoutePath, params: { pageId, exampleId } });
  return <a {...linkProps} aria-current={undefined} />;
}
