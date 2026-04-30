import { z } from "zod";

export const newsletterTopicSchema = z.array(
  z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    sourceUrl: z.string().url(),
  }),
);

export type NewsletterTopicPayload = z.infer<typeof newsletterTopicSchema>;

export function parseTopicsJson(text: string): NewsletterTopicPayload {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    throw new Error("Agent response did not contain valid JSON topic array.");
  }

  const result = newsletterTopicSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Topic JSON validation failed: ${result.error.message}`);
  }

  return result.data;
}
