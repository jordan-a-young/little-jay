import assert from "node:assert/strict";
import { mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer as createPortProbe } from "node:net";
import path from "node:path";
import { createServer, healthRoutes, safeErrorsPlugin } from "@littlejay/server";
import { LogController } from "fastify";
import { registerStaticHosting } from "./application/static-hosting/hosting.js";

/** Exercises staged authored hosting against the packed server and this consumer's native plugins. */
export async function verifyStaticHostingCompatibility() {
  const require = createRequire(import.meta.url);
  const pluginVersion: string = require("@fastify/static/package.json").version;
  assert.equal(pluginVersion, "10.1.7");
  const staticRequire = createRequire(import.meta.resolve("@fastify/static"));
  assert.equal(
    await realpath(require.resolve("fastify")),
    await realpath(staticRequire.resolve("fastify")),
  );
  const root = path.resolve("public");
  await mkdir(path.join(root, "api"), { recursive: true });
  const entry =
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Static hosting fixture</title><link rel="stylesheet" href="/site.css"><script src="/app.js" defer></script></head><body><main><h1>Static hosting fixture</h1><p id="status">Loading fixture script</p><a href="/projects/example">Open deep link</a></main></body></html>';
  await writeFile(path.join(root, "index.html"), entry);
  await writeFile(
    path.join(root, "site.css"),
    "body { font: 1rem/1.5 system-ui; margin: 2rem; } main { max-width: 45rem; } a { color: #16469b; }",
  );
  await writeFile(
    path.join(root, "app.js"),
    'document.getElementById("status").textContent = "External script loaded";',
  );
  await writeFile(path.join(root, "café.txt"), "Unicode public asset");
  await writeFile(path.join(root, ".hidden"), "blocked synthetic content");
  await writeFile(path.join(root, "api/private.js"), "blocked synthetic content");
  await symlink(path.join(root, "index.html"), path.join(root, "linked"));
  const app = createServer({
    logger: false,
    requestIdHeader: false,
    logController: new LogController({ disableRequestLogging: true }),
  });
  const contentSecurityPolicy =
    "default-src 'none'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'";
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("content-security-policy", contentSecurityPolicy);
    reply.header("cache-control", "no-store");
    reply.header("x-content-type-options", "nosniff");
    return payload;
  });
  app.register(safeErrorsPlugin);
  app.register(healthRoutes, { prefix: "/api" });
  registerStaticHosting(app, { enabled: true, root });
  app.register(
    async (protectedApi) => {
      protectedApi.addHook("onRequest", async () => {
        throw Object.assign(new Error("Authentication required"), { statusCode: 401 });
      });
      protectedApi.setNotFoundHandler(() => {
        throw new Error("Unreachable protected handler");
      });
    },
    { prefix: "/api/protected" },
  );
  let port = 0;
  try {
    await app.ready();
    assert.equal(app.server.listening, false);
    assert.deepEqual((await app.inject("/api/health")).json(), { status: "ok" });
    for (const url of ["/", "/projects/example?x=1"]) {
      const response = await app.inject({ url, headers: { accept: "text/html;q=0.5" } });
      assert.equal(response.statusCode, 200);
      assert.equal(response.body, entry);
      assert.equal(response.headers["content-security-policy"], contentSecurityPolicy);
      assert.equal(response.headers["cache-control"], "no-store");
    }
    assert.equal((await app.inject("/caf%C3%A9.txt")).body, "Unicode public asset");
    const unsatisfiedRange = await app.inject({
      url: "/app.js",
      headers: { range: "bytes=999999-" },
    });
    assert.equal(unsatisfiedRange.statusCode, 416);
    assert.equal(
      unsatisfiedRange.headers["content-range"],
      `bytes */${Buffer.byteLength('document.getElementById("status").textContent = "External script loaded";')}`,
    );
    assert.deepEqual(unsatisfiedRange.json(), {
      statusCode: 416,
      error: { code: "REQUEST_FAILED", message: "Request failed" },
    });
    assert.equal(unsatisfiedRange.headers["cache-control"], "no-store");
    assert.equal(unsatisfiedRange.headers["content-security-policy"], contentSecurityPolicy);
    assert.equal((await app.inject({ method: "HEAD", url: "/app.js" })).body, "");
    assert.equal(
      (await app.inject({ method: "HEAD", url: "/deep/link", headers: { accept: "text/html" } }))
        .statusCode,
      404,
    );
    for (const accept of ["*/*", "application/json", "text/html;q=0, */*;q=1"]) {
      assert.equal((await app.inject({ url: "/deep/link", headers: { accept } })).statusCode, 404);
    }
    for (const url of [
      "/api",
      "/api/private.js",
      "/%61pi/private.js",
      "/assets/missing.js",
      "/.hidden",
      "/linked",
      "/deep%2Flink",
    ]) {
      const response = await app.inject({ url, headers: { accept: "text/html" } });
      assert.equal(response.statusCode, 404);
      assert.deepEqual(response.json(), {
        statusCode: 404,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
      assert.equal(response.headers["cache-control"], "no-store");
      assert.equal(response.headers["content-security-policy"], contentSecurityPolicy);
    }
    assert.equal(
      (await app.inject({ method: "POST", url: "/deep/link", headers: { accept: "text/html" } }))
        .statusCode,
      404,
    );
    assert.equal((await app.inject("/api/protected/missing")).statusCode, 401);
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address !== "string");
    port = address.port;
    const response = await fetch(`http://127.0.0.1:${port}/projects/example`, {
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(5_000),
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), entry);
  } finally {
    await app.close();
  }
  assert.equal(app.server.listening, false);
  const probe = createPortProbe();
  try {
    await new Promise<void>((resolve, reject) => {
      probe.once("error", reject);
      probe.listen({ host: "127.0.0.1", port }, resolve);
    });
  } finally {
    if (probe.listening)
      await new Promise<void>((resolve, reject) =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
  }
  return { passed: true, listenerClosed: !probe.listening, pluginVersion, port, root };
}
