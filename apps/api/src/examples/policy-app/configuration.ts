import { z } from "zod";

function canonicalAuthority(value: string) {
  try {
    const url = new URL(`http://${value}`);
    return (
      url.host === value &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !value.includes("*")
    );
  } catch {
    return false;
  }
}

function canonicalOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) && url.origin === value && !value.includes("*")
    );
  } catch {
    return false;
  }
}

const cookieConfiguration = z
  .strictObject({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/)
      .default("policy-session"),
    path: z
      .string()
      .max(128)
      .regex(/^\/[A-Za-z0-9/_-]*$/)
      .default("/api/policy"),
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(true),
    sameSite: z.enum(["strict", "lax", "none"]).default("strict"),
    maxAgeSeconds: z.number().int().min(1).max(86_400).default(1800),
  })
  .refine((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      (cookie.sameSite !== "none" || cookie.secure) &&
      (!name.startsWith("__secure-") || cookie.secure) &&
      (!name.startsWith("__host-") || (cookie.secure && cookie.path === "/")) &&
      (!(name.startsWith("__http-") || name.startsWith("__host-http-")) ||
        (cookie.secure && cookie.httpOnly))
    );
  });

const configuration = z.strictObject({
  allowedHosts: z.array(z.string().min(1).max(255).refine(canonicalAuthority)).min(1).max(8),
  allowedOrigins: z.array(z.string().max(512).refine(canonicalOrigin)).min(1).max(8),
  csrfHeader: z
    .string()
    .max(64)
    .regex(/^x-[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine(
      (value) => !["x-forwarded-host", "x-forwarded-proto", "x-forwarded-for"].includes(value),
    )
    .default("x-policy-csrf"),
  sessionCookie: cookieConfiguration.prefault({}),
});

export type PolicyConfiguration = z.infer<typeof configuration>;

/** Validate explicit application policy without reading environment or acquiring resources. */
export function parsePolicyConfiguration(input: unknown) {
  const parsed = configuration.safeParse(input);
  if (!parsed.success) throw new TypeError("Invalid example policy configuration");
  return parsed.data;
}
