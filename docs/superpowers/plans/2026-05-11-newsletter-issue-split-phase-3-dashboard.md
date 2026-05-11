# Phase 3 — Query/Mutation Layer & Dashboard UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull all `fetch()` calls out of components into named functions under `lib/query/` (reads) and `lib/mutation/` (writes). Adapt the newsletter detail prefetch to the new wire shape and add an issue detail prefetch. Build the new `/dashboard/newsletter/[id]` index page. Repurpose `app/home-form.tsx` into two thinner forms. Move `topics-editor` and `draft-editor` under an `issue/[issueId]/` segment.

**Architecture:** Components stay focused on UI + TanStack Query wiring. Read functions throw typed errors (`NewsletterNotFoundError`, `IssueNotFoundError`); mutation functions throw plain `Error` with the server's message. Query keys live in dedicated `*-keys.ts` files so prefetch and invalidation sites import the same key factory.

**Spec sections covered:** §6 (API surface — client side), §7 (Dashboard UX), parts of §10.

**Depends on:** Phase 2 (all new API routes exist and return the documented shapes).

**After this phase:** A user can complete the full happy path in the dashboard: create newsletter → create article → edit topics → generate draft → publish. Public `/p/[slug]` still shows the bare subscribe form; Phase 4 adds the archive.

---

## File structure (this phase)

```
Create:
- lib/query/issue-keys.ts
- lib/query/fetch-issue-detail.ts
- lib/query/prefetch-issue-detail.ts
- lib/mutation/newsletter-mutations.ts
- lib/mutation/issue-mutations.ts
- app/dashboard/newsletter/[id]/page.tsx           (new index page)
- app/dashboard/newsletter/[id]/newsletter-header.tsx
- app/dashboard/newsletter/[id]/create-article-form.tsx
- app/dashboard/newsletter/[id]/issues-list.tsx
- app/dashboard/newsletter/[id]/issue/[issueId]/topics/page.tsx
- app/dashboard/newsletter/[id]/issue/[issueId]/topics/topics-editor.tsx    (moved+adapted)
- app/dashboard/newsletter/[id]/issue/[issueId]/topics/error.tsx
- app/dashboard/newsletter/[id]/issue/[issueId]/draft/page.tsx
- app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx      (moved+adapted)
- app/dashboard/newsletter/[id]/issue/[issueId]/draft/error.tsx
- components/dashboard/create-newsletter-form.tsx                            (replaces inline form on /dashboard)

Modify:
- lib/query/fetch-newsletter-detail.ts             new wire shape (Newsletter + issues)
- lib/query/prefetch-newsletter-detail.ts          (no behavior change; verify import paths still resolve)
- app/dashboard/page.tsx                           use new types, new form, new card layout

Delete:
- app/home-form.tsx                                replaced by create-newsletter-form + create-article-form
- app/dashboard/newsletter/[id]/topics/            entire dir (moved one level down)
- app/dashboard/newsletter/[id]/draft/             entire dir (moved one level down)
- lib/query/fetch-newsletter-detail.test.ts        replaced by an updated version against new shape
```

---

## Task 1: Adapt `lib/query/fetch-newsletter-detail.ts` to the new wire shape

The endpoint now returns `{ newsletter, issues }` instead of `{ newsletter, topics }`, with a slimmer `Newsletter` (no `niche`/`status`/`finalDraft`/`mastraThreadId`/`displayName`).

**Files:**
- Modify: `lib/query/fetch-newsletter-detail.ts`
- Modify: `lib/query/fetch-newsletter-detail.test.ts`

- [ ] **Step 1: Replace `lib/query/fetch-newsletter-detail.ts`**

```typescript
import type { IssueListItem } from "@/lib/types/issue";
import type { Newsletter, NewsletterDetailPayload } from "@/lib/types/newsletter";

export type { Newsletter, NewsletterDetailPayload, IssueListItem };

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
  if (init?.cookie) headers.Cookie = init.cookie;

  const res = await fetch(url, {
    signal: init?.signal,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    credentials: init?.baseUrl ? "include" : "same-origin",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: unknown;
    newsletter?: Newsletter;
    issues?: IssueListItem[];
  };

  if (res.status === 404) {
    const msg =
      typeof data.error === "string" ? data.error : "Newsletter not found.";
    throw new NewsletterNotFoundError(msg);
  }
  if (!res.ok) throw new Error("Could not load newsletter.");
  if (!data.newsletter || !Array.isArray(data.issues)) {
    throw new Error("Invalid newsletter response.");
  }

  return { newsletter: data.newsletter, issues: data.issues };
}
```

- [ ] **Step 2: Update the test against the new shape**

Replace `lib/query/fetch-newsletter-detail.test.ts` with:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NewsletterNotFoundError,
  fetchNewsletterDetail,
} from "./fetch-newsletter-detail";

const ORIGINAL_FETCH = global.fetch;
afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

function mockFetchOnce(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("fetchNewsletterDetail", () => {
  it("returns newsletter + issues on 200", async () => {
    mockFetchOnce(200, {
      newsletter: {
        id: "n1",
        name: "Coral Weekly",
        slug: "coral-weekly",
        tagline: null,
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
      },
      issues: [
        {
          id: "i1",
          newsletterId: "n1",
          niche: "climate",
          title: "Heat pumps",
          status: "PUBLISHED",
          slug: "heat-pumps",
          publishedAt: "2026-05-11T00:00:00.000Z",
          updatedAt: "2026-05-11T00:00:00.000Z",
        },
      ],
    });

    const result = await fetchNewsletterDetail("n1");
    expect(result.newsletter.name).toBe("Coral Weekly");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].status).toBe("PUBLISHED");
  });

  it("throws NewsletterNotFoundError on 404", async () => {
    mockFetchOnce(404, { error: "Newsletter not found." });
    await expect(fetchNewsletterDetail("missing")).rejects.toBeInstanceOf(
      NewsletterNotFoundError,
    );
  });

  it("throws generic Error on malformed payload", async () => {
    mockFetchOnce(200, { newsletter: { id: "n1" } }); // missing issues array
    await expect(fetchNewsletterDetail("n1")).rejects.toThrow(/Invalid/);
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run lib/query/fetch-newsletter-detail.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add lib/query/fetch-newsletter-detail.ts lib/query/fetch-newsletter-detail.test.ts
git commit -m "refactor(query): fetchNewsletterDetail returns issues list, uses shared types"
```

---

## Task 2: New issue-detail query helpers (keys + fetch + prefetch)

**Files:**
- Create: `lib/query/issue-keys.ts`
- Create: `lib/query/fetch-issue-detail.ts`
- Create: `lib/query/prefetch-issue-detail.ts`

- [ ] **Step 1: Write `lib/query/issue-keys.ts`**

```typescript
export function issueDetailQueryKey(issueId: string) {
  return ["issue", "detail", issueId] as const;
}
```

- [ ] **Step 2: Write `lib/query/fetch-issue-detail.ts`**

```typescript
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
```

- [ ] **Step 3: Write `lib/query/prefetch-issue-detail.ts`**

```typescript
import { dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { fetchIssueDetail } from "./fetch-issue-detail";
import { getAppOriginFromHeaderValues } from "./get-app-origin";
import { issueDetailQueryKey } from "./issue-keys";
import { makeQueryClient } from "./query-client";

/**
 * Prefetches `GET /api/issues/[id]` into a throwaway QueryClient and returns
 * dehydrated state for `<HydrationBoundary state={...}>`.
 */
export async function getIssueDehydratedState(issueId: string) {
  const h = await headers();
  const origin = getAppOriginFromHeaderValues(h);
  const cookie = h.get("cookie") ?? "";
  const queryClient = makeQueryClient();

  await queryClient.prefetchQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) =>
      fetchIssueDetail(issueId, { signal, baseUrl: origin, cookie }),
  });

  return dehydrate(queryClient);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/query/issue-keys.ts lib/query/fetch-issue-detail.ts lib/query/prefetch-issue-detail.ts
git commit -m "feat(query): issue-detail query keys, fetcher, server prefetch"
```

---

## Task 3: Mutation modules

Pull every `fetch()` write call from components into typed mutation functions.

**Files:**
- Create: `lib/mutation/newsletter-mutations.ts`
- Create: `lib/mutation/issue-mutations.ts`

- [ ] **Step 1: Write `lib/mutation/newsletter-mutations.ts`**

```typescript
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
```

- [ ] **Step 2: Write `lib/mutation/issue-mutations.ts`**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/mutation
git commit -m "feat(mutation): extract newsletter/issue mutations from components"
```

---

## Task 4: `CreateNewsletterForm` component (name only)

Replaces the niche-asking `HomeForm` on `/dashboard`. Posts to `/api/newsletters`, then redirects to the new newsletter index page.

**Files:**
- Create: `components/dashboard/create-newsletter-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createNewsletter } from "@/lib/mutation/newsletter-mutations";

export function CreateNewsletterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const newsletter = await createNewsletter({ name });
      router.push(`/dashboard/newsletter/${newsletter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create newsletter.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-intel-stack-md">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-sm font-medium text-black">Newsletter name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Coral Weekly"
          required
          aria-invalid={error ? true : undefined}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? "Creating…" : "Create newsletter"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/create-newsletter-form.tsx
git commit -m "feat(dashboard): CreateNewsletterForm (name-only step 1)"
```

---

## Task 5: Rework `/dashboard` page

Switches to the new types, summary row format, and form.

**Files:**
- Modify: `app/dashboard/page.tsx`
- Delete: `app/home-form.tsx`

- [ ] **Step 1: Replace `app/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateNewsletterForm } from "@/components/dashboard/create-newsletter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const internalId = await getInternalUserId();
  if (!internalId) redirect("/sign-in");

  const newsletters = await prisma.newsletter.findMany({
    where: { userId: internalId },
    orderBy: { updatedAt: "desc" },
    include: {
      issues: {
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true, publishedAt: true, createdAt: true },
        take: 1,
      },
      _count: { select: { issues: true } },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-intel-stack-lg px-8 py-10">
      <section className="space-y-intel-stack-md">
        <h2 className="orchestra-heading text-2xl font-normal tracking-tight text-black">
          Your newsletters
        </h2>
        {newsletters.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-[#6F6F6F]">
                No newsletters yet — create one below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-intel-stack-md">
            {newsletters.map((n) => {
              const latest = n.issues[0];
              const summary =
                n._count.issues === 0
                  ? "0 issues"
                  : latest?.status === "PUBLISHED" && latest.publishedAt
                    ? `${n._count.issues} issue${n._count.issues === 1 ? "" : "s"} · latest published ${latest.publishedAt.toLocaleDateString()}`
                    : `${n._count.issues} issue${n._count.issues === 1 ? "" : "s"} · latest ${latest?.status?.toLowerCase() ?? "unknown"}`;

              return (
                <Card key={n.id} size="sm">
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-intel-stack-md space-y-0">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-base font-medium text-black">
                        {n.name}
                      </CardTitle>
                      <CardDescription className="text-[#6F6F6F]">
                        {n.slug ? `Public: /p/${n.slug}` : "Slug missing"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{summary}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-intel-stack-sm pt-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/newsletter/${n.id}`}>Open</Link>
                    </Button>
                    {n.slug ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/p/${n.slug}`} target="_blank" rel="noreferrer">
                          Public page
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator className="bg-black/10" />

      <section className="space-y-intel-stack-md">
        <h2 className="orchestra-heading text-2xl font-normal tracking-tight text-black">
          Create newsletter
        </h2>
        <CreateNewsletterForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Delete `app/home-form.tsx`**

```bash
rm app/home-form.tsx
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx app/home-form.tsx
git commit -m "feat(dashboard): name-only create, issue summary on newsletter cards"
```

---

## Task 6: Newsletter detail page (`/dashboard/newsletter/[id]`)

This page is new. It holds the editable newsletter header, the "Create an article" form, and the issues list.

**Files:**
- Create: `app/dashboard/newsletter/[id]/page.tsx`
- Create: `app/dashboard/newsletter/[id]/newsletter-header.tsx`
- Create: `app/dashboard/newsletter/[id]/create-article-form.tsx`
- Create: `app/dashboard/newsletter/[id]/issues-list.tsx`

- [ ] **Step 1: Write the page**

`app/dashboard/newsletter/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { CreateArticleForm } from "./create-article-form";
import { IssuesList } from "./issues-list";
import { NewsletterHeader } from "./newsletter-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getNewsletterDehydratedState } from "@/lib/query/prefetch-newsletter-detail";

function Fallback({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-intel-stack-sm text-sm text-[#6F6F6F]">
      <Spinner />
      {label}
    </div>
  );
}

export default async function NewsletterIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dehydratedState = await getNewsletterDehydratedState(id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-lg px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-md">
        <h1 className="orchestra-heading text-3xl font-normal tracking-tight text-black">
          Newsletter
        </h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<Fallback label="Loading newsletter…" />}>
          <NewsletterHeader newsletterId={id} />
        </Suspense>
        <Suspense fallback={null}>
          <CreateArticleForm newsletterId={id} />
        </Suspense>
        <Suspense fallback={<Fallback label="Loading articles…" />}>
          <IssuesList newsletterId={id} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
```

- [ ] **Step 2: Write `newsletter-header.tsx` (editable name + tagline)**

```tsx
"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateNewsletterMetadata } from "@/lib/mutation/newsletter-mutations";
import { fetchNewsletterDetail } from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function NewsletterHeader({ newsletterId }: { newsletterId: string }) {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  const [name, setName] = useState(data.newsletter.name);
  const [tagline, setTagline] = useState(data.newsletter.tagline ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      updateNewsletterMetadata({
        id: newsletterId,
        name: name.trim(),
        tagline: tagline.trim(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      }),
  });

  const dirty =
    name.trim() !== data.newsletter.name ||
    tagline.trim() !== (data.newsletter.tagline ?? "");

  return (
    <section className="flex flex-col gap-intel-stack-md rounded-lg border border-black/10 p-6">
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Name
        </span>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tagline (optional)
        </span>
        <Textarea
          rows={2}
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </div>
      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Save failed."}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        disabled={!dirty || saveMutation.isPending || name.trim().length === 0}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}
```

- [ ] **Step 3: Write `create-article-form.tsx`**

```tsx
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIssue } from "@/lib/mutation/issue-mutations";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function CreateArticleForm({ newsletterId }: { newsletterId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [niche, setNiche] = useState("");

  const mutation = useMutation({
    mutationFn: () => createIssue({ newsletterId, niche }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: newsletterDetailQueryKey(newsletterId),
      });
      router.push(
        `/dashboard/newsletter/${newsletterId}/issue/${data.issueId}/topics`,
      );
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!niche.trim() || mutation.isPending) return;
    mutation.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-intel-stack-md rounded-lg border border-black/10 p-6"
    >
      <h2 className="orchestra-heading text-xl font-normal text-black">
        Create an article
      </h2>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-sm font-medium text-black">Niche</span>
        <Input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. climate tech this week"
          required
          disabled={mutation.isPending}
        />
      </div>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Could not create article."}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={!niche.trim() || mutation.isPending}>
        {mutation.isPending ? "Researching…" : "Create article"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Write `issues-list.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchNewsletterDetail } from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function IssuesList({ newsletterId }: { newsletterId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  if (data.issues.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-[#6F6F6F]">
            No articles yet. Use the form above to create your first one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-intel-stack-md">
      <h2 className="orchestra-heading text-xl font-normal text-black">Articles</h2>
      <div className="flex flex-col gap-intel-stack-sm">
        {data.issues.map((issue) => {
          const isPublished = issue.status === "PUBLISHED" && issue.slug;
          const editTarget =
            issue.status === "REVIEWING" || issue.status === "PUBLISHED"
              ? "draft"
              : "topics";
          return (
            <Card key={issue.id} size="sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-intel-stack-md space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-medium text-black">
                    {issue.title ?? issue.niche}
                  </CardTitle>
                  <CardDescription className="text-[#6F6F6F]">
                    {issue.publishedAt
                      ? `Published ${new Date(issue.publishedAt).toLocaleDateString()}`
                      : `Updated ${new Date(issue.updatedAt).toLocaleDateString()}`}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{issue.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-intel-stack-sm pt-0">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/dashboard/newsletter/${newsletterId}/issue/${issue.id}/${editTarget}`}
                  >
                    {issue.status === "PUBLISHED" ? "View" : "Edit"}
                  </Link>
                </Button>
                {isPublished ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/p/${data.newsletter.slug}/i/${issue.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public link
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/[id]/page.tsx app/dashboard/newsletter/[id]/newsletter-header.tsx app/dashboard/newsletter/[id]/create-article-form.tsx app/dashboard/newsletter/[id]/issues-list.tsx
git commit -m "feat(dashboard): newsletter index with header, create-article, issues list"
```

---

## Task 7: Relocate topics-editor under `issue/[issueId]/topics/`

Same UI, but the data source flips from newsletter-detail to issue-detail, and the save mutation goes through `lib/mutation/issue-mutations`.

**Files:**
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/topics/page.tsx`
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/topics/topics-editor.tsx`
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/topics/error.tsx`
- Delete: `app/dashboard/newsletter/[id]/topics/`

- [ ] **Step 1: Write the new `page.tsx`**

```tsx
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TopicsEditor } from "./topics-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getIssueDehydratedState } from "@/lib/query/prefetch-issue-detail";

function Fallback() {
  return (
    <div className="flex items-center gap-intel-stack-sm text-sm text-[#6F6F6F]">
      <Spinner />
      Loading topics…
    </div>
  );
}

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const dehydratedState = await getIssueDehydratedState(issueId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-lg px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-md">
        <h1 className="orchestra-heading text-3xl font-normal tracking-tight text-black">
          Topics
        </h1>
        <div className="flex flex-wrap gap-intel-stack-sm">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/newsletter/${id}`}>Newsletter</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<Fallback />}>
          <TopicsEditor newsletterId={id} issueId={issueId} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
```

- [ ] **Step 2: Write the new `topics-editor.tsx`**

```tsx
"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTopics } from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";
import type { Topic } from "@/lib/types/topic";

function topicsFingerprint(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.topics
    .map((t) => [t.id, t.title, t.summary, t.sourceUrl, t.isApproved].join("\u0001"))
    .join("\u0002")}`;
}

export function TopicsEditor({
  newsletterId,
  issueId,
}: {
  newsletterId: string;
  issueId: string;
}) {
  const { data } = useSuspenseQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) => fetchIssueDetail(issueId, { signal }),
  });
  const fp = useMemo(() => topicsFingerprint(data), [data]);
  return (
    <TopicsEditorForm
      key={fp}
      newsletterId={newsletterId}
      issueId={issueId}
      initialTopics={data.topics}
      niche={data.issue.niche}
    />
  );
}

function TopicsEditorForm({
  newsletterId,
  issueId,
  initialTopics,
  niche,
}: {
  newsletterId: string;
  issueId: string;
  initialTopics: Topic[];
  niche: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topics, setTopics] = useState(initialTopics);

  const saveMutation = useMutation({
    mutationFn: (payload: Topic[]) =>
      saveTopics({
        issueId,
        topics: payload.map((t) => ({
          id: t.id,
          title: t.title,
          summary: t.summary,
          sourceUrl: t.sourceUrl,
          isApproved: t.isApproved,
        })),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) }),
  });

  const hasApproved = topics.some((t) => t.isApproved);

  function updateTopic(id: string, patch: Partial<Topic>) {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="flex flex-col gap-intel-stack-lg">
      <p className="text-sm text-muted-foreground">
        Niche: <span className="font-medium text-foreground">{niche}</span>
      </p>
      {saveMutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save topics."}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-intel-stack-md">
        {topics.map((t) => (
          <Card key={t.id} size="sm">
            <CardContent className="flex flex-col gap-intel-stack-md pt-6">
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Title
                </span>
                <Input
                  value={t.title}
                  onChange={(e) => updateTopic(t.id, { title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Summary
                </span>
                <Textarea
                  rows={3}
                  value={t.summary}
                  onChange={(e) => updateTopic(t.id, { summary: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-intel-stack-sm">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source URL
                </span>
                <Input
                  value={t.sourceUrl}
                  onChange={(e) => updateTopic(t.id, { sourceUrl: e.target.value })}
                />
              </div>
              <label className="text-foreground flex items-center gap-intel-stack-sm text-sm">
                <input
                  type="checkbox"
                  checked={t.isApproved}
                  onChange={(e) => updateTopic(t.id, { isApproved: e.target.checked })}
                  className="size-4 rounded border-input"
                />
                Approved for article
              </label>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-intel-stack-sm">
        <Button
          type="button"
          disabled={saveMutation.isPending || topics.length === 0}
          onClick={() => saveMutation.mutate(topics)}
        >
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasApproved}
          onClick={() =>
            router.push(
              `/dashboard/newsletter/${newsletterId}/issue/${issueId}/draft`,
            )
          }
        >
          Continue to draft
        </Button>
      </div>
      {!hasApproved ? (
        <Alert>
          <AlertDescription>Approve at least one topic to continue.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Add an error boundary**

`app/dashboard/newsletter/[id]/issue/[issueId]/topics/error.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function TopicsError({ error }: { error: Error }) {
  const isNotFound = error.name === "IssueNotFoundError";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-md px-8 py-10">
      <Alert variant="destructive">
        <AlertTitle>{isNotFound ? "Issue not found" : "Something went wrong"}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Delete the old topics dir**

```bash
rm -r app/dashboard/newsletter/[id]/topics
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/[id]/issue/[issueId]/topics app/dashboard/newsletter/[id]/topics
git commit -m "feat(dashboard): topics editor under issue/[issueId]/, mutations extracted"
```

---

## Task 8: Relocate draft-editor under `issue/[issueId]/draft/`

**Files:**
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/page.tsx`
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/draft-editor.tsx`
- Create: `app/dashboard/newsletter/[id]/issue/[issueId]/draft/error.tsx`
- Delete: `app/dashboard/newsletter/[id]/draft/`

- [ ] **Step 1: Write the page**

```tsx
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { DraftEditor } from "./draft-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getIssueDehydratedState } from "@/lib/query/prefetch-issue-detail";

function Fallback() {
  return (
    <div className="flex items-center gap-intel-stack-sm text-sm text-[#6F6F6F]">
      <Spinner />
      Loading…
    </div>
  );
}

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string; issueId: string }>;
}) {
  const { id, issueId } = await params;
  const dehydratedState = await getIssueDehydratedState(issueId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-lg px-8 py-10">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-md">
        <h1 className="orchestra-heading text-3xl font-normal tracking-tight text-black">
          Draft
        </h1>
        <div className="flex flex-wrap gap-intel-stack-sm">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/newsletter/${id}/issue/${issueId}/topics`}>
              Back to topics
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/newsletter/${id}`}>Newsletter</Link>
          </Button>
        </div>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<Fallback />}>
          <DraftEditor issueId={issueId} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
```

- [ ] **Step 2: Write the draft editor**

```tsx
"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  generateDraft,
  publishIssue,
  saveDraft,
} from "@/lib/mutation/issue-mutations";
import {
  type IssueDetailPayload,
  fetchIssueDetail,
} from "@/lib/query/fetch-issue-detail";
import { issueDetailQueryKey } from "@/lib/query/issue-keys";

function draftStateKey(d: IssueDetailPayload) {
  return `${d.issue.updatedAt}|${d.issue.status}|${(d.issue.finalDraft ?? "").length}`;
}

export function DraftEditor({ issueId }: { issueId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: issueDetailQueryKey(issueId),
    queryFn: ({ signal }) => fetchIssueDetail(issueId, { signal }),
  });
  const dk = useMemo(() => draftStateKey(data), [data]);
  return (
    <DraftEditorFields
      key={dk}
      issueId={issueId}
      initialDraft={data.issue.finalDraft ?? ""}
      status={data.issue.status}
    />
  );
}

function DraftEditorFields({
  issueId,
  initialDraft,
  status,
}: {
  issueId: string;
  initialDraft: string;
  status: string;
}) {
  const queryClient = useQueryClient();
  const [draftText, setDraftText] = useState(initialDraft);
  const [publishOk, setPublishOk] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: issueDetailQueryKey(issueId) });

  const generateMutation = useMutation({
    mutationFn: () => generateDraft({ issueId }),
    onSuccess: (result) => {
      setDraftText(result.draft);
      setPublishOk(null);
      void invalidate();
    },
  });

  const saveMutation = useMutation({
    mutationFn: (text: string) => saveDraft({ issueId, finalDraft: text }),
    onSuccess: () => {
      setPublishOk(null);
      void invalidate();
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (text: string) => {
      await saveDraft({ issueId, finalDraft: text });
      return publishIssue({ issueId });
    },
    onSuccess: () => {
      setPublishOk("Published successfully.");
      void invalidate();
    },
  });

  const mutationError =
    generateMutation.error ?? saveMutation.error ?? publishMutation.error;

  const draftTrimmed = draftText.trim();
  const canPublish =
    draftTrimmed.length > 0 &&
    status !== "PUBLISHED" &&
    status !== "RESEARCHING" &&
    (status === "DRAFTING" || status === "REVIEWING");

  return (
    <div className="flex flex-col gap-intel-stack-md">
      {status ? (
        <div className="flex flex-wrap items-center gap-intel-stack-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </span>
          <Badge variant="secondary">{status}</Badge>
        </div>
      ) : null}
      {mutationError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {mutationError instanceof Error ? mutationError.message : "Request failed."}
          </AlertDescription>
        </Alert>
      ) : null}
      {publishOk ? (
        <Alert>
          <AlertDescription>{publishOk}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-intel-stack-sm">
        <Button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? "Generating…" : "Generate draft"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(draftText)}
        >
          {saveMutation.isPending ? "Saving…" : "Save draft"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={
            publishMutation.isPending ||
            generateMutation.isPending ||
            saveMutation.isPending ||
            !canPublish
          }
          onClick={() => publishMutation.mutate(draftText)}
        >
          {publishMutation.isPending ? "Publishing…" : "Publish"}
        </Button>
      </div>
      <div className="flex flex-col gap-intel-stack-sm">
        <span className="text-foreground text-sm font-medium">Markdown</span>
        <Textarea
          rows={18}
          className="min-h-112 font-mono text-sm"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          spellCheck
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the draft error boundary**

```tsx
"use client";

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DraftError({ error }: { error: Error }) {
  const isNotFound = error.name === "IssueNotFoundError";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-intel-stack-md px-8 py-10">
      <Alert variant="destructive">
        <AlertTitle>{isNotFound ? "Issue not found" : "Something went wrong"}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Delete the old draft dir**

```bash
rm -r app/dashboard/newsletter/[id]/draft
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/[id]/issue/[issueId]/draft app/dashboard/newsletter/[id]/draft
git commit -m "feat(dashboard): draft editor under issue/[issueId]/, mutations extracted"
```

---

## Task 9: Verify the build passes end-to-end

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If anything in `app/p/**` complains about removed fields (e.g. `niche` on Newsletter), that's expected to be cleaned up in Phase 4 — note the file path and leave it; or you may patch it minimally here if it blocks `npm run build`.

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Click-through smoke test**

```bash
npm run dev
```

In a browser, signed in:
1. Go to `/dashboard`. Click "Create newsletter", enter a name, submit.
2. Land on `/dashboard/newsletter/<id>`. Edit tagline, save.
3. Use "Create an article", enter a niche, submit. Wait for research.
4. Land on `/dashboard/newsletter/<id>/issue/<issueId>/topics`. Toggle approval, save.
5. Click "Continue to draft". Click "Generate draft". Wait.
6. Click "Save draft", then "Publish". Expect "Published successfully" alert.
7. Back on `/dashboard/newsletter/<id>`, the issue row now shows status `PUBLISHED` and a "Public link" button.

If any step fails with a frontend error, check the network tab for the request URL and fix the responsible mutation/query module.

---

## Phase 3 verification gate

- [ ] `npx vitest run` passes for all lib tests (`markdown-title`, `slug`, `fetch-newsletter-detail`, `newsletter-keys`, `subscribe-token`).
- [ ] `npm run build` succeeds.
- [ ] Manual click-through (Task 9 Step 3) reaches the "Published successfully" alert.

Hand off to Phase 4 (`2026-05-11-newsletter-issue-split-phase-4-public.md`).

---

## Out of scope for this phase

- Public archive listing on `/p/[slug]` (Phase 4).
- Public per-issue page rendering Markdown (Phase 4).
- Edit-after-publish UX (deferred follow-up).
- Issue title manual override (deferred follow-up).
