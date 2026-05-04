export type TopicRow = {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  newsletterId: string;
};

export type NewsletterDetailPayload = {
  newsletter: {
    id: string;
    niche: string;
    mastraThreadId: string | null;
    status: string;
    finalDraft: string | null;
    slug: string | null;
    displayName: string | null;
    tagline: string | null;
    createdAt: string;
    updatedAt: string;
  };
  topics: TopicRow[];
};

export class NewsletterNotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message = "Newsletter not found.") {
    super(message);
    this.name = "NewsletterNotFoundError";
  }
}

export type FetchNewsletterDetailInit = {
  signal?: AbortSignal;
  /** Absolute origin, e.g. https://example.com — omit in browser for relative /api */
  baseUrl?: string;
  /** Forwarded Cookie header for server-side prefetch */
  cookie?: string;
};

export async function fetchNewsletterDetail(
  newsletterId: string,
  init?: FetchNewsletterDetailInit,
): Promise<NewsletterDetailPayload> {
  const path = `/api/newsletters/${newsletterId}`;
  const url =
    init?.baseUrl != null && init.baseUrl.length > 0
      ? `${init.baseUrl.replace(/\/$/, "")}${path}`
      : path;

  const headers: Record<string, string> = {};
  if (init?.cookie) {
    headers.Cookie = init.cookie;
  }

  const res = await fetch(url, {
    signal: init?.signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    credentials: init?.baseUrl ? "include" : "same-origin",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: unknown;
    newsletter?: NewsletterDetailPayload["newsletter"];
    topics?: TopicRow[];
  };

  if (res.status === 404) {
    const msg =
      typeof data.error === "string" ? data.error : "Newsletter not found.";
    throw new NewsletterNotFoundError(msg);
  }

  if (!res.ok) {
    throw new Error("Could not load newsletter.");
  }

  if (!data.newsletter || !Array.isArray(data.topics)) {
    throw new Error("Invalid newsletter response.");
  }

  return {
    newsletter: data.newsletter,
    topics: data.topics,
  };
}
