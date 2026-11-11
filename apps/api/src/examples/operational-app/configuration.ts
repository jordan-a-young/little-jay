import { z } from "zod";

const operationalConfiguration = z.strictObject({
  backgroundWork: z.boolean().default(false),
  workIntervalMs: z.number().int().min(10).max(60_000).default(100),
  readinessTimeoutMs: z.number().int().min(1).max(5_000).default(100),
});

export type OperationalConfiguration = z.infer<typeof operationalConfiguration>;

/** Validate explicit application settings without acquiring resources or reading the environment. */
export function parseOperationalConfiguration(input: unknown): OperationalConfiguration {
  const parsed = operationalConfiguration.safeParse(input);
  if (!parsed.success) throw new TypeError("Invalid operational example configuration");
  return parsed.data;
}
