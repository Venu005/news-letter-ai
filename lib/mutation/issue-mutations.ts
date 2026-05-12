import type { IssueDetail, IssueDetailPayload } from "@/lib/types/issue";
import type { Topic, TopicInput } from "@/lib/types/topic";

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (typeof body.error === "string") return body.error;
  return fallback;
}

export type CreateIssueInput = { newsletterId: string; niche: string };

export async function createIssue(input: CreateIssueInput): Promise<{
  issueId: string;
  threadId: string;
}> {
  const res = await fetch(`/api/newsletters/${input.newsletterId}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ niche: input.niche.trim() }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to create issue."));
  const body = (await res.json()) as { issueId: string; threadId: string };
  return body;
}

export type SaveTopicsInput = { issueId: string; topics: TopicInput[] };

export async function saveTopics(input: SaveTopicsInput): Promise<Topic[]> {
  const res = await fetch(`/api/issues/${input.issueId}/topics`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics: input.topics }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to save topics."));
  const body = (await res.json()) as { topics: Topic[] };
  return body.topics;
}

export type SaveDraftInput = { issueId: string; finalDraft: string };

export async function saveDraft(input: SaveDraftInput): Promise<IssueDetailPayload> {
  const res = await fetch(`/api/issues/${input.issueId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ finalDraft: input.finalDraft }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to save draft."));
  return (await res.json()) as IssueDetailPayload;
}

export type GenerateDraftInput = { issueId: string };

export async function generateDraft(
  input: GenerateDraftInput,
): Promise<{ draft: string; title: string }> {
  const res = await fetch(`/api/issues/${input.issueId}/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to generate draft."));
  const body = (await res.json()) as { draft: string; title: string };
  return body;
}

export type PublishIssueInput = { issueId: string; to?: string };

export async function publishIssue(
  input: PublishIssueInput,
): Promise<{ slug: string; messageId?: string }> {
  const res = await fetch(`/api/issues/${input.issueId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.to ? { to: input.to } : {}),
  });
  if (!res.ok) throw new Error(await parseError(res, "Publish failed."));
  return (await res.json()) as { slug: string; messageId?: string };
}

export type { IssueDetail };
