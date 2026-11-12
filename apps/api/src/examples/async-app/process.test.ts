import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it, vi } from "vite-plus/test";

const builtModule = (path: string) =>
  JSON.stringify(pathToFileURL(resolve("apps/api/dist/examples", path)).href);

async function fixtureDirectory() {
  const parent = resolve(".vite/runner-process");
  await mkdir(parent, { recursive: true });
  return mkdtemp(`${parent}/case-`);
}

function launch(code: string, cwd: string, environment: NodeJS.ProcessEnv = {}) {
  const child = spawn(process.execPath, ["--input-type=module", "--eval", code], {
    cwd,
    env: environment,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const messages: { event: string; origin?: string; listening?: boolean }[] = [];
  let stdout = "";
  let stderr = "";
  child.stdout!.setEncoding("utf8").on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr!.setEncoding("utf8").on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("message", (message) => {
    messages.push(message as (typeof messages)[number]);
  });
  const exited = once(child, "close");
  return {
    child,
    exited,
    output: () => ({ stdout, stderr }),
    async message(event: string) {
      await vi.waitFor(
        () => {
          expect(child.exitCode, stderr).toBeNull();
          expect(messages.some((message) => message.event === event)).toBe(true);
        },
        { timeout: 3_000, interval: 10 },
      );
      return messages.find((message) => message.event === event)!;
    },
    async finish() {
      await vi.waitFor(
        () => expect(child.exitCode !== null || child.signalCode !== null).toBe(true),
        { timeout: 3_000, interval: 10 },
      );
      return exited;
    },
    async dispose() {
      if (child.exitCode === null && child.signalCode === null) {
        if (child.connected) {
          child.send("release-acquisition");
          child.send("release-cleanup");
        }
        child.kill("SIGTERM");
        await vi.waitFor(
          () => expect(child.exitCode !== null || child.signalCode !== null).toBe(true),
          { timeout: 6_000, interval: 10 },
        );
      }
      await exited;
    },
  };
}

async function portReservation() {
  const server = createServer();
  server.listen({ host: "127.0.0.1", port: 0 });
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected loopback listener");
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

async function assertReleased(port: number) {
  const probe = createServer();
  try {
    probe.listen({ host: "127.0.0.1", port });
    await once(probe, "listening");
  } finally {
    if (probe.listening)
      await new Promise<void>((resolve, reject) =>
        probe.close((error) => (error ? reject(error) : resolve())),
      );
  }
}

function operationalChild(mode: string, port: number) {
  return `
    import { startDemo } from ${builtModule("async-app/startup.js")};
    import { createOperationalApp } from ${builtModule("operational-app/app.js")};
    import { parseOperationalConfiguration } from ${builtModule("operational-app/configuration.js")};
    const mode = ${JSON.stringify(mode)};
    const received = new Set();
    const waiting = new Map();
    process.on("message", (message) => {
      received.add(message);
      waiting.get(message)?.();
    });
    const wait = (event) => received.has(event) ? Promise.resolve() : new Promise((resolve) => waiting.set(event, resolve));
    const send = (event, details = {}) => process.send({ event, ...details });
    let closes = 0;
    try {
      const demo = await startDemo({ PORT: ${JSON.stringify(String(port))} }, undefined, () => createOperationalApp(
        parseOperationalConfiguration({ readinessTimeoutMs: 5000 }),
        { acquire: [async () => {
          if (mode === "startup") process.once("SIGTERM", () => send("signal-received"));
          send("acquiring");
          if (mode === "startup") await wait("release-acquisition");
          if (mode === "deadline") await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            check: async () => true,
            close: async () => {
              closes += 1;
              process.channel.ref();
              send("closing");
              await wait("release-cleanup");
              send("closed");
              process.channel.unref();
              if (mode === "shutdown-failure") throw new Error("synthetic-private-shutdown");
            },
          };
        }, ...(mode === "initialization-failure" ? [async () => { throw new Error("synthetic-private-initialization"); }] : [])] },
        { logger: false, ...(mode === "deadline" ? { pluginTimeout: 20 } : {}) },
      ));
      send("started", { origin: demo.app.server.listening ? demo.app.listeningOrigin : undefined, listening: demo.app.server.listening });
      if (mode === "startup") process.disconnect();
      else process.channel.unref();
    } catch {
      console.error("Local server demo failed to start");
      process.exitCode = 1;
      process.disconnect();
    }
    process.on("exit", () => {
      console.log(JSON.stringify({ closes, handlers: [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")] }));
    });
  `;
}

it.each(["SIGINT", "SIGTERM"] as const)(
  "loads only a synthetic startup .env, serves preserved routes, and exits after %s",
  async (signal) => {
    const directory = await fixtureDirectory();
    const reservation = await portReservation();
    await reservation.close();
    await writeFile(resolve(directory, ".env"), `HOST=127.0.0.1\nPORT=${reservation.port}\n`);
    const running = launch(
      `await import(${builtModule("async-app/server.js")}); process.disconnect();`,
      directory,
    );
    try {
      await vi.waitFor(
        () => expect(running.output().stdout).toContain(`http://127.0.0.1:${reservation.port}`),
        { timeout: 3_000, interval: 10 },
      );
      const origin = `http://127.0.0.1:${reservation.port}`;
      const example = await fetch(`${origin}/api/example`, { signal: AbortSignal.timeout(2_000) });
      expect(await example.json()).toMatchObject({ transportAvailable: true, localEntries: 2 });
      const preview = await fetch(`${origin}/api/text-preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "a\nb" }),
        signal: AbortSignal.timeout(2_000),
      });
      expect(await preview.json()).toEqual({ characters: 3, lines: 2 });
      const oversized = await fetch(`${origin}/api/text-preview?value=synthetic-private-query`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "synthetic-private-header" },
        body: JSON.stringify({ text: "x".repeat(16_384) }),
        signal: AbortSignal.timeout(2_000),
      });
      expect(oversized.status).toBe(413);
      expect(await oversized.json()).toEqual({
        statusCode: 413,
        error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
      });
      running.child.kill(signal);
      expect(await running.finish()).toEqual([0, null]);
      expect(running.output().stderr).toBe("");
      expect(running.output().stdout).toBe(`Local server demo listening at ${origin}\n`);
      await assertReleased(reservation.port);
    } finally {
      await running.dispose();
    }
  },
);

it("validates loaded env values before construction without exposing them", async () => {
  const directory = await fixtureDirectory();
  await writeFile(resolve(directory, ".env"), "HOST=synthetic-private-invalid-host\n");
  const running = launch(
    `await import(${builtModule("async-app/server.js")}); process.disconnect();`,
    directory,
  );
  try {
    expect(await running.finish()).toEqual([1, null]);
    expect(running.output()).toEqual({ stdout: "", stderr: "Local server demo failed to start\n" });
  } finally {
    await running.dispose();
  }
});

it.each([
  "running",
  "startup",
  "shutdown-failure",
  "initialization-failure",
  "deadline",
  "listen-failure",
])("owns real operational child startup/signals/cleanup for %s", async (mode) => {
  const directory = await fixtureDirectory();
  const reservation = await portReservation();
  let occupied = mode === "listen-failure";
  if (mode !== "listen-failure") await reservation.close();
  const running = launch(operationalChild(mode, reservation.port), directory);
  try {
    await running.message("acquiring");
    if (mode === "startup") {
      running.child.kill("SIGTERM");
      await running.message("signal-received");
      running.child.send("release-acquisition");
    } else if (mode === "running" || mode === "shutdown-failure") {
      const started = await running.message("started");
      expect(started.listening).toBe(true);
      const response = await fetch(`${started.origin}/api/operation`, {
        signal: AbortSignal.timeout(2_000),
      });
      expect(await response.json()).toEqual({ completed: true });
      running.child.kill("SIGINT");
    }
    await running.message("closing");
    running.child.kill("SIGTERM");
    running.child.kill("SIGINT");
    expect(running.child.exitCode).toBeNull();
    running.child.send("release-cleanup");
    const failed = !["running", "startup"].includes(mode);
    expect(await running.finish()).toEqual([failed ? 1 : 0, null]);
    const output = running.output();
    expect(output.stdout.trim()).toBe('{"closes":1,"handlers":[0,0]}');
    expect(output.stderr).toBe(
      mode === "shutdown-failure"
        ? "Local server demo shutdown failed\n"
        : failed
          ? "Local server demo failed to start\n"
          : "",
    );
    expect(JSON.stringify(output)).not.toContain("synthetic-private-");
    if (occupied) {
      await reservation.close();
      occupied = false;
    }
    await assertReleased(reservation.port);
  } finally {
    await running.dispose();
    if (occupied) await reservation.close();
  }
});
