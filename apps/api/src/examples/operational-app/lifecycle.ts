export type LifecycleEvent =
  | "resources-ready"
  | "work-started"
  | "work-stopped"
  | "resources-closed"
  | "startup-failed"
  | "shutdown-failed";

/** Checks must settle promptly after cancellation; close must be independently bounded. */
export interface OperationalResource {
  check: (signal: AbortSignal) => Promise<boolean>;
  close: () => Promise<void>;
}

export interface LifecycleOptions {
  /** Acquire in dependency order; each callback owns rollback until it returns its handle. */
  acquire: readonly ((signal: AbortSignal) => Promise<OperationalResource>)[];
  operationTimeoutMs: number;
  backgroundWork: boolean;
  work?: {
    intervalMs: number;
    /** Bounded, cooperative work; resolve on cancellation or reject with an AbortError. */
    run: (signal: AbortSignal) => Promise<void>;
  };
  /** Synchronous, best-effort notification receiving only fixed event names. */
  report?: (event: LifecycleEvent) => void;
}

export interface OperationalLifecycle {
  isReady: () => Promise<boolean>;
  close: () => Promise<void>;
}

interface Operation {
  result: Promise<boolean>;
  settled: Promise<void>;
  cancel: () => void;
  failed: boolean;
  timedOut: boolean;
}

/**
 * Own injected application resources and serial optional work without listening or process hooks.
 * Deadlines signal cancellation, not forced termination. Outstanding callbacks remain owned until
 * settlement, so noncooperative callbacks delay startup rollback and close rather than being orphaned.
 */
export async function startOperationalLifecycle(
  options: LifecycleOptions,
): Promise<OperationalLifecycle> {
  if (
    !Array.isArray(options.acquire) ||
    options.acquire.length > 8 ||
    options.acquire.some((acquire) => typeof acquire !== "function") ||
    !Number.isInteger(options.operationTimeoutMs) ||
    options.operationTimeoutMs < 1 ||
    options.operationTimeoutMs > 5_000 ||
    typeof options.backgroundWork !== "boolean" ||
    (options.backgroundWork && !options.work) ||
    (options.work &&
      (!Number.isInteger(options.work.intervalMs) ||
        options.work.intervalMs < 10 ||
        options.work.intervalMs > 60_000 ||
        typeof options.work.run !== "function"))
  ) {
    throw new TypeError("Invalid operational lifecycle configuration");
  }

  const acquisitions = [...options.acquire];
  const timeoutMs = options.operationTimeoutMs;
  const work = options.backgroundWork && options.work ? { ...options.work } : undefined;
  const reporter = options.report;
  const resources: OperationalResource[] = [];
  const pending = new Set<Operation>();
  const failures: Error[] = [];
  let phase: "starting" | "running" | "closing" | "closed" = "starting";
  let readinessOperation: Operation | undefined;
  let readinessResult: Promise<boolean> | undefined;
  let closePromise: Promise<void> | undefined;
  let scheduledWork: ReturnType<typeof setTimeout> | undefined;
  let workTask: Promise<void> | undefined;
  let workFailed = false;
  let workStarted = false;
  let workStopped = false;

  function report(event: LifecycleEvent) {
    try {
      reporter?.(event);
    } catch {
      return;
    }
  }

  function startOperation(callback: (signal: AbortSignal) => Promise<boolean>): Operation {
    const controller = new AbortController();
    let resolveResult!: (value: boolean) => void;
    const result = new Promise<boolean>((resolve) => {
      resolveResult = resolve;
    });
    const operation: Operation = {
      result,
      settled: Promise.resolve(),
      cancel() {
        clearTimeout(deadline);
        resolveResult(false);
        controller.abort();
      },
      failed: false,
      timedOut: false,
    };
    const deadline = setTimeout(() => {
      operation.timedOut = true;
      operation.cancel();
    }, timeoutMs);
    pending.add(operation);
    operation.settled = settle();
    return operation;

    async function settle() {
      await Promise.resolve();
      try {
        if (!controller.signal.aborted) {
          const ready = await callback(controller.signal);
          resolveResult(ready === true && !controller.signal.aborted);
        }
      } catch (error) {
        operation.failed = !(
          controller.signal.aborted &&
          error instanceof Error &&
          error.name === "AbortError"
        );
        resolveResult(false);
      } finally {
        clearTimeout(deadline);
        pending.delete(operation);
      }
    }
  }

  function isReady(): Promise<boolean> {
    if (phase === "closing" || phase === "closed" || workFailed) return Promise.resolve(false);
    if (readinessOperation && pending.has(readinessOperation)) return readinessResult!;
    readinessOperation = startOperation(async (signal) => {
      for (const resource of resources) {
        if (signal.aborted || (await resource.check(signal)) !== true) return false;
      }
      return !signal.aborted;
    });
    readinessResult = readinessOutcome(readinessOperation);
    return readinessResult;
  }

  async function readinessOutcome(operation: Operation) {
    const ready = await operation.result;
    return ready && phase !== "closing" && phase !== "closed" && !workFailed;
  }

  function reportWorkStopped() {
    if (workStarted && !workStopped) {
      workStopped = true;
      report("work-stopped");
    }
  }

  function scheduleWork() {
    scheduledWork = setTimeout(() => {
      scheduledWork = undefined;
      workTask = runWork();
    }, work!.intervalMs);
  }

  async function runWork() {
    const operation = startOperation(async (signal) => {
      await work!.run(signal);
      return true;
    });
    const succeeded = await operation.result;
    if (!succeeded && phase === "running") workFailed = true;
    await operation.settled;
    if (operation.failed || operation.timedOut) {
      workFailed = true;
      failures.push(new Error("Operational work failed"));
    }
    if (phase === "running" && !workFailed) scheduleWork();
    else reportWorkStopped();
  }

  function close(): Promise<void> {
    if (closePromise) return closePromise;
    phase = "closing";
    clearTimeout(scheduledWork);
    closePromise = finishClose();
    return closePromise;
  }

  async function finishClose() {
    await Promise.resolve();
    for (const operation of pending) operation.cancel();
    await Promise.all([...pending].map((operation) => operation.settled));
    await workTask;
    reportWorkStopped();
    let resourcesClosed = true;
    for (const resource of resources.reverse()) {
      try {
        await resource.close();
      } catch {
        resourcesClosed = false;
        failures.push(new Error("Operational resource cleanup failed"));
      }
    }
    phase = "closed";
    if (resourcesClosed) report("resources-closed");
    if (failures.length > 0) {
      report("shutdown-failed");
      throw new AggregateError(failures, "Operational shutdown failed");
    }
  }

  try {
    for (const acquire of acquisitions) {
      const operation = startOperation(async (signal) => {
        resources.push(await acquire(signal));
        return true;
      });
      if (!(await operation.result)) throw new Error("Operational initialization failed");
    }
    if (!(await isReady())) throw new Error("Operational initialization failed");
    phase = "running";
    report("resources-ready");
    if (work) {
      workStarted = true;
      scheduleWork();
      report("work-started");
    }
    return { isReady, close };
  } catch {
    report("startup-failed");
    const startupFailures = [new Error("Operational initialization failed")];
    try {
      await close();
    } catch {
      startupFailures.push(...failures);
    }
    throw new AggregateError(startupFailures, "Operational startup failed");
  }
}
