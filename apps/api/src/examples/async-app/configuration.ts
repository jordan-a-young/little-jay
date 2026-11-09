import { z } from "zod";

const appConfiguration = z.strictObject({
  sampleLimit: z.number().int().min(1).max(100).default(5),
  backgroundWork: z.boolean().default(false),
});
const listenConfiguration = z.strictObject({
  port: z.coerce.number().int().min(1).max(65_535).default(5050),
  host: z.enum(["127.0.0.1", "::1"]).default("127.0.0.1"),
});

export type AppConfiguration = z.infer<typeof appConfiguration>;

/** Parse explicit caller input without reading environment variables or acquiring resources. */
export function parseAppConfiguration(input: unknown) {
  const result = appConfiguration.safeParse(input);
  if (!result.success) throw new TypeError("Invalid demo application configuration");
  return result.data;
}

/** Validate startup-only settings, restricting this local demonstration to loopback. */
export function parseListenConfiguration(input: unknown) {
  const result = listenConfiguration.safeParse(input);
  if (!result.success) throw new TypeError("Invalid demo listener configuration");
  return result.data;
}
