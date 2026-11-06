import { describe, expect, it } from "vite-plus/test";
import { createServer } from "./index.js";
describe("createServer", () => {
  it("leaves process lifecycle listeners to the consuming application", async () => {
    const before = [process.listeners("SIGINT"), process.listeners("SIGTERM")];
    const server = createServer();
    try {
      expect([process.listeners("SIGINT"), process.listeners("SIGTERM")]).toEqual(before);
      expect((await server.inject("/api/health")).statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });
  it("supports normal Fastify plugins without opening a port", async () => {
    const server = createServer({ exposeHeadRoutes: false });
    try {
      await server.register(
        async (app) => {
          app.get("/hello", async () => ({ message: "Little Jay" }));
        },
        { prefix: "/example" },
      );
      const response = await server.inject("/example/hello");
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: "Little Jay" });
      expect((await server.inject({ method: "HEAD", url: "/example/hello" })).statusCode).toBe(404);
      expect(server.server.listening).toBe(false);
    } finally {
      await server.close();
    }
  });
  it("creates isolated instances", async () => {
    const first = createServer();
    const second = createServer();
    try {
      first.get("/private", async () => "first only");
      expect((await first.inject("/private")).statusCode).toBe(200);
      expect((await second.inject("/private")).statusCode).toBe(404);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  });
});
