import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { finished } from "node:stream/promises";
import Fastify, { LogController } from "fastify";
import { createServer, safeErrorsPlugin } from "@littlejay/server";

/** Exercise native logging through installed server/Fastify types and actual packed runtime behavior. */
export async function verifyLoggingCompatibility() {
  const counts: Record<string, number> = {};
  for (const mode of ["disabled", "configured", "injected"] as const) {
    const messages: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        messages.push(String(chunk));
        done();
      },
    });
    const loggerOptions = {
      level: "info",
      stream,
      serializers: {
        req: () => ({ kind: "request" }),
        err: () => ({
          type: "Error",
          message: "Operation failed",
          stack: "",
          category: "unexpected",
        }),
      },
      redact: { paths: ["privateValue", "configuration"], remove: true },
    };
    const loggerOwner = mode === "injected" ? Fastify({ logger: loggerOptions }) : undefined;
    const server = createServer({
      requestIdHeader: false,
      logController: new LogController({ disableRequestLogging: true }),
      ...(loggerOwner
        ? { loggerInstance: loggerOwner.log }
        : { logger: mode === "disabled" ? false : loggerOptions }),
    });
    try {
      server.register(safeErrorsPlugin);
      server.get("/ok", async () => ({ ok: true }));
      server.get("/rejected", async () => {
        throw Object.assign(new Error("synthetic-packed-private-rejection"), { statusCode: 401 });
      });
      server.get("/unexpected", async () => {
        throw new Error("synthetic-packed-private-exception");
      });
      server.post(
        "/validated",
        {
          schema: {
            body: {
              type: "object",
              required: ["count"],
              properties: { count: { type: "integer" } },
            },
          },
        },
        async () => ({ ok: true }),
      );
      await server.ready();
      server.log.info(
        {
          event: "startup",
          privateValue: "synthetic-packed-private-field",
          configuration: { token: "synthetic-packed-private-configuration" },
          req: {
            url: "/?code=synthetic-packed-private-oauth",
            headers: { cookie: "synthetic-packed-private-cookie" },
          },
        },
        "Packed operational event",
      );
      server.log.error(
        { err: new Error("synthetic-packed-private-diagnostic") },
        "Packed fixed failure",
      );
      assert.deepEqual(
        (
          await server.inject({
            url: "/ok?code=synthetic-packed-private-query",
            headers: {
              authorization: "Bearer synthetic-packed-private-auth",
              "x-request-id": "synthetic-packed-private-request-id",
            },
          })
        ).json(),
        { ok: true },
      );
      assert.equal((await server.inject("/rejected")).statusCode, 401);
      assert.equal(
        (await server.inject("/missing?code=synthetic-packed-private-missing")).statusCode,
        404,
      );
      assert.equal(
        (
          await server.inject({
            method: "POST",
            url: "/validated",
            payload: { value: "synthetic-packed-private-body" },
          })
        ).statusCode,
        400,
      );
      assert.deepEqual((await server.inject("/unexpected")).json(), {
        statusCode: 500,
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      });
    } finally {
      await server.close();
      server.log.info({ event: "shutdown" }, "Packed operational event");
      await loggerOwner?.close();
      stream.end();
      await finished(stream);
    }
    const output = messages.join("");
    assert.ok(!output.includes("synthetic-packed-private-"));
    if (mode !== "disabled") {
      const records = output
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      assert.equal(records.length, 3);
      assert.equal(records[0]!.event, "startup");
      assert.deepEqual(records[0]!.req, { kind: "request" });
      assert.deepEqual(records[1]!.err, {
        type: "Error",
        message: "Operation failed",
        stack: "",
        category: "unexpected",
      });
      assert.equal(records[2]!.event, "shutdown");
      counts[mode] = records.length;
    } else {
      assert.equal(output, "");
      counts.disabled = 0;
    }
  }
  return counts;
}
