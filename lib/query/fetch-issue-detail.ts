import type { IssueDetail, IssueDetailPayload } from "@/lib/types/issue";
import type { Topic } from "@/lib/types/topic";

export type { IssueDetail, IssueDetailPayload, Topic };

export class IssueNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Issue not found.") {
    super(message);
    this.name = "IssueNotFoundError";
  }
}

export type FetchIssueDetailInit = {
  signal?: AbortSignal;
  baseUrl?: string;
  cookie?: string;
};

export async function fetchIssueDetail(
  issueId: string,
  init?: FetchIssueDetailInit,
): Promise<IssueDetailPayload> {
  const path = `/api/issues/${issueId}`;
  const url =
    init?.baseUrl != null && init.baseUrl.length > 0
      ? `${init.baseUrl.replace(/\/$/, "")}${path}`
      : path;

  const headers: Record<string, string> = {};
  if (init?.cookie) headers.Cookie = init.cookie;

  const res = await fetch(url, {
    signal: init?.signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    credentials: init?.baseUrl ? "include" : "same-origin",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: unknown;
    issue?: IssueDetail;
    topics?: Topic[];
  };

  if (res.status === 404) {
    const msg = typeof data.error === "string" ? data.error : "Issue not found.";
    throw new IssueNotFoundError(msg);
  }
  if (!res.ok) throw new Error("Could not load issue.");
  if (!data.issue || !Array.isArray(data.topics)) {
    throw new Error("Invalid issue response.");
  }

  return { issue: data.issue, topics: data.topics };
}
