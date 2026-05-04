/** Minimal shape of `await headers()` from `next/headers`. */
export type HeaderGetter = { get(name: string): string | null };

/**
 * Builds absolute site origin for same-origin server fetches (prefetch).
 * Pass the object returned by `await headers()` so we do not call
 * `headers()` twice per request.
 */
export function getAppOriginFromHeaderValues(h: HeaderGetter): string {
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    return `http://localhost:${process.env.PORT ?? "3000"}`;
  }
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
