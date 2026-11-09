import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import * as originalApplication from "../../app.js";
import { createApp, syntheticDependencies, type AppDependencies } from "./app.js";
import { parseAppConfiguration, parseListenConfiguration } from "./configuration.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function dependencies(): AppDependencies {
  return {
    clock: vi.fn(() => new Date("2026-01-01T00:00:00Z")),
    transport: vi.fn(async () => true),
    readLocal: vi.fn(async () => ["synthetic-private-content", "second"]),
    startBackground: vi.fn(async () => vi.fn(async () => {})),
  };
}

describe("explicit configuration", () => {
  it("provides bounded defaults and loopback-only startup settings", () => {
    expect(parseAppConfiguration({})).toEqual({ sampleLimit: 5, backgroundWork: false });
    expect(parseListenConfiguration({})).toEqual({ port: 5050, host: "127.0.0.1" });
    expect(parseListenConfiguration({ port: "5051", host: "::1" })).toEqual({
      port: 5051,
      host: "::1",
    });
  });
  it.each([
    { sampleLimit: 0 },
    { sampleLimit: 101 },
    { sampleLimit: "2" },
    { backgroundWork: "true" },
    { secret: "synthetic-private" },
    null,
  ])("rejects invalid application input without reflecting it: %j", (input) => {
    expect(() => parseAppConfiguration(input)).toThrow("Invalid demo application configuration");
  });
  it.each([
    { port: 0 },
    { port: "" },
    { port: 65_536 },
    { host: "0.0.0.0" },
    { host: "example.test" },
  ])("rejects invalid or nonlocal listener settings: %j", (input) => {
    expect(() => parseListenConfiguration(input)).toThrow("Invalid demo listener configuration");
  });
});

describe("ready non-listening application", () => {
  it("exercises injected dependencies, bounds summary output and preserves the original routes", async () => {
    const supplied = dependencies();
    const build = vi.spyOn(originalApplication, "buildApp");
    const signals = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
    vi.stubEnv("PORT", "not-a-port");
    const app = await createApp(parseAppConfiguration({ sampleLimit: 1 }), supplied);
    try {
      expect(build).toHaveBeenCalledWith({
        bodyLimit: 16_384,
        requestTimeout: 15_000,
        trustProxy: false,
        logger: false,
      });
      expect(app.server.listening).toBe(false);
      expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(signals);
      const response = await app.inject("/api/example");
      expect(response.json()).toEqual({
        sampledAt: "2026-01-01T00:00:00.000Z",
        transportAvailable: true,
        localEntries: 1,
      });
      expect(response.body).not.toContain("synthetic-private-content");
      expect(supplied.clock).toHaveBeenCalledOnce();
      expect(supplied.transport).toHaveBeenCalledOnce();
      expect(supplied.readLocal).toHaveBeenCalledWith(1);
      expect(supplied.startBackground).not.toHaveBeenCalled();
      expect((await app.inject("/api/health")).json()).toEqual({ status: "ok" });
      expect((await app.inject("/api/ready")).json()).toEqual({ status: "ready" });
      expect(
        (
          await app.inject({ method: "POST", url: "/api/text-preview", payload: { text: "local" } })
        ).json(),
      ).toEqual({ characters: 5, lines: 1 });
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/text-preview",
            payload: { text: "x".repeat(17_000) },
          })
        ).statusCode,
      ).toBe(413);
    } finally {
      await app.close();
    }
  });

  it("validates before construction or background acquisition", async () => {
    const supplied = dependencies();
    const build = vi.spyOn(originalApplication, "buildApp");
    await expect(createApp({ sampleLimit: 0, backgroundWork: true }, supplied)).rejects.toThrow(
      "Invalid demo application configuration",
    );
    expect(build).not.toHaveBeenCalled();
    expect(supplied.startBackground).not.toHaveBeenCalled();
    await expect(
      createApp(parseAppConfiguration({ backgroundWork: true }), {
        ...supplied,
        startBackground: undefined,
      }),
    ).rejects.toThrow("requires an explicit starter");
    expect(build).not.toHaveBeenCalled();
  });

  it("starts optional bounded work only when enabled and closes it once", async () => {
    const supplied = dependencies();
    const stop = vi.fn(async () => {});
    supplied.startBackground = vi.fn(async () => stop);
    const app = await createApp(parseAppConfiguration({ backgroundWork: true }), supplied);
    expect(supplied.startBackground).toHaveBeenCalledOnce();
    await app.close();
    await app.close();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("closes a partially initialized app and preserves startup/cleanup errors", async () => {
    const buildApp = originalApplication.buildApp;
    const closes = vi.fn();
    vi.spyOn(originalApplication, "buildApp").mockImplementation((options) => {
      const app = buildApp(options);
      app.addHook("onClose", async () => {
        closes();
        throw new Error("synthetic-cleanup-failure");
      });
      return app;
    });
    const supplied = dependencies();
    supplied.startBackground = vi.fn(async () => {
      throw new Error("synthetic-startup-failure");
    });
    await expect(
      createApp(parseAppConfiguration({ backgroundWork: true }), supplied),
    ).rejects.toMatchObject({
      message: "Demo application startup failed",
      errors: [
        expect.objectContaining({ message: "synthetic-startup-failure" }),
        expect.objectContaining({ message: "synthetic-cleanup-failure" }),
      ],
    });
    expect(closes).toHaveBeenCalledOnce();
  });

  it("keeps instances isolated and returns safe errors for failed injected work", async () => {
    const firstDependencies = dependencies();
    firstDependencies.transport = vi.fn(async () => {
      throw new Error("synthetic-private-diagnostic");
    });
    const first = await createApp(parseAppConfiguration({}), firstDependencies);
    const second = await createApp(parseAppConfiguration({}), dependencies());
    try {
      const failure = await first.inject("/api/example");
      expect(failure.statusCode).toBe(500);
      expect(failure.body).not.toContain("synthetic-private-diagnostic");
      expect((await second.inject("/api/example")).statusCode).toBe(200);
      expect((await first.inject("/missing")).statusCode).toBe(404);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });

  it("keeps defaults synthetic and factory imports free of environment/signal ownership", async () => {
    const supplied = syntheticDependencies();
    expect(await supplied.transport()).toBe(true);
    expect(await supplied.readLocal(1)).toHaveLength(1);
    expect(supplied.startBackground).toBeUndefined();
    expect(supplied.clock()).toBeInstanceOf(Date);
    for (const filename of ["app.ts", "configuration.ts"]) {
      const source = await readFile(new URL(filename, import.meta.url), "utf8");
      expect(source).not.toMatch(/process\.(env|on|once|addListener)/);
    }
  });
});
