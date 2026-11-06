import {
  createHashHistory,
  type HistoryLocation,
  type RouterHistory,
} from "@tanstack/react-router";

/** Retains existing application state when TanStack initializes its history keys. */
export function createCatalogHashHistory(): RouterHistory {
  const state = window.history.state;
  const history = createHashHistory();
  if (state && typeof state === "object") {
    window.history.replaceState({ ...state, ...window.history.state }, "");
  }
  return history;
}

/** Preserves legacy entry links and rejects malformed catalog paths before router decoding. */
export function normalizeCatalogLocation(location: HistoryLocation): HistoryLocation {
  let pathname = location.pathname;
  if (pathname === "pebble-states") pathname = "/pebble-state/showcase";
  else if (!pathname) pathname = "/";
  else if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (pathname !== "/") {
    const segments = pathname.slice(1).split("/");
    try {
      if (segments.length > 2 || !segments[0]) throw new URIError();
      for (const segment of segments) decodeURIComponent(segment);
    } catch {
      pathname = "/__invalid-catalog-location__";
    }
  }
  return { ...location, pathname, href: `${pathname}${location.search}${location.hash}` };
}

/** Adapts inbound locations only; TanStack history still owns navigation and subscriptions. */
export function catalogHistory(history: RouterHistory): RouterHistory {
  return {
    ...history,
    get location() {
      return normalizeCatalogLocation(history.location);
    },
    get length() {
      return history.length;
    },
    subscribe(listener) {
      return history.subscribe((update) =>
        listener({ ...update, location: normalizeCatalogLocation(update.location) }),
      );
    },
  };
}
