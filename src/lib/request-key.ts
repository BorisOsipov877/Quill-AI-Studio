import { headers } from "next/headers";

/**
 * Identify the caller for rate limiting. There's no auth in this app, so we
 * bucket by client IP and fall back to a shared key when no proxy header is
 * present (local dev = everyone shares one bucket).
 *
 * Kept apart from `rate-limit.ts` so the limiter itself stays free of Next
 * request APIs and can be unit-tested.
 */
export async function getRateLimitKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip || "local";
}
