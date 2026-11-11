import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer as createPortProbe } from "node:net";
import Fastify, {
  type FastifyInstance,
  type FastifyPluginAsync,
  type FastifyPluginCallback,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import {
  createServer,
  healthRoutes,
  safeErrorsPlugin,
  type FastifyInstance as PublicFastifyInstance,
  type FastifyPluginAsync as PublicFastifyPluginAsync,
  type FastifyPluginCallback as PublicFastifyPluginCallback,
  type FastifyServerOptions,
} from "@littlejay/server";
import { verifyLoggingCompatibility } from "./logging.js";

declare module "fastify" {
  interface FastifyInstance {
    consumerLabel: string;
  }
  interface FastifyRequest {
    consumerToken: string;
  }
}

const [fastifyVersion, nodeTypes, nodeVersion] = process.argv.slice(2);
assert.equal(process.versions.node, nodeVersion);
const logging = await verifyLoggingCompatibility();
const require = createRequire(import.meta.url);
const serverRequire = createRequire(import.meta.resolve("@littlejay/server"));
assert.equal(
  realpathSync(require.resolve("fastify")),
  realpathSync(serverRequire.resolve("fastify")),
);
assert.equal(require("fastify/package.json").version, fastifyVersion);
assert.equal(require("@types/node/package.json").version, nodeTypes);
const signalListeners = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
const options: FastifyServerOptions = { logger: false, bodyLimit: 16_384, exposeHeadRoutes: false };
const server: FastifyInstance = createServer(options);
const publicInstance: PublicFastifyInstance = server;
const nativeInstance: PublicFastifyInstance = Fastify({ logger: false });
await nativeInstance.close();
assert.equal(publicInstance, server);
assert.deepEqual([process.listeners("SIGINT"), process.listeners("SIGTERM")], signalListeners);
const hooks: string[] = [];
let closes = 0;
let assignedPort = 0;
let readiness = false;
const asyncPlugin: PublicFastifyPluginAsync<{ label: string }> = async (
  instance,
  configuration,
) => {
  instance.decorate("consumerLabel", configuration.label);
  instance.get<{
    Params: { id: string };
    Querystring: { detail: string };
    Reply: { id: string; detail: string; label: string; token: string };
  }>("/native/:id", async (request, reply) => {
    return reply.code(200).send({
      id: request.params.id,
      detail: request.query.detail,
      label: instance.consumerLabel,
      token: request.consumerToken,
    });
  });
};
const nativePlugin: FastifyPluginAsync<{ label: string }> = asyncPlugin;
const callbackPlugin: FastifyPluginCallback = (instance, _options, done) => {
  instance.get("/callback", async () => ({ callback: true }));
  done();
};
const publicCallbackPlugin: PublicFastifyPluginCallback = callbackPlugin;
try {
  server.decorateRequest("consumerToken", "");
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    request.consumerToken = "synthetic-token";
    reply.header("x-consumer-hook", "active");
    hooks.push("request");
  });
  server.addHook("preHandler", async (request) => {
    assert.equal(request.consumerToken, "synthetic-token");
    hooks.push("handler");
  });
  server.addHook("onClose", async () => {
    closes += 1;
  });
  server.register(safeErrorsPlugin);
  server.register(healthRoutes, { prefix: "/probes", checks: [async () => readiness] });
  server.register(nativePlugin, { prefix: "/plugin", label: "consumer-owned" });
  server.register(publicCallbackPlugin);
  server.get("/unexpected", async () => {
    throw new Error("synthetic-private-diagnostic");
  });
  server.post("/limited", async () => ({ accepted: true }));
  await server.ready();
  assert.equal(server.server.listening, false);
  assert.equal(server.hasDecorator("consumerLabel"), false);
  const response = await server.inject("/plugin/native/42?detail=typed");
  assert.deepEqual(response.json(), {
    id: "42",
    detail: "typed",
    label: "consumer-owned",
    token: "synthetic-token",
  });
  assert.equal(response.headers["x-consumer-hook"], "active");
  assert.deepEqual(hooks, ["request", "handler"]);
  assert.deepEqual((await server.inject("/callback")).json(), { callback: true });
  assert.deepEqual((await server.inject("/probes/health")).json(), { status: "ok" });
  assert.equal((await server.inject("/probes/ready")).statusCode, 503);
  readiness = true;
  assert.deepEqual((await server.inject("/probes/ready")).json(), { status: "ready" });
  assert.deepEqual((await server.inject("/unexpected")).json(), {
    statusCode: 500,
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
  assert.equal((await server.inject("/missing")).statusCode, 404);
  assert.equal(
    (
      await server.inject({
        method: "POST",
        url: "/limited",
        payload: { text: "x".repeat(17_000) },
      })
    ).statusCode,
    413,
  );
  await server.listen({ host: "127.0.0.1", port: 0 });
  const address = server.server.address();
  assert.ok(address && typeof address !== "string");
  assignedPort = address.port;
  const networkResponse = await fetch(
    `http://127.0.0.1:${assignedPort}/plugin/native/7?detail=network`,
    { signal: AbortSignal.timeout(5_000) },
  );
  assert.equal(networkResponse.status, 200);
  assert.deepEqual(await networkResponse.json(), {
    id: "7",
    detail: "network",
    label: "consumer-owned",
    token: "synthetic-token",
  });
} finally {
  await server.close();
}
assert.equal(closes, 1);
assert.equal(server.server.listening, false);
assert.deepEqual([process.listeners("SIGINT"), process.listeners("SIGTERM")], signalListeners);
const probe = createPortProbe();
try {
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen({ host: "127.0.0.1", port: assignedPort }, resolve);
  });
} finally {
  if (probe.listening)
    await new Promise<void>((resolve, reject) =>
      probe.close((error) => (error ? reject(error) : resolve())),
    );
}
console.log(
  JSON.stringify({
    passed: true,
    node: process.versions.node,
    fastify: fastifyVersion,
    nodeTypes,
    pid: process.pid,
    port: assignedPort,
    listenerClosed: true,
    logging,
  }),
);
