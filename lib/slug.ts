import { nanoid } from "nanoid";

export function slugifySegment(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 3 ? s : "newsletter";
}

/** Allocate a globally unique slug with niche-derived prefix + collision suffixes. */
export async function allocateNewsletterSlug(
  niche: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifySegment(niche);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${nanoid(6)}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("Could not allocate slug");
}
