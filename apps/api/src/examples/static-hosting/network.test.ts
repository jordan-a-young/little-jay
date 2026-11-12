import { once } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vite-plus/test";
import { startDemo } from "../async-app/startup.js";
import { createStaticHostingApp } from "./app.js";

async function reservePort() {
  const listener = createServer();
  listener.listen({ host: "127.0.0.1", port: 0 });
  await once(listener, "listening");
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Expected owned loopback port");
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        listener.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

/** HTTP request paths intentionally bypass the WHATWG normalization used by fetch/inject. */
async function rawRequest(port: number, requestPath: string, method = "GET") {
  return new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
    const outgoing = request(
      {
        host: "127.0.0.1",
        port,
        path: requestPath,
        method,
        headers: { accept: "text/html" },
        signal: AbortSignal.timeout(2_000),
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.once("error", reject);
        response.once("end", () => resolve({ status: response.statusCode, body }));
      },
    );
    outgoing.once("error", reject);
    outgoing.end();
  });
}

it("uses the existing runner, rejects raw path aliases, and releases its real listener and signal handlers", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "little-jay-hosting-r2-network-"));
  await writeFile(path.join(root, "index.html"), "<!doctype html><title>Hosted</title>");
  const reservation = await reservePort();
  await reservation.close();
  const before = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
  const demo = await startDemo(
    { HOST: "127.0.0.1", PORT: String(reservation.port) },
    undefined,
    () => createStaticHostingApp({ enabled: true, root }),
  );
  try {
    expect(demo.app.server.address()).toMatchObject({
      address: "127.0.0.1",
      port: reservation.port,
    });
    expect((await rawRequest(reservation.port, "/deep/link?mode=html")).status).toBe(200);
    for (const url of [
      "/assets/../index.html",
      "/./index.html",
      "/%2e/index.html",
      "/%2e%2e/index.html",
      "/index.html/.",
      "/index.html/..",
      "//index.html",
      "/index.html%2f..",
      "/%69ndex.html",
      "/api/../index.html",
      "/api%2f..%2findex.html",
      "/deep\\link",
      "/deep%5Clink",
      "/deep//link",
      "/deep#fragment",
    ]) {
      const response = await rawRequest(reservation.port, url);
      expect(response.status, url).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        statusCode: 404,
        error: { code: "NOT_FOUND", message: "Not found" },
      });
    }
    for (const [url, status] of [
      ["/index.html", 200],
      ["/deep/link", 404],
    ] as const) {
      const response = await rawRequest(reservation.port, url, "HEAD");
      expect(response).toEqual({ status, body: "" });
    }
    const stop = demo.stop();
    expect(demo.stop()).toBe(stop);
    await stop;
    expect(demo.app.server.listening).toBe(false);
    expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(before);
  } finally {
    await demo.stop();
  }
  const probe = createServer();
  try {
    probe.listen({ host: "127.0.0.1", port: reservation.port });
    await once(probe, "listening");
  } finally {
    await new Promise<void>((resolve, reject) =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
  }
  expect(probe.listening).toBe(false);
});

it("cleans runner handlers on static initialization and listener failures", async () => {
  const before = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
  await expect(
    startDemo({}, undefined, () =>
      createStaticHostingApp({ enabled: true, root: "/absent-synthetic-hosting-root" }),
    ),
  ).rejects.toThrow("Unable to start local server demo");
  expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(before);
  const occupied = await reservePort();
  let app: Awaited<ReturnType<typeof createStaticHostingApp>> | undefined;
  try {
    await expect(
      startDemo({ PORT: String(occupied.port) }, undefined, async () => {
        app = await createStaticHostingApp();
        return app;
      }),
    ).rejects.toThrow("Unable to start local server demo");
    expect(app!.server.listening).toBe(false);
    await expect(app!.inject("/api/health")).rejects.toThrow();
    expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(before);
  } finally {
    await occupied.close();
  }
});
