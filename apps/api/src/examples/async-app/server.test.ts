import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

const loadEnvFile = vi.hoisted(() => vi.fn());
const startDemo = vi.hoisted(() => vi.fn());
vi.mock("node:process", () => ({ loadEnvFile }));
vi.mock("./startup.js", () => ({ startDemo }));

let exitCode: typeof process.exitCode;
beforeEach(() => {
  exitCode = process.exitCode;
  process.exitCode = undefined;
  vi.resetModules();
  loadEnvFile.mockReset();
  startDemo.mockReset().mockResolvedValue({
    app: { server: { listening: true }, listeningOrigin: "http://127.0.0.1:5050" },
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.exitCode = exitCode;
  vi.restoreAllMocks();
});

it("loads the optional env file before app-owned validation and reports only the origin", async () => {
  const order: string[] = [];
  loadEnvFile.mockImplementation(() => {
    order.push("env");
  });
  startDemo.mockImplementation(async () => {
    order.push("validation");
    return { app: { server: { listening: true }, listeningOrigin: "http://127.0.0.1:5050" } };
  });
  await import("./server.js");
  expect(order).toEqual(["env", "validation"]);
  expect(startDemo).toHaveBeenCalledWith(process.env);
  expect(console.log).toHaveBeenCalledExactlyOnceWith(
    "Local server demo listening at http://127.0.0.1:5050",
  );
});

it("allows a missing optional env file", async () => {
  loadEnvFile.mockImplementation(() => {
    throw Object.assign(new Error("synthetic-missing"), { code: "ENOENT" });
  });
  await import("./server.js");
  expect(startDemo).toHaveBeenCalledOnce();
  expect(console.error).not.toHaveBeenCalled();
});

it.each(["env", "startup"])(
  "sanitizes %s failures and sets a failing exit status",
  async (phase) => {
    const failure = new Error("synthetic-private-process-error");
    if (phase === "env")
      loadEnvFile.mockImplementation(() => {
        throw failure;
      });
    else startDemo.mockRejectedValue(failure);
    await import("./server.js");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("Local server demo failed to start");
    expect(console.log).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    if (phase === "env") expect(startDemo).not.toHaveBeenCalled();
  },
);

it("does not announce listening after a startup signal has already stopped the app", async () => {
  startDemo.mockResolvedValue({ app: { server: { listening: false } } });
  await import("./server.js");
  expect(console.log).not.toHaveBeenCalled();
});
