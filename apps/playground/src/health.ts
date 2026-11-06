import { queryOptions } from "@tanstack/react-query";
import { fetchJson } from "@ljay/http";

export const healthQueryOptions = queryOptions({
  queryKey: ["api", "health"],
  queryFn: ({ signal }) =>
    fetchJson("/api/health", {
      signal,
      maxResponseBytes: 4096,
      decode: (body) => {
        if (
          typeof body !== "object" ||
          body === null ||
          !("status" in body) ||
          body.status !== "ok"
        )
          throw new Error("Unexpected health response");
        return body.status;
      },
    }),
  staleTime: 30_000,
  retry: false,
});
