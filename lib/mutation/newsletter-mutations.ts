import type { Newsletter } from "@/lib/types/newsletter";

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (typeof body.error === "string") return body.error;
  return fallback;
}

export type CreateNewsletterInput = { name: string };

export async function createNewsletter(
  input: CreateNewsletterInput,
): Promise<Newsletter> {
  const res = await fetch("/api/newsletters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name.trim() }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to create newsletter."));
  const body = (await res.json()) as { newsletter: Newsletter };
  return body.newsletter;
}

export type UpdateNewsletterMetadataInput = {
  id: string;
  name?: string;
  tagline?: string;
};

export async function updateNewsletterMetadata(
  input: UpdateNewsletterMetadataInput,
): Promise<Newsletter> {
  const { id, ...payload } = input;
  const res = await fetch(`/api/newsletters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to update newsletter."));
  const body = (await res.json()) as { newsletter: Newsletter };
  return body.newsletter;
}
