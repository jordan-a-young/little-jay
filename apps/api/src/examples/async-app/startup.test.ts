import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

const app = vi.hoisted(() => ({ listen: vi.fn(), close: vi.fn() }));
const createApp = vi.hoisted(() => vi.fn(async () => app));
vi.mock("./app.js", () => ({ createApp, syntheticDependencies: () => ({ synthetic: true }) }));
import { startDemo } from "./startup.js";

let originalExitCode: typeof process.exitCode;
let handlers: Map<string, () => Promise<void>>;
beforeEach(() => {
  originalExitCode = process.exitCode;
  process.exitCode = undefined;
  app.listen.mockReset().mockResolvedValue("http://127.0.0.1:5050");
  app.close.mockReset().mockResolvedValue(undefined);
  createApp.mockClear();
  handlers = new Map();
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
});
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

it("uses loopback defaults and removes only its owned signal handlers on stop", async () => {
  const demo = await startDemo({});
  expect(app.listen).toHaveBeenCalledWith({ port: 5050, host: "127.0.0.1" });
  expect(createApp).toHaveBeenCalledWith(
    { sampleLimit: 5, backgroundWork: false },
    { synthetic: true },
  );
  expect(handlers.size).toBe(2);
  await demo.stop();
  await demo.stop();
  expect(app.close).toHaveBeenCalledOnce();
  expect(handlers.size).toBe(0);
});

it.each(["SIGINT", "SIGTERM"])("awaits one shutdown for %s", async (signal) => {
  const demo = await startDemo({ PORT: "5051", HOST: "::1" });
  const handle = handlers.get(signal)!;
  await Promise.all([handle(), handle(), demo.stop()]);
  expect(app.listen).toHaveBeenCalledWith({ port: 5051, host: "::1" });
  expect(app.close).toHaveBeenCalledOnce();
  expect(handlers.size).toBe(0);
});

it("rejects invalid listener configuration before constructing an app", async () => {
  await expect(startDemo({ PORT: "0" })).rejects.toThrow("Invalid demo listener configuration");
  expect(createApp).not.toHaveBeenCalled();
});

it("cleans up on listen failure without installing handlers", async () => {
  app.listen.mockRejectedValue(new Error("synthetic-private-listen"));
  await expect(startDemo({})).rejects.toThrow("Unable to start local server demo");
  expect(app.close).toHaveBeenCalledOnce();
  expect(handlers.size).toBe(0);
});

it("retains cleanup failure after a listen failure", async () => {
  app.listen.mockRejectedValue(new Error("synthetic-listen"));
  app.close.mockRejectedValue(new Error("synthetic-cleanup"));
  await expect(startDemo({})).rejects.toBeInstanceOf(AggregateError);
  expect(handlers.size).toBe(0);
});

it("reports shutdown failure without private diagnostics", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  app.close.mockRejectedValue(new Error("synthetic-private-close"));
  await startDemo({});
  await handlers.get("SIGTERM")!();
  expect(error).toHaveBeenCalledWith("Local server demo shutdown failed");
  expect(process.exitCode).toBe(1);
  expect(handlers.size).toBe(0);
});
