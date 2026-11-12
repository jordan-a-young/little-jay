import { once } from "node:events";
import { createServer } from "node:net";
import { Writable } from "node:stream";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { startDemo } from "../async-app/startup.js";
import { createOperationalApp } from "./app.js";
import { parseOperationalConfiguration } from "./configuration.js";
import { createOperationalLoggingOptions } from "./logging.js";

afterEach(() => vi.restoreAllMocks());

function capture() {
  const messages: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      messages.push(String(chunk));
      done();
    },
  });
  return { stream, text: () => messages.join("") };
}

async function reservePort() {
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

const signals = () => [process.listeners("SIGINT"), process.listeners("SIGTERM")] as const;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

it("cleans real operational resources after real runner listen failure with safe logs", async () => {
  const occupied = await reservePort();
  const output = capture();
  const close = vi.fn(async () => {});
  const before = signals();
  try {
    await expect(
      startDemo({ PORT: String(occupied.port) }, undefined, () =>
        createOperationalApp(
          parseOperationalConfiguration({}),
          { acquire: [async () => ({ check: async () => true, close })] },
          createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
        ),
      ),
    ).rejects.toThrow("Unable to start local server demo");
    expect(close).toHaveBeenCalledOnce();
    expect(signals()).toEqual(before);
    expect(output.text()).toContain("resources-ready");
    expect(output.text()).toContain("resources-closed");
  } finally {
    await occupied.close();
    output.stream.end();
  }
});

it("reuses the real runner without accumulating handlers and releases every listener", async () => {
  const unrelated = () => {};
  process.on("SIGINT", unrelated);
  process.on("SIGTERM", unrelated);
  const before = signals();
  const reservation = await reservePort();
  await reservation.close();
  try {
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const close = vi.fn(async () => {});
      const demo = await startDemo({ PORT: String(reservation.port) }, undefined, () =>
        createOperationalApp(parseOperationalConfiguration({}), {
          acquire: [async () => ({ check: async () => true, close })],
        }),
      );
      try {
        expect(demo.app.server.address()).toMatchObject({
          address: "127.0.0.1",
          port: reservation.port,
        });
        expect(demo.app.initialConfig).toMatchObject({ bodyLimit: 16_384, requestTimeout: 15_000 });
        const response = await fetch(`${demo.app.listeningOrigin}/api/operation`, {
          signal: AbortSignal.timeout(2_000),
        });
        expect(await response.json()).toEqual({ completed: true });
        const stopping = demo.stop();
        expect(demo.stop()).toBe(stopping);
        await stopping;
        expect(close).toHaveBeenCalledOnce();
        expect(demo.app.server.listening).toBe(false);
        expect(signals()).toEqual(before);
      } finally {
        await demo.stop();
      }
    }
  } finally {
    process.removeListener("SIGINT", unrelated);
    process.removeListener("SIGTERM", unrelated);
  }
});

it("holds startup-signal ownership until late operational initialization and cleanup settle", async () => {
  const acquired = deferred();
  const releaseAcquisition = deferred();
  const releaseCleanup = deferred();
  const closing = deferred();
  const close = vi.fn(async () => {
    closing.resolve();
    await releaseCleanup.promise;
  });
  const before = signals();
  const startup = startDemo({}, undefined, () =>
    createOperationalApp(parseOperationalConfiguration({ readinessTimeoutMs: 5_000 }), {
      acquire: [
        async () => {
          acquired.resolve();
          await releaseAcquisition.promise;
          return { check: async () => true, close };
        },
      ],
    }),
  );
  try {
    await acquired.promise;
    const interrupt = process.listeners("SIGINT").find((handler) => !before[0]!.includes(handler))!;
    const terminate = process
      .listeners("SIGTERM")
      .find((handler) => !before[1]!.includes(handler))!;
    const stopped = Promise.all([interrupt("SIGINT"), terminate("SIGTERM"), interrupt("SIGINT")]);
    releaseAcquisition.resolve();
    await closing.promise;
    expect(signals().map((handlers) => handlers.length)).toEqual(
      before.map((handlers) => handlers.length + 1),
    );
    releaseCleanup.resolve();
    const demo = await startup;
    await stopped;
    expect(demo.app.server.listening).toBe(false);
    expect(close).toHaveBeenCalledOnce();
    expect(signals()).toEqual(before);
  } finally {
    releaseAcquisition.resolve();
    releaseCleanup.resolve();
    await (await startup).stop();
  }
});

it.each([false, true])(
  "awaits native readiness timeout rollback, including cleanup failure=%s",
  async (cleanupFails) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const before = signals();
    const acquired = deferred();
    const close = vi.fn(async () => {
      if (cleanupFails) throw new Error("synthetic-private-late-cleanup");
    });
    let settled = false;
    let failure: unknown;
    const startup = (async () => {
      try {
        await startDemo({}, undefined, () =>
          createOperationalApp(
            parseOperationalConfiguration({ readinessTimeoutMs: 5_000 }),
            {
              acquire: [
                async () => {
                  acquired.resolve();
                  await new Promise<void>((resolve) => setTimeout(resolve, 100));
                  return { check: async () => true, close };
                },
              ],
            },
            { ...createOperationalLoggingOptions({ enabled: false }), pluginTimeout: 20 },
          ),
        );
      } catch (error) {
        failure = error;
      } finally {
        settled = true;
      }
    })();
    try {
      await acquired.promise;
      await vi.advanceTimersByTimeAsync(21);
      expect(settled).toBe(false);
      expect(signals().map((handlers) => handlers.length)).toEqual(
        before.map((handlers) => handlers.length + 1),
      );
      await vi.advanceTimersByTimeAsync(79);
      await startup;
      expect(failure).toMatchObject({ message: "Unable to start local server demo" });
      expect(close).toHaveBeenCalledOnce();
      expect(signals()).toEqual(before);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await vi.advanceTimersByTimeAsync(5_000);
      await startup;
      vi.useRealTimers();
    }
  },
);
