import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const app = vi.hoisted(() => ({
  close: vi.fn<() => Promise<void>>(),
  listen: vi.fn<() => Promise<void>>(),
  log: { error: vi.fn() },
}));
vi.mock("./app.js", () => ({ buildApp: () => app }));

describe("API shutdown handlers", () => {
  let originalExitCode: typeof process.exitCode;
  let handlers: Map<string, () => void | Promise<void>>;
  beforeEach(() => {
    vi.resetModules();
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
    app.close.mockReset().mockResolvedValue(undefined);
    app.listen.mockReset().mockResolvedValue(undefined);
    app.log.error.mockReset();
    handlers = new Map();
    const once = process.once.bind(process);
    vi.spyOn(process, "once").mockImplementation((event, listener) => {
      if (event === "SIGINT" || event === "SIGTERM") {
        handlers.set(event, listener);
        return process;
      }
      return once(event, listener);
    });
    vi.stubEnv("PORT", undefined);
    vi.stubEnv("HOST", undefined);
  });
  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(["SIGINT", "SIGTERM"])(
    "awaits shutdown for %s and keeps the default listener settings",
    async (signal) => {
      await import("./server.js");
      expect(app.listen).toHaveBeenCalledWith({ port: 5050, host: "127.0.0.1" });
      expect(handlers.size).toBe(2);
      await handlers.get(signal)!();
      expect(app.close).toHaveBeenCalledTimes(1);
      expect(app.log.error).not.toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    },
  );

  it("catches shutdown rejection, logs the error, and sets a failing exit code", async () => {
    const error = new Error("Simulated shutdown failure");
    app.close.mockRejectedValue(error);
    await import("./server.js");
    await expect(handlers.get("SIGTERM")!()).resolves.toBeUndefined();
    expect(app.log.error).toHaveBeenCalledWith(error);
    expect(process.exitCode).toBe(1);
  });
});
