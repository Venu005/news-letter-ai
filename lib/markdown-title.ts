/**
 * Returns the first Markdown ATX H1 (`# Heading`) from a string, with leading/
 * trailing whitespace and any closed-ATX trailing hashes stripped.
 *
 * If no H1 is found, returns `fallback` when provided, else null.
 */
export function extractTitleFromMarkdown(
  markdown: string,
  fallback?: string,
): string | null {
  if (!markdown) return fallback ?? null;
  const lines = markdown.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;
    const match = /^#\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      const heading = match[1].trim();
      if (heading.length > 0) return heading;
    }
    if (/^#{1,6}\s/.test(line)) {
      continue;
    }
  }
  return fallback ?? null;
}
