import { describe, expect, it } from "vite-plus/test";
import { buildApp } from "./app.js";
describe("API routing", () => {
  it("validates a local TypeBox text preview and returns only text metadata", async () => {
    const app = buildApp();
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/text-preview",
        payload: { text: "Hello\n\u{1f331}" },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ characters: 7, lines: 2 });
      for (const payload of [{}, { text: "" }, { text: {} }, { text: "private".repeat(1000) }]) {
        const invalid = await app.inject({ method: "POST", url: "/api/text-preview", payload });
        expect(invalid.statusCode).toBe(400);
        expect(invalid.json()).toEqual({
          statusCode: 400,
          error: { code: "BAD_REQUEST", message: "Invalid request" },
        });
      }
      expect((await app.inject("/api/ready")).json()).toEqual({ status: "ready" });
    } finally {
      await app.close();
    }
  });
  it("serves health under the API prefix", async () => {
    const app = buildApp();
    try {
      const response = await app.inject({ method: "GET", url: "/api/health" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });
      expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
