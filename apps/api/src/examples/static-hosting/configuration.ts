import path from "node:path";

export type StaticHostingConfiguration = {
  enabled: boolean;
  root?: string;
  entry: string;
};

export type StaticResponsePolicy = {
  contentSecurityPolicy: string;
  cacheControl: string;
};

/** Parses explicit application settings without filesystem or environment access. */
export function parseStaticHostingConfiguration(input: unknown = {}): StaticHostingConfiguration {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid static hosting configuration");
  }
  const values = input as Record<string, unknown>;
  const { enabled = false, root, entry = "index.html" } = values;
  if (
    Object.keys(values).some((key) => !["enabled", "root", "entry"].includes(key)) ||
    typeof enabled !== "boolean" ||
    (root !== undefined &&
      (typeof root !== "string" ||
        !path.isAbsolute(root) ||
        path.resolve(root) !== root ||
        root === path.parse(root).root ||
        /[\p{Cc}\\]/u.test(root))) ||
    (enabled && root === undefined) ||
    typeof entry !== "string" ||
    !isPublicRelativePath(entry) ||
    entry.split("/")[0]?.toLowerCase() === "api"
  ) {
    throw new Error("Invalid static hosting configuration");
  }
  return { enabled, ...(typeof root === "string" ? { root } : {}), entry };
}

/** Restricts public filenames without normalizing Unicode or filesystem spelling. */
export function isPublicRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !/[\p{Cc}%?#\\:]/u.test(value) &&
    value
      .split("/")
      .every((segment) => segment.length > 0 && !segment.startsWith(".") && !/[. ]$/u.test(segment))
  );
}

/** The synthetic policy permits external same-origin CSS/JS, without inline execution. */
export function parseStaticResponsePolicy(input: unknown = {}): StaticResponsePolicy {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid static response policy");
  }
  const values = input as Record<string, unknown>;
  const {
    contentSecurityPolicy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    cacheControl = "no-store",
  } = values;
  if (
    Object.keys(values).some((key) => !["contentSecurityPolicy", "cacheControl"].includes(key)) ||
    [contentSecurityPolicy, cacheControl].some(
      (value) =>
        typeof value !== "string" || !value.trim() || !/^[\x20-\x7e]{1,2048}$/u.test(value),
    )
  ) {
    throw new Error("Invalid static response policy");
  }
  return {
    contentSecurityPolicy: contentSecurityPolicy as string,
    cacheControl: cacheControl as string,
  };
}
