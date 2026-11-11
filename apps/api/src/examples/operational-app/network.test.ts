import { once } from "node:events";
import { createServer } from "node:net";
import { Writable } from "node:stream";
import { expect, it, vi } from "vite-plus/test";
import { createOperationalApp } from "./app.js";
import { parseOperationalConfiguration } from "./configuration.js";
import { createOperationalLoggingOptions, createOperationalReporter } from "./logging.js";

it("serves real loopback requests with safe operational logs and releases its resources/listener", async () => {
  const messages: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      messages.push(String(chunk));
      done();
    },
  });
  const close = vi.fn(async () => {});
  const app = await createOperationalApp(
    parseOperationalConfiguration({}),
    { acquire: [async () => ({ check: async () => true, close })] },
    createOperationalLoggingOptions({ enabled: true, stream }),
  );
  const report = createOperationalReporter(app.log);
  let port = 0;
  try {
    await app.listen({ host: "127.0.0.1", port: 0 });
    report("server-started");
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected loopback listener");
    port = address.port;
    expect(address.address).toBe("127.0.0.1");
    const response = await fetch(
      `http://127.0.0.1:${port}/api/operation?code=synthetic-network-oauth`,
      {
        signal: AbortSignal.timeout(2_000),
        headers: {
          cookie: "session=synthetic-network-cookie",
          authorization: "Bearer synthetic-network-authorization",
        },
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ completed: true });
  } finally {
    await app.close();
    report("server-stopped");
    stream.end();
  }
  expect(close).toHaveBeenCalledOnce();
  expect(app.server.listening).toBe(false);
  const output = messages.join("");
  expect(output).toContain("server-started");
  expect(output).toContain("server-stopped");
  expect(output).toContain("request-completed");
  expect(output).not.toContain("synthetic-network-");
  const probe = createServer();
  try {
    probe.listen({ host: "127.0.0.1", port });
    await once(probe, "listening");
    expect(probe.listening).toBe(true);
  } finally {
    if (probe.listening)
      await new Promise<void>((resolve, reject) =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
  }
});

it("allows the listener owner to roll resources back after real listen failure", async () => {
  const occupied = createServer();
  occupied.listen({ host: "127.0.0.1", port: 0 });
  await once(occupied, "listening");
  try {
    const address = occupied.address();
    if (!address || typeof address === "string") throw new Error("Expected occupied listener");
    const close = vi.fn(async () => {});
    const app = await createOperationalApp(parseOperationalConfiguration({}), {
      acquire: [async () => ({ check: async () => true, close })],
    });
    try {
      await expect(app.listen({ host: "127.0.0.1", port: address.port })).rejects.toMatchObject({
        code: "EADDRINUSE",
      });
    } finally {
      await app.close();
    }
    expect(close).toHaveBeenCalledOnce();
    expect(app.server.listening).toBe(false);
    expect(occupied.listening).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      occupied.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
