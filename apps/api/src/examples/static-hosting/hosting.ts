import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { isPublicRelativePath, parseStaticHostingConfiguration } from "./configuration.js";

function notFound(): never {
  throw Object.assign(new Error("Not found"), { statusCode: 404 });
}

async function assertPublicRoot(root: string) {
  if ((await realpath(root)) !== root || !(await lstat(root)).isDirectory()) {
    throw new Error("Unavailable static root");
  }
}

async function inspectPublicPath(root: string, relative: string) {
  let current = root;
  const segments = relative.split("/");
  for (const [index, segment] of segments.entries()) {
    const entries = await readdir(current);
    if (!entries.includes(segment)) {
      try {
        await lstat(path.join(current, segment));
        return "blocked";
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return "missing";
        }
        throw error;
      }
    }
    current = path.join(current, segment);
    const metadata = await lstat(current);
    if (metadata.isSymbolicLink()) return "blocked";
    if (index === segments.length - 1) {
      return metadata.isFile() ? "file" : metadata.isDirectory() ? "directory" : "blocked";
    }
    if (!metadata.isDirectory()) return "blocked";
  }
  return "blocked";
}

function requestPath(url: string | undefined): string | undefined {
  const rawPath = url?.split("?", 1)[0];
  if (rawPath === "/") return "";
  if (!rawPath?.startsWith("/")) return undefined;
  try {
    const relative = decodeURIComponent(rawPath.slice(1));
    if (
      !isPublicRelativePath(relative) ||
      `/${relative.split("/").map(encodeURIComponent).join("/")}` !== rawPath ||
      relative.split("/")[0]?.toLowerCase() === "api"
    )
      return undefined;
    return relative;
  } catch {
    return undefined;
  }
}

function acceptsHtml(accept: string | undefined): boolean {
  if (!accept) return false;
  let accepted = false;
  for (const range of accept.split(",")) {
    const [mediaType, ...parameters] = range.trim().toLowerCase().split(";");
    if (mediaType?.trim() !== "text/html") continue;
    let quality = 1;
    let qualitySeen = false;
    for (const parameter of parameters) {
      const match = /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u.exec(parameter.trim());
      if (!match || qualitySeen) return false;
      quality = Number(match[1]);
      qualitySeen = true;
    }
    if (quality === 0) return false;
    accepted = true;
  }
  return accepted;
}

function unsatisfiedContentRange(error: unknown): string | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("statusCode" in error) ||
    error.statusCode !== 416 ||
    !("headers" in error) ||
    typeof error.headers !== "object" ||
    error.headers === null ||
    !("Content-Range" in error.headers)
  )
    return undefined;
  const value = error.headers["Content-Range"];
  if (typeof value !== "string" || !/^bytes \*\/(?:0|[1-9]\d{0,15})$/u.test(value))
    return undefined;
  return Number.isSafeInteger(Number(value.slice(8))) ? value : undefined;
}

/**
 * Opt-in native static delivery for a trusted immutable public build tree.
 * Register at the application root after safe errors, before readiness.
 * No wildcard routes are installed; more-specific API not-found scopes retain ownership.
 * Symlinks and noncanonical paths are denied. Checks and native file opens are not atomic:
 * an attacker-writable tree or concurrent replacement requires a stronger deployment boundary.
 * The caller owns security/cache hooks, readiness failure cleanup, listening and closing.
 */
export function registerStaticHosting(app: FastifyInstance, configuration: unknown = {}): void {
  app.register(staticHostingPlugin, {
    prefix: "/",
    hosting: parseStaticHostingConfiguration(configuration),
  });
}

const staticHostingPlugin: FastifyPluginAsync<{ hosting: unknown }> = async (app, options) => {
  const configuration = parseStaticHostingConfiguration(options.hosting);
  if (!configuration.enabled) return;
  const root = configuration.root!;
  try {
    await assertPublicRoot(root);
    if ((await inspectPublicPath(root, configuration.entry)) !== "file") {
      throw new Error("Unavailable static entry");
    }
    const entry = await open(path.join(root, configuration.entry), "r");
    await entry.close();
  } catch {
    throw new Error("Unable to initialize static hosting");
  }
  await app.register(fastifyStatic, {
    serve: false,
    dotfiles: "deny",
    index: false,
    extensions: [],
    cacheControl: false,
    etag: false,
    lastModified: false,
    redirect: false,
    preCompressed: false,
    allowedPath: (relative) => isPublicRelativePath(relative),
  });
  app.addHook("onError", async (_request, reply, error) => {
    const contentRange = unsatisfiedContentRange(error);
    if (contentRange !== undefined) reply.header("content-range", contentRange);
  });
  app.setNotFoundHandler(async (request, reply) => {
    if (!["GET", "HEAD"].includes(request.method)) return notFound();
    const relative = requestPath(request.raw.url);
    if (relative === undefined) return notFound();
    let target: string;
    try {
      await assertPublicRoot(root);
      const status = relative === "" ? "directory" : await inspectPublicPath(root, relative);
      if ((status === "missing" || status === "directory") && !relative.includes(".")) {
        const vary = reply.getHeader("vary");
        reply.header("vary", vary ? `${String(vary)}, Accept` : "Accept");
      }
      if (status === "file") {
        target = relative;
      } else if (
        (status === "missing" || status === "directory") &&
        request.method === "GET" &&
        !relative.includes(".") &&
        acceptsHtml(request.headers.accept) &&
        (await inspectPublicPath(root, configuration.entry)) === "file"
      ) {
        target = configuration.entry;
      } else {
        return notFound();
      }
    } catch {
      return notFound();
    }
    return reply.code(200).sendFile(target, root);
  });
};
