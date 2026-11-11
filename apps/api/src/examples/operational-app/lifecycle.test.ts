import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  startOperationalLifecycle,
  type LifecycleOptions,
  type OperationalResource,
} from "./lifecycle.js";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  try {
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function resource(overrides: Partial<OperationalResource> = {}): OperationalResource {
  return {
    check: vi.fn(async () => true),
    close: vi.fn(async () => {}),
    ...overrides,
  };
}

function options(overrides: Partial<LifecycleOptions> = {}): LifecycleOptions {
  return { acquire: [], operationTimeoutMs: 100, backgroundWork: false, ...overrides };
}

async function expectSafeFailure(
  operation: Promise<unknown>,
  message: string,
  failureMessages: readonly string[],
) {
  let failure: unknown;
  try {
    await operation;
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(AggregateError);
  const aggregate = failure as AggregateError;
  expect(aggregate.message).toBe(message);
  expect(aggregate).not.toHaveProperty("cause");
  expect(aggregate.errors.map((error: Error) => error.message)).toEqual(failureMessages);
  for (const error of aggregate.errors) {
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toHaveProperty("cause");
    expect(error).not.toHaveProperty("errors");
    expect(error.stack).not.toContain("synthetic-private");
  }
}

describe("operational resource ownership", () => {
  it("acquires in dependency order, never starts disabled work and closes in reverse order", async () => {
    const order: string[] = [];
    const run = vi.fn(async () => {});
    const report = vi.fn();
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: ["base", "dependent"].map((name) => async () => {
          order.push(`acquire:${name}`);
          return resource({
            check: async () => {
              order.push(`check:${name}`);
              return true;
            },
            close: async () => {
              order.push(`close:${name}`);
            },
          });
        }),
        work: { intervalMs: 10, run },
        report,
      }),
    );
    try {
      expect(order).toEqual(["acquire:base", "acquire:dependent", "check:base", "check:dependent"]);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(run).not.toHaveBeenCalled();
      expect(report.mock.calls).toEqual([["resources-ready"]]);
    } finally {
      const closing = lifecycle.close();
      expect(lifecycle.close()).toBe(closing);
      await closing;
    }
    expect(order.slice(-2)).toEqual(["close:dependent", "close:base"]);
    expect(await lifecycle.isReady()).toBe(false);
    expect(report.mock.calls).toEqual([["resources-ready"], ["resources-closed"]]);
  });

  it.each(["initialize", "readiness-false", "readiness-rejection"])(
    "rolls back acquired resources on %s without exposing diagnostics",
    async (failure) => {
      const order: string[] = [];
      const first = resource({
        close: async () => {
          order.push("first");
        },
      });
      const second = resource({
        check: async () => {
          if (failure === "readiness-rejection") throw new Error("synthetic-private-check");
          return false;
        },
        close: async () => {
          order.push("second");
        },
      });
      const run = vi.fn(async () => {});
      const report = vi.fn();
      await expectSafeFailure(
        startOperationalLifecycle(
          options({
            acquire: [
              async () => first,
              async () => {
                if (failure === "initialize") throw new Error("synthetic-private-acquire");
                return second;
              },
            ],
            backgroundWork: true,
            work: { intervalMs: 10, run },
            report,
          }),
        ),
        "Operational startup failed",
        ["Operational initialization failed"],
      );
      expect(order).toEqual(failure === "initialize" ? ["first"] : ["second", "first"]);
      expect(run).not.toHaveBeenCalled();
      expect(report.mock.calls).toEqual([["startup-failed"], ["resources-closed"]]);
    },
  );

  it("attempts all cleanup and preserves a safe count of startup plus cleanup failures", async () => {
    const closes = [
      vi.fn(async () => {
        throw new Error("synthetic-private-first");
      }),
      vi.fn(async () => {
        throw new Error("synthetic-private-second");
      }),
    ];
    const report = vi.fn();
    await expectSafeFailure(
      startOperationalLifecycle(
        options({
          acquire: closes.map((close) => async () => resource({ close, check: async () => false })),
          report,
        }),
      ),
      "Operational startup failed",
      [
        "Operational initialization failed",
        "Operational resource cleanup failed",
        "Operational resource cleanup failed",
      ],
    );
    for (const close of closes) expect(close).toHaveBeenCalledOnce();
    expect(report.mock.calls).toEqual([["startup-failed"], ["shutdown-failed"]]);
  });

  it("keeps the same rejected close operation and continues after individual close failures", async () => {
    const order: string[] = [];
    const report = vi.fn();
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: ["first", "second", "third"].map(
          (name) => async () =>
            resource({
              close: async () => {
                order.push(name);
                if (name !== "second") throw new Error(`synthetic-private-${name}`);
              },
            }),
        ),
        report,
      }),
    );
    const closing = lifecycle.close();
    expect(lifecycle.close()).toBe(closing);
    await expectSafeFailure(closing, "Operational shutdown failed", [
      "Operational resource cleanup failed",
      "Operational resource cleanup failed",
    ]);
    expect(lifecycle.close()).toBe(closing);
    expect(order).toEqual(["third", "second", "first"]);
    expect(await lifecycle.isReady()).toBe(false);
    expect(report.mock.calls).toEqual([["resources-ready"], ["shutdown-failed"]]);
  });

  it("waits for a deadline-expired acquisition and closes its late handle before rejecting", async () => {
    const acquired = deferred<OperationalResource>();
    const late = resource();
    const first = resource();
    let signal: AbortSignal | undefined;
    let startupSettled = false;
    const starting = startOperationalLifecycle(
      options({
        acquire: [
          async () => first,
          async (suppliedSignal) => {
            signal = suppliedSignal;
            return acquired.promise;
          },
        ],
      }),
    );
    const rejected = expect(starting).rejects.toThrow("Operational startup failed");
    const observed = (async () => {
      try {
        await starting;
      } catch {
        startupSettled = true;
      }
    })();
    try {
      await vi.advanceTimersByTimeAsync(100);
      expect(signal?.aborted).toBe(true);
      expect(startupSettled).toBe(false);
      expect(first.close).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      acquired.resolve(late);
      await rejected;
      await observed;
    }
    expect(late.close).toHaveBeenCalledOnce();
    expect(first.close).toHaveBeenCalledOnce();
  });

  it("rolls back a cooperatively cancelled initial readiness timeout", async () => {
    let signal: AbortSignal | undefined;
    const supplied = resource({
      check: async (checkSignal) => {
        signal = checkSignal;
        return new Promise<boolean>((resolve) => {
          checkSignal.addEventListener("abort", () => resolve(false), { once: true });
        });
      },
    });
    const starting = startOperationalLifecycle(options({ acquire: [async () => supplied] }));
    const rejected = expect(starting).rejects.toThrow("Operational startup failed");
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(signal?.aborted).toBe(true);
    expect(supplied.close).toHaveBeenCalledOnce();
  });
});

describe("bounded readiness", () => {
  it("recovers after later false results and exceptions without disclosing their contents", async () => {
    const check = vi.fn(async () => true);
    const lifecycle = await startOperationalLifecycle(
      options({ acquire: [async () => resource({ check })] }),
    );
    try {
      check.mockResolvedValueOnce(false);
      expect(await lifecycle.isReady()).toBe(false);
      check.mockRejectedValueOnce(new Error("synthetic-private-readiness"));
      expect(await lifecycle.isReady()).toBe(false);
      expect(await lifecycle.isReady()).toBe(true);
    } finally {
      await lifecycle.close();
    }
  });

  it("coalesces concurrent checks and prevents timed-out checks accumulating before settlement", async () => {
    const completion = deferred<boolean>();
    let signal: AbortSignal | undefined;
    const check = vi.fn(async (_signal: AbortSignal) => true);
    const supplied = resource({ check });
    const lifecycle = await startOperationalLifecycle(options({ acquire: [async () => supplied] }));
    check.mockImplementationOnce(async (checkSignal) => {
      signal = checkSignal;
      return completion.promise;
    });
    try {
      const checking = lifecycle.isReady();
      expect(lifecycle.isReady()).toBe(checking);
      await vi.advanceTimersByTimeAsync(100);
      expect(await checking).toBe(false);
      expect(signal?.aborted).toBe(true);
      for (let attempt = 0; attempt < 20; attempt++) expect(await lifecycle.isReady()).toBe(false);
      expect(check).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
      completion.resolve(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(await checking).toBe(false);
      expect(await lifecycle.isReady()).toBe(true);
      expect(check).toHaveBeenCalledTimes(3);
    } finally {
      completion.resolve(true);
      await lifecycle.close();
    }
  });

  it("aborts and drains readiness before resource close and refuses new checks during close", async () => {
    const completion = deferred<boolean>();
    const order: string[] = [];
    const check = vi.fn(async (_signal: AbortSignal) => true);
    const supplied = resource({
      check,
      close: async () => {
        order.push("close");
      },
    });
    const lifecycle = await startOperationalLifecycle(options({ acquire: [async () => supplied] }));
    check.mockImplementationOnce(async (signal) => {
      signal.addEventListener(
        "abort",
        () => {
          order.push("abort");
        },
        { once: true },
      );
      const result = await completion.promise;
      order.push("settled");
      return result;
    });
    try {
      const checking = lifecycle.isReady();
      await vi.advanceTimersByTimeAsync(0);
      const closing = lifecycle.close();
      expect(lifecycle.close()).toBe(closing);
      expect(await lifecycle.isReady()).toBe(false);
      expect(await checking).toBe(false);
      expect(order).toEqual(["abort"]);
      expect(check).toHaveBeenCalledTimes(2);
      completion.resolve(true);
      await closing;
      expect(order).toEqual(["abort", "settled", "close"]);
    } finally {
      completion.resolve(true);
      await lifecycle.close();
    }
  });

  it("does not run later resource checks after the shared readiness deadline", async () => {
    const completion = deferred<boolean>();
    const firstCheck = vi.fn(async () => true);
    const secondCheck = vi.fn(async () => true);
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: [
          async () => resource({ check: firstCheck }),
          async () => resource({ check: secondCheck }),
        ],
      }),
    );
    firstCheck.mockImplementationOnce(async () => completion.promise);
    try {
      const checking = lifecycle.isReady();
      await vi.advanceTimersByTimeAsync(100);
      expect(await checking).toBe(false);
      completion.resolve(true);
      await vi.advanceTimersByTimeAsync(0);
      expect(secondCheck).toHaveBeenCalledOnce();
    } finally {
      completion.resolve(true);
      await lifecycle.close();
    }
  });
});

describe("supervised optional work", () => {
  it("runs serially, schedules only after settlement and stops an idle schedule on close", async () => {
    const completion = deferred<void>();
    const run = vi.fn(async () => {});
    run.mockImplementationOnce(async () => completion.promise);
    const report = vi.fn();
    const lifecycle = await startOperationalLifecycle(
      options({
        backgroundWork: true,
        work: { intervalMs: 10, run },
        report,
      }),
    );
    try {
      expect(run).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(10);
      expect(run).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(30);
      expect(run).toHaveBeenCalledOnce();
      completion.resolve();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(9);
      expect(run).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      completion.resolve();
      await lifecycle.close();
    }
    await vi.advanceTimersByTimeAsync(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    expect(report.mock.calls).toEqual([
      ["resources-ready"],
      ["work-started"],
      ["work-stopped"],
      ["resources-closed"],
    ]);
  });

  it("awaits aborted in-flight work before reverse dependency cleanup", async () => {
    const completion = deferred<void>();
    const order: string[] = [];
    const run = vi.fn(async (signal: AbortSignal) => {
      signal.addEventListener(
        "abort",
        () => {
          order.push("abort");
        },
        { once: true },
      );
      await completion.promise;
      order.push("settled");
    });
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: ["first", "second"].map(
          (name) => async () =>
            resource({
              close: async () => {
                order.push(name);
              },
            }),
        ),
        backgroundWork: true,
        work: { intervalMs: 10, run },
      }),
    );
    try {
      await vi.advanceTimersByTimeAsync(10);
      const closing = lifecycle.close();
      await vi.advanceTimersByTimeAsync(0);
      expect(order).toEqual(["abort"]);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(run).toHaveBeenCalledOnce();
      completion.resolve();
      await closing;
      expect(order).toEqual(["abort", "settled", "second", "first"]);
    } finally {
      completion.resolve();
      await lifecycle.close();
    }
  });

  it("accepts cooperative AbortError rejection during normal shutdown", async () => {
    const supplied = resource();
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: [async () => supplied],
        backgroundWork: true,
        work: {
          intervalMs: 10,
          run: async (signal) =>
            new Promise<void>((_resolve, reject) => {
              signal.addEventListener(
                "abort",
                () => reject(new DOMException("Cancelled", "AbortError")),
                { once: true },
              );
            }),
        },
      }),
    );
    try {
      await vi.advanceTimersByTimeAsync(10);
    } finally {
      await lifecycle.close();
    }
    expect(supplied.close).toHaveBeenCalledOnce();
  });

  it.each(["sync-throw", "reject", "abort-reject"])(
    "contains %s work failures, stops scheduling and still attempts resource cleanup",
    async (failure) => {
      const report = vi.fn();
      const supplied = resource();
      const run = vi.fn((signal: AbortSignal): Promise<void> => {
        if (failure === "sync-throw") throw new Error("synthetic-private-work");
        if (failure === "reject") return Promise.reject(new Error("synthetic-private-work"));
        return new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("synthetic-private-abort")), {
            once: true,
          });
        });
      });
      const lifecycle = await startOperationalLifecycle(
        options({
          acquire: [async () => supplied],
          backgroundWork: true,
          work: { intervalMs: 10, run },
          report,
        }),
      );
      try {
        await vi.advanceTimersByTimeAsync(10);
        if (failure !== "abort-reject") {
          expect(await lifecycle.isReady()).toBe(false);
          await vi.advanceTimersByTimeAsync(1_000);
          expect(run).toHaveBeenCalledOnce();
        }
      } finally {
        await expectSafeFailure(lifecycle.close(), "Operational shutdown failed", [
          "Operational work failed",
        ]);
      }
      expect(supplied.close).toHaveBeenCalledOnce();
      expect(report.mock.calls).toEqual([
        ["resources-ready"],
        ["work-started"],
        ["work-stopped"],
        ["resources-closed"],
        ["shutdown-failed"],
      ]);
    },
  );

  it("retains timed-out work until settlement without scheduling replacements", async () => {
    const completion = deferred<void>();
    const supplied = resource();
    let signal: AbortSignal | undefined;
    const run = vi.fn(async (workSignal: AbortSignal) => {
      signal = workSignal;
      await completion.promise;
    });
    const lifecycle = await startOperationalLifecycle(
      options({
        acquire: [async () => supplied],
        backgroundWork: true,
        work: { intervalMs: 10, run },
      }),
    );
    try {
      await vi.advanceTimersByTimeAsync(110);
      expect(signal?.aborted).toBe(true);
      expect(await lifecycle.isReady()).toBe(false);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(run).toHaveBeenCalledOnce();
      const closing = lifecycle.close();
      const rejected = expect(closing).rejects.toMatchObject({
        errors: [expect.objectContaining({ message: "Operational work failed" })],
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(supplied.close).not.toHaveBeenCalled();
      completion.resolve();
      await rejected;
      expect(supplied.close).toHaveBeenCalledOnce();
    } finally {
      completion.resolve();
      await expect(lifecycle.close()).rejects.toThrow("Operational shutdown failed");
    }
  });
});

describe("configuration and diagnostic isolation", () => {
  it.each([
    { operationTimeoutMs: 0 },
    { operationTimeoutMs: 5_001 },
    { operationTimeoutMs: 1.5 },
    { operationTimeoutMs: NaN },
    { operationTimeoutMs: Infinity },
    { backgroundWork: true },
    { work: { intervalMs: 9, run: async () => {} } },
    { work: { intervalMs: 60_001, run: async () => {} } },
    { work: { intervalMs: 10.5, run: async () => {} } },
  ])("rejects invalid bounds before acquiring resources: %j", async (overrides) => {
    const acquire = vi.fn(async () => resource());
    await expect(
      startOperationalLifecycle(options({ acquire: [acquire], ...overrides })),
    ).rejects.toThrow("Invalid operational lifecycle configuration");
    expect(acquire).not.toHaveBeenCalled();
  });

  it("bounds resource counts and rejects runtime type mismatches", async () => {
    const acquire = vi.fn(async () => resource());
    for (const overrides of [
      { acquire: Array.from({ length: 9 }, () => acquire) },
      { acquire: [false] },
      { backgroundWork: "false" },
      { work: { intervalMs: 10, run: false } },
      { acquire: null },
    ]) {
      await expect(
        startOperationalLifecycle(options(overrides as Partial<LifecycleOptions>)),
      ).rejects.toThrow("Invalid operational lifecycle configuration");
    }
    expect(acquire).not.toHaveBeenCalled();
  });

  it.each([1, 5_000])(
    "accepts timeout boundary %i and eight resources",
    async (operationTimeoutMs) => {
      const acquire = vi.fn(async () => resource());
      const lifecycle = await startOperationalLifecycle(
        options({
          operationTimeoutMs,
          acquire: Array.from({ length: 8 }, () => acquire),
          work: { intervalMs: operationTimeoutMs === 1 ? 10 : 60_000, run: async () => {} },
        }),
      );
      try {
        expect(acquire).toHaveBeenCalledTimes(8);
        expect(await lifecycle.isReady()).toBe(true);
      } finally {
        await lifecycle.close();
      }
    },
  );

  it("contains throwing reporters during startup rollback and failed cleanup", async () => {
    const report = vi.fn(() => {
      throw new Error("synthetic-private-reporter");
    });
    const supplied = resource({
      check: async () => false,
      close: vi.fn(async () => {
        throw new Error("synthetic-private-cleanup");
      }),
    });
    await expect(
      startOperationalLifecycle(options({ acquire: [async () => supplied], report })),
    ).rejects.toMatchObject({
      errors: [
        expect.objectContaining({ message: "Operational initialization failed" }),
        expect.objectContaining({ message: "Operational resource cleanup failed" }),
      ],
    });
    expect(supplied.close).toHaveBeenCalledOnce();
    expect(report.mock.calls).toEqual([["startup-failed"], ["shutdown-failed"]]);
  });

  it("contains throwing success reporters and keeps instances independent", async () => {
    const report = vi.fn(() => {
      throw new Error("synthetic-private-reporter");
    });
    const first = await startOperationalLifecycle(
      options({
        backgroundWork: true,
        work: { intervalMs: 10, run: async () => {} },
        report,
      }),
    );
    const second = await startOperationalLifecycle(options());
    try {
      await first.close();
      expect(await first.isReady()).toBe(false);
      expect(await second.isReady()).toBe(true);
      expect(report.mock.calls).toEqual([
        ["resources-ready"],
        ["work-started"],
        ["work-stopped"],
        ["resources-closed"],
      ]);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });
});
