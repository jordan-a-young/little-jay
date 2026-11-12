import * as filesystem from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { createServer, safeErrorsPlugin } from "@littlejay/server";
import * as application from "../../app.js";
import { createStaticHostingApp } from "./app.js";
import { parseStaticHostingConfiguration, parseStaticResponsePolicy } from "./configuration.js";
import { registerStaticHosting } from "./hosting.js";

vi.mock("node:fs/promises", { spy: true });

const html =
  '<!doctype html><html lang="en"><title>Hosting example</title><h1>Static hosting</h1></html>';
const notFound = { statusCode: 404, error: { code: "NOT_FOUND", message: "Not found" } };

afterEach(() => vi.restoreAllMocks());

async function fixture() {
  const parent = await filesystem.mkdtemp(path.join(tmpdir(), "little-jay-hosting-r2-"));
  const root = path.join(parent, "public");
  await filesystem.mkdir(path.join(root, "assets"), { recursive: true });
  await filesystem.mkdir(path.join(root, "api"));
  await filesystem.mkdir(path.join(root, ".private"));
  await Promise.all([
    filesystem.writeFile(path.join(root, "index.html"), html),
    filesystem.writeFile(path.join(root, "assets/app.js"), 'document.title = "Hosted";'),
    filesystem.writeFile(path.join(root, "assets/site.css"), "body { color: navy; }"),
    filesystem.writeFile(path.join(root, "café.txt"), "Unicode asset"),
    filesystem.writeFile(path.join(root, "hello world.txt"), "Space asset"),
    filesystem.writeFile(path.join(root, "LICENSE"), "Public extensionless asset"),
    filesystem.writeFile(path.join(root, "api/health"), "must not shadow health"),
    filesystem.writeFile(path.join(root, "api/private.js"), "must not be public"),
    filesystem.writeFile(path.join(root, ".private/secret"), "must not be public"),
    filesystem.writeFile(path.join(root, ".hidden"), "must not be public"),
    filesystem.writeFile(path.join(parent, "outside.txt"), "must not be public"),
  ]);
  return { parent, root };
}

it("validates explicit configuration and headers before filesystem access", async () => {
  const stat = vi.spyOn(filesystem, "lstat");
  const open = vi.spyOn(filesystem, "open");
  for (const value of [
    null,
    [],
    true,
    { enabled: "true" },
    { enabled: true },
    { root: "relative" },
    { root: "/" },
    { root: "/tmp/../tmp" },
    { root: "/tmp/" },
    { extra: true },
    { entry: "../index.html" },
    { entry: ".hidden" },
    { entry: "api/index.html" },
    { entry: "a%20b" },
  ]) {
    expect(() => parseStaticHostingConfiguration(value)).toThrow(
      "Invalid static hosting configuration",
    );
    await expect(createStaticHostingApp(value)).rejects.toThrow(
      "Invalid static hosting configuration",
    );
  }
  for (const value of [
    null,
    [],
    { unknown: true },
    { cacheControl: "" },
    { contentSecurityPolicy: "x\r\ny" },
    { cacheControl: 1 },
  ]) {
    expect(() => parseStaticResponsePolicy(value)).toThrow("Invalid static response policy");
    await expect(createStaticHostingApp({}, value)).rejects.toThrow(
      "Invalid static response policy",
    );
  }
  expect(stat).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

it("defaults to API-only with no static filesystem access, handlers or native decorators", async () => {
  const spies = ["lstat", "realpath", "readdir", "open"].map((name) =>
    vi.spyOn(filesystem, name as "lstat"),
  );
  const app = await createStaticHostingApp({ root: "/unavailable-synthetic-public-tree" });
  try {
    expect(app.server.listening).toBe(false);
    expect(app.hasReplyDecorator("sendFile")).toBe(false);
    expect(app.initialConfig).toMatchObject({ bodyLimit: 16_384, requestTimeout: 15_000 });
    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
    expect((await app.inject("/api/ready")).json()).toEqual({ status: "ready" });
    expect((await app.inject({ url: "/", headers: { accept: "text/html" } })).json()).toEqual(
      notFound,
    );
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});

it("serves native assets and explicit HTML deep links with application-owned headers", async () => {
  const { root } = await fixture();
  const native = application.buildApp();
  registerStaticHosting(native, { enabled: true, root });
  try {
    await native.ready();
  } finally {
    await native.close();
  }
  const policy = {
    contentSecurityPolicy: "default-src 'self'; frame-ancestors 'none'",
    cacheControl: "private, no-store",
  };
  const app = await createStaticHostingApp({ enabled: true, root }, policy);
  try {
    for (const url of [
      "/",
      "/projects/42",
      "/projects/42?file=missing.js&next=%2Fapi",
      "/assets",
      "/caf%C3%A9",
    ]) {
      const response = await app.inject({ url, headers: { accept: "text/html" } });
      expect(response.statusCode, url).toBe(200);
      expect(response.body, url).toBe(html);
      expect(response.headers["content-type"]).toContain("text/html");
      expect(response.headers.vary).toBe("Accept");
    }
    for (const [url, contents, contentType] of [
      ["/assets/app.js?v=1", 'document.title = "Hosted";', "javascript"],
      ["/assets/site.css", "body { color: navy; }", "text/css"],
      ["/caf%C3%A9.txt", "Unicode asset", "text/plain"],
      ["/hello%20world.txt", "Space asset", "text/plain"],
      ["/LICENSE", "Public extensionless asset", "application/octet-stream"],
    ]) {
      const response = await app.inject({ url, headers: { accept: "application/json" } });
      expect(response.statusCode, url).toBe(200);
      expect(response.body).toBe(contents);
      expect(response.headers["content-type"]).toContain(contentType);
      expect(response.headers["content-security-policy"]).toBe(policy.contentSecurityPolicy);
      expect(response.headers["cache-control"]).toBe(policy.cacheControl);
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers.etag).toBeUndefined();
      expect(response.headers["last-modified"]).toBeUndefined();
      const head = await app.inject({ method: "HEAD", url });
      expect(head.statusCode).toBe(200);
      expect(head.body).toBe("");
      expect(head.headers["content-length"]).toBe(response.headers["content-length"]);
    }
    for (const url of ["/projects/42", "/api/health", "/missing.js", "/.hidden"]) {
      const response = await app.inject({ url, headers: { accept: "text/html" } });
      expect(response.headers["content-security-policy"]).toBe(policy.contentSecurityPolicy);
      expect(response.headers["cache-control"]).toBe(policy.cacheControl);
    }
  } finally {
    await app.close();
  }
});

it("requires explicit positive HTML quality and never falls back for HEAD/non-GET misses", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    for (const accept of [
      undefined,
      "*/*",
      "text/*",
      "application/json",
      "text/html;q=0",
      "text/html;q=0, */*;q=1",
      "text/html;q=0, text/html;q=1",
      "text/html;q=0.000",
      "text/html;q=2",
      "text/html;q=NaN",
      "text/html;q=.5",
      "text/html;q=0.5;q=1",
      "text/html;profile=unknown",
    ]) {
      const response = await app.inject({ url: "/deep/link", headers: accept ? { accept } : {} });
      expect(response.statusCode, accept).toBe(404);
      expect(response.json()).toEqual(notFound);
    }
    for (const accept of [
      "text/html",
      "text/html;q=0.001",
      "application/json, text/html;q=0.5",
      "Text/HTML;Q=1.000",
      "text/html;q=1, */*;q=0",
    ]) {
      expect((await app.inject({ url: "/deep/link", headers: { accept } })).body, accept).toBe(
        html,
      );
    }
    for (const method of ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const) {
      for (const url of ["/", "/deep/link", "/missing.js"]) {
        const response = await app.inject({ method, url, headers: { accept: "text/html" } });
        expect(response.statusCode, `${method} ${url}`).toBe(404);
        expect(response.json()).toEqual(notFound);
      }
    }
  } finally {
    await app.close();
  }
});

it("rejects API aliases, asset-like misses, traversal, dotfiles and ambiguous encodings", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    for (const url of [
      "/api",
      "/api/",
      "/api/missing",
      "/api/private.js",
      "/API/private.js",
      "/%61pi/private.js",
      "/api%2Fprivate.js",
      "/%2561pi/private.js",
      "/missing.js",
      "/assets/site.css/more",
      "/dotted.folder/page",
      "/.hidden",
      "/.private/secret",
      "/%2Ehidden",
      "/assets//app.js",
      "//assets/app.js",
      "/assets%2Fapp.js",
      "/assets%5Capp.js",
      "/assets/%61pp.js",
      "/caf%c3%a9.txt",
      "/bad%00name",
      "/bad%25name",
      "/bad%3Fname",
      "/bad%23name",
      "/bad%3Aname",
      "/assets/app.js%20",
      "/projects/",
    ]) {
      const response = await app.inject({ url, headers: { accept: "text/html" } });
      expect(response.statusCode, url).toBe(404);
      expect(response.json(), url).toEqual(notFound);
      expect(response.body).not.toContain("must not");
    }
    const malformed = await app.inject({ url: "/bad%ZZ", headers: { accept: "text/html" } });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.headers["content-type"]).not.toContain("text/html");
  } finally {
    await app.close();
  }
});

it("preserves probes, text preview, native errors and protected not-found ownership", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
    expect((await app.inject("/api/ready")).json()).toEqual({ status: "ready" });
    const preview = await app.inject({
      method: "POST",
      url: "/api/text-preview",
      payload: { text: "hi\nthere" },
    });
    expect(preview.json()).toEqual({ characters: 8, lines: 2 });
    for (const [payload, expected] of [
      [{}, 400],
      [{ text: "x".repeat(17_000) }, 413],
    ] as const) {
      const response = await app.inject({ method: "POST", url: "/api/text-preview", payload });
      expect(response.statusCode).toBe(expected);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    }
    expect(
      (await app.inject({ url: "/api/text-preview", headers: { accept: "text/html" } })).json(),
    ).toEqual(notFound);
  } finally {
    await app.close();
  }
  const composed = createServer({ logger: false });
  composed.register(safeErrorsPlugin);
  registerStaticHosting(composed, { enabled: true, root });
  let denied = 0;
  composed.register(
    async (protectedApi) => {
      protectedApi.addHook("onRequest", async () => {
        denied += 1;
        throw Object.assign(new Error("private diagnostic"), { statusCode: 401 });
      });
      protectedApi.setNotFoundHandler(() => {
        throw new Error("must not reach protected not-found");
      });
      protectedApi.get("/known", async () => ({ private: true }));
    },
    { prefix: "/api/private" },
  );
  try {
    for (const method of ["GET", "POST"] as const) {
      for (const url of ["/api/private/missing", "/api/private/known"]) {
        const response = await composed.inject({ method, url, headers: { accept: "text/html" } });
        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe("UNAUTHORIZED");
      }
    }
    expect(denied).toBe(4);
  } finally {
    await composed.close();
  }
});

it("denies nested symlinks and root replacement, including extensionless symlinks", async () => {
  const { root, parent } = await fixture();
  await filesystem.symlink(path.join(parent, "outside.txt"), path.join(root, "escape.txt"));
  await filesystem.symlink(parent, path.join(root, "nested"), "dir");
  await filesystem.symlink(path.join(root, "index.html"), path.join(root, "internal"));
  await filesystem.symlink(path.join(parent, "absent"), path.join(root, "dangling"));
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    for (const url of [
      "/escape.txt",
      "/nested/outside.txt",
      "/nested/deep/link",
      "/internal",
      "/dangling",
    ]) {
      expect((await app.inject({ url, headers: { accept: "text/html" } })).json(), url).toEqual(
        notFound,
      );
    }
    await filesystem.rename(root, path.join(parent, "moved-public"));
    expect(
      (await app.inject({ url: "/deep/link", headers: { accept: "text/html" } })).json(),
    ).toEqual(notFound);
    await filesystem.symlink(path.join(parent, "moved-public"), root, "dir");
    expect((await app.inject({ url: "/index.html" })).json()).toEqual(notFound);
  } finally {
    await app.close();
  }
});

it("fails startup safely for absent/invalid roots, entries and root-ancestor symlinks", async () => {
  const { root, parent } = await fixture();
  const rootAlias = path.join(parent, "alias");
  await filesystem.symlink(root, rootAlias, "dir");
  await filesystem.symlink(path.join(root, "index.html"), path.join(root, "linked.html"));
  const create = vi.spyOn(application, "buildApp");
  for (const hosting of [
    { root: path.join(parent, "missing") },
    { root: path.join(root, "index.html") },
    { root: rootAlias },
    { root: path.join(rootAlias, "assets") },
    { root, entry: "missing.html" },
    { root, entry: "assets" },
    { root, entry: "linked.html" },
  ]) {
    await expect(createStaticHostingApp({ enabled: true, ...hosting })).rejects.toThrow(
      /^Unable to initialize static hosting application$/u,
    );
    const app = create.mock.results.at(-1)!.value;
    expect(app.server.listening).toBe(false);
    await expect(app.inject("/api/health")).rejects.toThrow();
  }
});

it("fails closed when entry or asset verification becomes unavailable", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    const read = vi
      .spyOn(filesystem, "readdir")
      .mockRejectedValue(Object.assign(new Error("private path"), { code: "EACCES" }));
    expect(
      (await app.inject({ url: "/deep/link", headers: { accept: "text/html" } })).json(),
    ).toEqual(notFound);
    read.mockRestore();
    await filesystem.rename(path.join(root, "index.html"), path.join(root, "old-index.html"));
    expect(
      (await app.inject({ url: "/deep/link", headers: { accept: "text/html" } })).json(),
    ).toEqual(notFound);
    expect((await app.inject("/assets/app.js")).statusCode).toBe(200);
  } finally {
    await app.close();
  }
});

it("terminates safely if an asset disappears between verification and native sendFile", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  const asset = path.join(root, "assets/app.js");
  const { lstat: originalStat } = await vi.importActual<typeof filesystem>("node:fs/promises");
  const stat = vi.spyOn(filesystem, "lstat").mockImplementation(async (...arguments_) => {
    const metadata = await originalStat(...arguments_);
    if (arguments_[0] === asset) {
      await filesystem.rename(asset, path.join(root, "assets/moved.js"));
    }
    return metadata;
  });
  try {
    const response = await app.inject("/assets/app.js");
    expect(response.statusCode).toBe(404);
    expect(response.body).toBe("404 Not Found");
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    await expect(filesystem.readFile(path.join(root, "assets/moved.js"), "utf8")).resolves.toBe(
      'document.title = "Hosted";',
    );
  } finally {
    stat.mockRestore();
    await app.close();
  }
});

it("keeps native range responses and errors under the application response policy", async () => {
  const { root } = await fixture();
  const app = await createStaticHostingApp({ enabled: true, root });
  try {
    const partial = await app.inject({ url: "/assets/app.js", headers: { range: "bytes=0-7" } });
    expect(partial.statusCode).toBe(206);
    expect(partial.body).toBe("document");
    expect(partial.headers["content-range"]).toMatch(/^bytes 0-7\//u);
    const invalid = await app.inject({ url: "/assets/app.js", headers: { range: "bytes=9999-" } });
    expect(invalid.statusCode).toBe(416);
    expect(invalid.headers["content-range"]).toBe("bytes */26");
    expect(invalid.json()).toEqual({
      statusCode: 416,
      error: { code: "REQUEST_FAILED", message: "Request failed" },
    });
    for (const response of [partial, invalid]) {
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    }
    const jsonMiss = await app.inject({
      url: "/deep/link",
      headers: { accept: "application/json" },
    });
    expect(jsonMiss.headers.vary).toBe("Accept");
    const unsupported = await app.inject({
      method: "POST",
      url: "/api/text-preview",
      headers: { "content-type": "application/unknown" },
      payload: "synthetic",
    });
    expect(unsupported.statusCode).toBe(415);
    expect(unsupported.headers["cache-control"]).toBe("no-store");
  } finally {
    await app.close();
  }
});

it("rejects filesystem spelling aliases and exact API files without serving or falling back", async () => {
  const { root } = await fixture();
  await filesystem.rename(path.join(root, "api"), path.join(root, "api-files"));
  await filesystem.writeFile(path.join(root, "api"), "Blocked exact API file");
  const app = await createStaticHostingApp({ enabled: true, root });
  const read = vi.spyOn(filesystem, "readdir");
  try {
    expect((await app.inject({ url: "/api", headers: { accept: "text/html" } })).json()).toEqual(
      notFound,
    );
    read.mockResolvedValue([]);
    expect(
      (await app.inject({ url: "/index.html", headers: { accept: "text/html" } })).json(),
    ).toEqual(notFound);
  } finally {
    read.mockRestore();
    await app.close();
  }
});

it("forwards only validated native 416 range metadata within the static scope", async () => {
  const { root } = await fixture();
  for (const candidate of [
    undefined,
    null,
    "bytes */26",
    {},
    { "Content-Range": 26 },
    { "Content-Range": "bytes */-1" },
    { "Content-Range": "bytes */026" },
    { "Content-Range": "bytes */9007199254740992" },
    { "Content-Range": "bytes */26\r\nx-private: synthetic" },
    { "Content-Range": "bytes */26", "x-private": "synthetic", "content-type": "text/html" },
  ]) {
    const app = createServer({ logger: false });
    app.register(safeErrorsPlugin);
    app.addHook("onError", async (_request, _reply, error) => {
      Object.assign(error, { headers: candidate });
    });
    app.get("/api/range-error", async () => {
      throw Object.assign(new Error("private diagnostic"), { statusCode: 416 });
    });
    registerStaticHosting(app, { enabled: true, root });
    try {
      const response = await app.inject({
        url: "/assets/app.js",
        headers: { range: "bytes=9999-" },
      });
      expect(response.statusCode).toBe(416);
      expect(response.headers["content-range"]).toBe(
        typeof candidate === "object" && candidate?.["Content-Range"] === "bytes */26"
          ? "bytes */26"
          : undefined,
      );
      expect(response.headers["x-private"]).toBeUndefined();
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.json()).toEqual({
        statusCode: 416,
        error: { code: "REQUEST_FAILED", message: "Request failed" },
      });
      const outside = await app.inject("/api/range-error");
      expect(outside.statusCode).toBe(416);
      expect(outside.headers["content-range"]).toBeUndefined();
      expect(outside.headers["x-private"]).toBeUndefined();
    } finally {
      await app.close();
    }
  }
  const app = createServer({ logger: false });
  app.register(safeErrorsPlugin);
  app.addHook("onError", async (_request, _reply, error) => {
    Object.assign(error, { statusCode: 500, headers: { "Content-Range": "bytes */26" } });
  });
  registerStaticHosting(app, { enabled: true, root });
  try {
    const response = await app.inject({ url: "/assets/app.js", headers: { range: "bytes=9999-" } });
    expect(response.statusCode).toBe(500);
    expect(response.headers["content-range"]).toBeUndefined();
    expect(response.json()).toEqual({
      statusCode: 500,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  } finally {
    await app.close();
  }
});
