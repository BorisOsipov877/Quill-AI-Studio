// ---------------------------------------------------------------------------
// Sliding-window rate limit for generations.
//
// Deliberately in-memory: it lives in the server process, so it resets on
// restart and is NOT shared across instances. That's enough to protect a
// single-instance deploy (and to drive the quota UI); swap the Map for Redis
// (e.g. Upstash) before running this on more than one node.
// ---------------------------------------------------------------------------

export const GENERATION_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000; // one hour

// key -> timestamps of generations inside the window
const hits = new Map<string, number[]>();

export interface RateLimitState {
  limit: number;
  remaining: number;
  /** epoch ms when the oldest hit falls out of the window, null when unused */
  resetAt: number | null;
}

function activeHits(key: string, now: number): number[] {
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length > 0) hits.set(key, list);
  else hits.delete(key);
  return list;
}

// Keep the map from growing without bound on a long-lived process.
function sweep(now: number) {
  if (hits.size < 500) return;
  for (const [key, list] of hits) {
    if (list.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
}

function state(list: number[]): RateLimitState {
  return {
    limit: GENERATION_LIMIT,
    remaining: Math.max(0, GENERATION_LIMIT - list.length),
    resetAt: list.length > 0 ? list[0] + WINDOW_MS : null,
  };
}

/** Read the quota without spending any of it. */
export function peekRateLimit(key: string): RateLimitState {
  const now = Date.now();
  return state(activeHits(key, now));
}

/** Spend one generation. `allowed: false` means the caller must not proceed. */
export function consumeRateLimit(key: string): RateLimitState & { allowed: boolean } {
  const now = Date.now();
  sweep(now);
  const list = activeHits(key, now);

  if (list.length >= GENERATION_LIMIT) {
    return { ...state(list), allowed: false };
  }

  const next = [...list, now];
  hits.set(key, next);
  return { ...state(next), allowed: true };
}

/** Test seam: drop all recorded hits. */
export function __resetRateLimit() {
  hits.clear();
}

/** Human-readable "resets in ..." for the quota UI. */
export function formatResetIn(resetAt: number | null): string | null {
  if (resetAt === null) return null;
  const ms = resetAt - Date.now();
  if (ms <= 0) return null;
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
