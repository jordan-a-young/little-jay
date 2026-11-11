import { Writable } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { createOperationalApp } from "./app.js";
import { parseOperationalConfiguration } from "./configuration.js";
import { createOperationalLoggingOptions } from "./logging.js";

const createApp = vi.hoisted(() => vi.fn());
vi.mock("../async-app/app.js", () => ({ createApp, syntheticDependencies: () => ({}) }));
import { startDemo } from "../async-app/startup.js";

let originalExitCode: typeof process.exitCode;
beforeEach(() => {
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  createApp.mockReset();
});
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

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

it("reuses runner listen-failure cleanup with a real operational factory and safe logs", async () => {
  const output = capture();
  const close = vi.fn(async () => {});
  const app = await createOperationalApp(
    parseOperationalConfiguration({}),
    { acquire: [async () => ({ check: async () => true, close })] },
    createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
  );
  createApp.mockResolvedValue(app);
  vi.spyOn(app, "listen").mockRejectedValue(new Error("synthetic-private-listen-marker"));
  const signalListeners = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
  try {
    await expect(startDemo({})).rejects.toThrow("Unable to start local server demo");
    expect(close).toHaveBeenCalledOnce();
    expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(signalListeners);
    expect(output.text()).toContain("resources-ready");
    expect(output.text()).toContain("resources-closed");
    expect(output.text()).not.toContain("synthetic-private-listen-marker");
  } finally {
    await app.close();
    output.stream.end();
  }
});

it("keeps runner shutdown diagnostics safe when operational cleanup rejects", async () => {
  const output = capture();
  const close = vi.fn(async () => {
    throw new Error("synthetic-private-shutdown-marker");
  });
  const app = await createOperationalApp(
    parseOperationalConfiguration({}),
    { acquire: [async () => ({ check: async () => true, close })] },
    createOperationalLoggingOptions({ enabled: true, stream: output.stream }),
  );
  createApp.mockResolvedValue(app);
  vi.spyOn(app, "listen").mockResolvedValue(undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const handlers = new Map<string, () => Promise<void>>();
  const once = process.once.bind(process);
  const removeListener = process.removeListener.bind(process);
  vi.spyOn(process, "once").mockImplementation((event, listener) => {
    if (event === "SIGINT" || event === "SIGTERM") {
      handlers.set(event, listener as () => Promise<void>);
      return process;
    }
    return once(event, listener);
  });
  vi.spyOn(process, "removeListener").mockImplementation((event, listener) => {
    if (event === "SIGINT" || event === "SIGTERM") {
      handlers.delete(event);
      return process;
    }
    return removeListener(event, listener);
  });
  try {
    await startDemo({ PORT: "4222" });
    await handlers.get("SIGTERM")!();
    expect(error).toHaveBeenCalledExactlyOnceWith("Local server demo shutdown failed");
    expect(process.exitCode).toBe(1);
    expect(handlers.size).toBe(0);
    expect(close).toHaveBeenCalledOnce();
    expect(output.text()).toContain("shutdown-failed");
    expect(output.text()).not.toContain("synthetic-private-shutdown-marker");
  } finally {
    output.stream.end();
  }
});
