/** Request checks shared by the API routes. */

/**
 * Cross-site request forgery guard for cookie-authenticated POSTs: the browser's Origin must be this site.
 * SameSite=Lax cookies already stop most of it; this closes the rest.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

// ponytail: counts live in this process's memory, so they reset on restart and are per instance.
// Move to the database (or Redis) when the site runs on more than one server.
const hits = new Map<string, number[]>();

/** True when `key` has made `max` or more attempts in the last `windowMs`; records this attempt. */
export function rateLimited(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
  return recent.length > max;
}

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
