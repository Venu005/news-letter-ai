/** Fixed-window counters — safe for single Node instance only; use Redis for horizontal scale. */

type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 60_000;
const MAX_PER_IP_SLUG = 30;
const MAX_PER_EMAIL_SLUG = 10;

const store = new Map<string, Bucket>();

function prune(key: string, now: number): Bucket {
  const b = store.get(key);
  if (!b) return { count: 0, windowStart: now };
  if (now - b.windowStart > WINDOW_MS) {
    const fresh = { count: 0, windowStart: now };
    store.set(key, fresh);
    return fresh;
  }
  return b;
}

/** Returns false when rate limit exceeded. */
export function rateLimitSubscribeHit(key: string, limitKind: "ipSlug" | "ipEmailSlug"): boolean {
  const now = Date.now();
  const b = prune(key, now);
  const max = limitKind === "ipEmailSlug" ? MAX_PER_EMAIL_SLUG : MAX_PER_IP_SLUG;
  b.count += 1;
  store.set(key, b);
  return b.count <= max;
}

export function subscribeRateKeys(ip: string, slug: string, emailNormalized: string) {
  return {
    ipSlug: `${ip}|${slug}`,
    ipEmailSlug: `${ip}|${emailNormalized}|${slug}`,
  };
}

export function clientIpFromHeaders(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
