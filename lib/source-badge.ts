export function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function sourceInitial(url: string): string {
  const host = sourceHostname(url);
  const letter = host.charAt(0).toUpperCase();
  return letter || "?";
}
