import { Writable } from "node:stream";
import { afterEach, expect, it, vi } from "vite-plus/test";
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

it("combines safe nonempty logging, isolated probes, disabled work and reverse cleanup", async () => {
  const output = capture();
  const events: string[] = [];
  const primary = {
    check: vi.fn(async () => true),
    close: vi.fn(async () => {
      events.push("close-primary");
    }),
  };
  const secondary = {
    check: vi.fn(async () => true),
    close: vi.fn(async () => {
      events.push("close-secondary");
    }),
  };
  const runWork = vi.fn(async () => {});
  const operation = vi.fn(async () => true);
  const signalsBefore = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
  const app = await createOperationalApp(
    parseOperationalConfiguration({}),
    {
      acquire: [
        async () => {
          events.push("acquire-primary");
          return primary;
        },
        async () => {
          events.push("acquire-secondary");
          return secondary;
        },
      ],
      runWork,
      operation,
    },
    createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
  );
  const markers = {
    body: "synthetic-private-body-marker",
    cookie: "synthetic-private-cookie-marker",
    authorization: "synthetic-private-auth-marker",
    oauth: "synthetic-private-oauth-marker",
    exception: "synthetic-private-exception-marker",
  };
  try {
    expect(app.server.listening).toBe(false);
    expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(signalsBefore);
    expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
    expect((await app.inject("/api/ready")).statusCode).toBe(200);
    const response = await app.inject({
      url: `/api/operation?code=${markers.oauth}`,
      headers: {
        cookie: `session=${markers.cookie}`,
        authorization: `Bearer ${markers.authorization}`,
      },
    });
    expect(response.json()).toEqual({ completed: true });
    const preview = await app.inject({
      method: "POST",
      url: "/api/text-preview",
      payload: { text: markers.body },
    });
    expect(preview.json()).toEqual({ characters: markers.body.length, lines: 1 });
    expect((await app.inject("/missing")).statusCode).toBe(404);
    expect(
      (await app.inject({ method: "POST", url: "/api/text-preview", payload: {} })).statusCode,
    ).toBe(400);
    operation.mockRejectedValueOnce(
      Object.assign(new Error(markers.exception), { statusCode: 401 }),
    );
    expect((await app.inject("/api/operation")).statusCode).toBe(401);
    operation.mockRejectedValueOnce(new Error(markers.exception));
    expect((await app.inject("/api/operation")).json()).toEqual({
      statusCode: 500,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    operation.mockResolvedValueOnce({ private: markers.exception } as unknown as boolean);
    expect((await app.inject("/api/operation")).statusCode).toBe(500);
    secondary.check.mockResolvedValue(false);
    expect((await app.inject("/api/ready")).json()).toEqual({ status: "not_ready" });
    expect((await app.inject("/api/health")).statusCode).toBe(200);
    expect(runWork).not.toHaveBeenCalled();
  } finally {
    await app.close();
    await app.close();
    output.stream.end();
  }
  expect(events).toEqual([
    "acquire-primary",
    "acquire-secondary",
    "close-secondary",
    "close-primary",
  ]);
  expect(primary.close).toHaveBeenCalledOnce();
  expect(secondary.close).toHaveBeenCalledOnce();
  expect(output.text()).toContain("resources-ready");
  expect(output.text()).toContain("request-completed");
  expect(output.text()).toContain("resources-closed");
  for (const marker of Object.values(markers)) expect(output.text()).not.toContain(marker);
});

it("aborts and awaits active work before dependent resources close, including cleanup failure", async () => {
  const output = capture();
  const events: string[] = [];
  const closePrimary = vi.fn(async () => {
    events.push("close-primary");
  });
  const closeSecondary = vi.fn(async () => {
    events.push("close-secondary");
    throw new Error("synthetic-private-close-marker");
  });
  const runWork = vi.fn(async (signal: AbortSignal) => {
    events.push("work-started");
    await new Promise<void>((resolve) => {
      const finish = () => {
        events.push("work-aborted");
        resolve();
      };
      if (signal.aborted) finish();
      else signal.addEventListener("abort", finish, { once: true });
    });
  });
  const app = await createOperationalApp(
    parseOperationalConfiguration({ backgroundWork: true, workIntervalMs: 10 }),
    {
      acquire: [
        async () => ({ check: async () => true, close: closePrimary }),
        async () => ({ check: async () => true, close: closeSecondary }),
      ],
      runWork,
    },
    createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
  );
  try {
    await vi.waitFor(() => expect(runWork).toHaveBeenCalledOnce(), { timeout: 1_000, interval: 5 });
  } finally {
    await expect(app.close()).rejects.toThrow();
    output.stream.end();
  }
  expect(events).toEqual(["work-started", "work-aborted", "close-secondary", "close-primary"]);
  expect(closePrimary).toHaveBeenCalledOnce();
  expect(closeSecondary).toHaveBeenCalledOnce();
  expect(output.text()).toContain("shutdown-failed");
  expect(output.text()).not.toContain("synthetic-private-close-marker");
});

it("rolls back acquisition failure without exposing diagnostics in logs or factory errors", async () => {
  const output = capture();
  const close = vi.fn(async () => {
    throw new Error("synthetic-private-rollback-marker");
  });
  try {
    await expect(
      createOperationalApp(
        parseOperationalConfiguration({}),
        {
          acquire: [
            async () => ({ check: async () => true, close }),
            async () => {
              throw new Error("synthetic-private-acquisition-marker");
            },
          ],
        },
        createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
      ),
    ).rejects.toThrow("Operational example startup failed");
    expect(close).toHaveBeenCalledOnce();
    expect(output.text()).toContain("startup-failed");
    expect(output.text()).not.toContain("synthetic-private-");
  } finally {
    output.stream.end();
  }
});

it("validates explicit settings before resource acquisition and defaults logging/work to disabled", async () => {
  const acquire = vi.fn(async () => ({ check: async () => true, close: async () => {} }));
  await expect(
    createOperationalApp({ backgroundWork: "true" } as never, { acquire: [acquire] }),
  ).rejects.toThrow("Invalid operational example configuration");
  expect(acquire).not.toHaveBeenCalled();
  const app = await createOperationalApp(parseOperationalConfiguration({}), { acquire: [acquire] });
  try {
    expect((await app.inject("/api/operation")).json()).toEqual({ completed: true });
  } finally {
    await app.close();
  }
});

it.each(["success", "acquisition-failure", "cleanup-failure"] as const)(
  "retains startup ownership across the native readiness timeout and late %s",
  async (outcome) => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const output = capture();
    const closed: string[] = [];
    const runWork = vi.fn(async () => {});
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let factorySettled = false;
    let failure: unknown;
    let returnedApp: Awaited<ReturnType<typeof createOperationalApp>> | undefined;
    const startup = (async () => {
      try {
        returnedApp = await createOperationalApp(
          parseOperationalConfiguration({ backgroundWork: true, readinessTimeoutMs: 5_000 }),
          {
            acquire: ["primary", "secondary", "dependent"].map((name, index) => async () => {
              if (index === 0) markStarted();
              await new Promise<void>((resolve) => setTimeout(resolve, 4_000));
              if (index === 2 && outcome === "acquisition-failure")
                throw new Error("synthetic-private-late-acquisition");
              return {
                check: async () => true,
                close: async () => {
                  closed.push(name);
                  if (index === 2 && outcome === "cleanup-failure")
                    throw new Error("synthetic-private-late-cleanup");
                },
              };
            }),
            runWork,
          },
          createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
        );
      } catch (error) {
        failure = error;
      } finally {
        factorySettled = true;
      }
    })();
    try {
      await started;
      await vi.advanceTimersByTimeAsync(10_001);
      expect(factorySettled).toBe(false);
      await vi.advanceTimersByTimeAsync(1_999);
      await startup;
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe("Operational example startup failed");
      expect(returnedApp).toBeUndefined();
      expect(closed).toEqual(
        outcome === "acquisition-failure"
          ? ["secondary", "primary"]
          : ["dependent", "secondary", "primary"],
      );
      expect(runWork).not.toHaveBeenCalled();
      expect(output.text()).not.toContain("synthetic-private-");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      await vi.advanceTimersByTimeAsync(3_000);
      await startup;
      await returnedApp?.close();
      vi.clearAllTimers();
      vi.useRealTimers();
      output.stream.end();
    }
  },
);
