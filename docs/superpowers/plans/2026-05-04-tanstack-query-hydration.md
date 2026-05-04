# TanStack Query + hydration + Suspense — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TanStack Query with server prefetch and `HydrationBoundary`, migrate the topics and draft dashboard flows to `useSuspenseQuery` / `useMutation`, and preserve existing API contracts and UX (including 404 handling).

**Architecture:** A client `QueryClientProvider` wraps the dashboard subtree. Shared **query keys** and a **`fetchNewsletterDetail`** helper are used by both the server prefetch (`QueryClient.prefetchQuery`) and client `useSuspenseQuery`. Server prefetch calls the same **`GET /api/newsletters/[id]`** with an absolute origin and forwarded **`Cookie`** header so Clerk session matches the Route Handler. **404** is modeled as a thrown **`NewsletterNotFoundError`** so `useSuspenseQuery` surfaces it to **`error.tsx`**. **`HomeForm`** stays as manual `fetch` for this rollout (YAGNI); it can be migrated later with `useMutation` only.

**Tech Stack:** Next.js 16 App Router, React 19, `@tanstack/react-query` (v5), Vitest, existing `/api/newsletters/*` routes.

---

## File structure (create / modify)

| Path | Responsibility |
| --- | --- |
| `package.json` | Add `@tanstack/react-query` dependency. |
| `lib/query/query-client.ts` | `makeQueryClient()` factory with `defaultOptions` (`staleTime`, sensible `retry` for queries). |
| `lib/query/newsletter-keys.ts` | Stable `newsletterDetailQueryKey(newsletterId)` factory. |
| `lib/query/fetch-newsletter-detail.ts` | Types aligned to `GET` handler JSON, `fetchNewsletterDetail`, `NewsletterNotFoundError`. |
| `lib/query/prefetch-newsletter-detail.ts` | Server-only: `headers()`, origin URL, `prefetchQuery` into a request-scoped `QueryClient`. |
| `lib/query/get-app-origin.ts` | Server-only helper: build `https?://host` from `headers()` (`x-forwarded-host` / `host`, `x-forwarded-proto`). |
| `components/providers/query-provider.tsx` | Client: `useState(() => makeQueryClient())` + `QueryClientProvider`. |
| `app/dashboard/layout.tsx` | Wrap `{children}` with `<QueryProvider>`. |
| `app/dashboard/newsletter/[id]/topics/page.tsx` | Async RSC: `QueryClient` + prefetch + `dehydrate` + `HydrationBoundary` + `Suspense` fallback around client editor shell. |
| `app/dashboard/newsletter/[id]/topics/topics-editor.tsx` | Refactor to suspense query + mutation; remove `useEffect` load / manual `loading` for initial read. |
| `app/dashboard/newsletter/[id]/topics/error.tsx` | Client error UI for not-found and generic failures (replaces inline 404 alert for suspense path). |
| `app/dashboard/newsletter/[id]/draft/page.tsx` | Same prefetch + hydration + Suspense pattern as topics. |
| `app/dashboard/newsletter/[id]/draft/draft-editor.tsx` | Refactor to query + mutations; `invalidateQueries` after generate/save/publish. |
| `app/dashboard/newsletter/[id]/draft/error.tsx` | Mirror topics `error.tsx` pattern. |
| `lib/query/newsletter-keys.test.ts` | Vitest: key shape and referential stability expectations. |
| `lib/query/fetch-newsletter-detail.test.ts` | Vitest: 200 parses body; 404 throws `NewsletterNotFoundError`; non-OK throws generic `Error`. |

---

### Task 1: Add dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install TanStack Query**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm install @tanstack/react-query@^5
```

Expected: `package.json` and `package-lock.json` update; no peer dependency errors for React 19.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-query for client data layer"
```

---

### Task 2: Query client factory

**Files:**

- Create: `lib/query/query-client.ts`

- [ ] **Step 1: Implement `makeQueryClient`**

Create `lib/query/query-client.ts`:

```typescript
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          if (error instanceof Error && /not found/i.test(error.message)) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npx tsc --noEmit
```

Expected: exit code 0 (or only pre-existing errors none from this file).

- [ ] **Step 3: Commit**

```bash
git add lib/query/query-client.ts
git commit -m "feat(query): add makeQueryClient factory with defaults"
```

---

### Task 3: Newsletter query keys (TDD)

**Files:**

- Create: `lib/query/newsletter-keys.ts`
- Create: `lib/query/newsletter-keys.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/query/newsletter-keys.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { newsletterDetailQueryKey } from "./newsletter-keys";

describe("newsletterDetailQueryKey", () => {
  it("returns a tuple with newsletter id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(newsletterDetailQueryKey(id)).toEqual(["newsletter", "detail", id]);
  });

  it("returns new array reference each call (TanStack treats keys by deep hash)", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(newsletterDetailQueryKey(id)).not.toBe(newsletterDetailQueryKey(id));
  });
});
```

Create empty `lib/query/newsletter-keys.ts` exporting nothing yet (or a stub that fails).

- [ ] **Step 2: Run test — expect FAIL**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npx vitest run lib/query/newsletter-keys.test.ts
```

Expected: FAIL (export missing or wrong shape).

- [ ] **Step 3: Implement keys**

Create `lib/query/newsletter-keys.ts`:

```typescript
export function newsletterDetailQueryKey(newsletterId: string) {
  return ["newsletter", "detail", newsletterId] as const;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npx vitest run lib/query/newsletter-keys.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/query/newsletter-keys.ts lib/query/newsletter-keys.test.ts
git commit -m "feat(query): add newsletter detail query key factory"
```

---

### Task 4: Shared `fetchNewsletterDetail` + types (TDD)

**Files:**

- Create: `lib/query/fetch-newsletter-detail.ts`
- Create: `lib/query/fetch-newsletter-detail.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/query/fetch-newsletter-detail.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NewsletterNotFoundError,
  fetchNewsletterDetail,
} from "./fetch-newsletter-detail";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchNewsletterDetail", () => {
  it("returns parsed JSON on 200", async () => {
    const body = {
      newsletter: { id: "n1", niche: "tech" },
      topics: [
        {
          id: "t1",
          title: "A",
          summary: "S",
          sourceUrl: "https://example.com",
          isApproved: true,
          newsletterId: "n1",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      }),
    );

    const result = await fetchNewsletterDetail("n1");
    expect(result.newsletter.id).toBe("n1");
    expect(result.topics).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/newsletters/n1",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("throws NewsletterNotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Newsletter not found." }),
      }),
    );

    await expect(fetchNewsletterDetail("missing")).rejects.toBeInstanceOf(
      NewsletterNotFoundError,
    );
  });

  it("throws Error on other non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }),
    );

    await expect(fetchNewsletterDetail("x")).rejects.toThrow(/Could not load/);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npx vitest run lib/query/fetch-newsletter-detail.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement fetch + error class**

Create `lib/query/fetch-newsletter-detail.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npx vitest run lib/query/fetch-newsletter-detail.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/query/fetch-newsletter-detail.ts lib/query/fetch-newsletter-detail.test.ts
git commit -m "feat(query): add shared fetchNewsletterDetail for GET /api/newsletters/[id]"
```

---

### Task 5: Server origin helper + prefetch helper

**Files:**

- Create: `lib/query/get-app-origin.ts`
- Create: `lib/query/prefetch-newsletter-detail.ts`

- [ ] **Step 1: Add `getAppOriginFromHeaders`**

Create `lib/query/get-app-origin.ts`:

```typescript
/** Minimal shape of `await headers()` from `next/headers`. */
export type HeaderGetter = { get(name: string): string | null };

/**
 * Builds absolute site origin for same-origin server fetches (prefetch).
 * Pass the same object returned by `await headers()` so we do not call
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
```

If you prefer one fewer file, delete `get-app-origin.ts` and paste the body of `getAppOriginFromHeaderValues` inline above `prefetchQuery` in `prefetch-newsletter-detail.ts`.

- [ ] **Step 2: Add prefetch helper (single `headers()` call)**

Create `lib/query/prefetch-newsletter-detail.ts`:

```typescript
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { headers } from "next/headers";
import { fetchNewsletterDetail } from "./fetch-newsletter-detail";
import { getAppOriginFromHeaderValues } from "./get-app-origin";
import { newsletterDetailQueryKey } from "./newsletter-keys";

/**
 * Prefetches `GET /api/newsletters/[id]` into a throwaway QueryClient and
 * returns dehydrated state for `<HydrationBoundary state={...}>`.
 */
export async function getNewsletterDehydratedState(newsletterId: string) {
  const h = await headers();
  const origin = getAppOriginFromHeaderValues(h);
  const cookie = h.get("cookie") ?? "";
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) =>
      fetchNewsletterDetail(newsletterId, {
        signal,
        baseUrl: origin,
        cookie,
      }),
  });

  return dehydrate(queryClient);
}
```

- [ ] **Step 3: Run `npm run build`**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm run build
```

Expected: build succeeds. If Next marks the topics/draft pages as static incorrectly, add `export const dynamic = "force-dynamic"` to those pages only as a last resort (prefetch already implies dynamic).

- [ ] **Step 4: Commit**

```bash
git add lib/query/get-app-origin.ts lib/query/prefetch-newsletter-detail.ts
git commit -m "feat(query): add server prefetch for newsletter detail via same GET API"
```

---

### Task 6: Client `QueryProvider` + dashboard layout

**Files:**

- Create: `components/providers/query-provider.tsx`
- Modify: `app/dashboard/layout.tsx`

- [ ] **Step 1: Add client provider**

Create `components/providers/query-provider.tsx`:

```typescript
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "@/lib/query/query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => makeQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Wrap dashboard layout**

Modify `app/dashboard/layout.tsx` to import `QueryProvider` and wrap `{children}`:

```tsx
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryProvider>
      <div className="flex min-h-full flex-col">
        <header className="flex items-center justify-end gap-3 border-b px-8 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <UserButton />
        </header>
        {children}
      </div>
    </QueryProvider>
  );
}
```

- [ ] **Step 3: Run build**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/providers/query-provider.tsx app/dashboard/layout.tsx
git commit -m "feat(query): mount QueryClientProvider under dashboard layout"
```

---

### Task 7: Topics route — hydration, Suspense, error boundary

**Files:**

- Modify: `app/dashboard/newsletter/[id]/topics/page.tsx`
- Create: `app/dashboard/newsletter/[id]/topics/error.tsx`

- [ ] **Step 1: Server page with `HydrationBoundary`**

Replace `app/dashboard/newsletter/[id]/topics/page.tsx` contents with a pattern like:

```tsx
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { TopicsEditor } from "./topics-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getNewsletterDehydratedState } from "@/lib/query/prefetch-newsletter-detail";

function TopicsEditorFallback() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      Loading topics…
    </div>
  );
}

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dehydratedState = await getNewsletterDehydratedState(id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Topics</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<TopicsEditorFallback />}>
          <TopicsEditor newsletterId={id} />
        </Suspense>
      </HydrationBoundary>
    </div>
  );
}
```

Import `getNewsletterDehydratedState` from `@/lib/query/prefetch-newsletter-detail` (defined in Task 5).

- [ ] **Step 2: Add `error.tsx`**

Create `app/dashboard/newsletter/[id]/topics/error.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NewsletterNotFoundError } from "@/lib/query/fetch-newsletter-detail";

export default function TopicsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[topics]", error);
  }, [error]);

  const is404 = error instanceof NewsletterNotFoundError;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col gap-3">
          <span>{is404 ? error.message : "Something went wrong loading this newsletter."}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

Run `npm run dev`, sign in, open a valid newsletter topics URL: initial load should show topics without a visible “loading flash” when prefetch succeeds. Open a bogus id: error boundary UI should appear.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/newsletter/\[id\]/topics/page.tsx app/dashboard/newsletter/\[id\]/topics/error.tsx
git commit -m "feat(topics): hydrate newsletter query and add segment error boundary"
```

---

### Task 8: Refactor `TopicsEditor` to suspense + mutation

**Files:**

- Modify: `app/dashboard/newsletter/[id]/topics/topics-editor.tsx`

- [ ] **Step 1: Replace load effect with `useSuspenseQuery`**

Inside `TopicsEditor` (client component):

- Import `useMutation`, `useQueryClient`, `useSuspenseQuery` from `@tanstack/react-query`.
- Import `fetchNewsletterDetail`, type `TopicRow` from `@/lib/query/fetch-newsletter-detail` (re-export `TopicRow` from this file if other modules import it from `topics-editor` — keep `export type { TopicRow }` re-export for backward compatibility).
- Import `newsletterDetailQueryKey` from `@/lib/query/newsletter-keys`.

Use:

```typescript
const queryClient = useQueryClient();
const { data } = useSuspenseQuery({
  queryKey: newsletterDetailQueryKey(newsletterId),
  queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
});

const [topics, setTopics] = useState<TopicRow[]>(() => data.topics);
const [niche, setNiche] = useState<string | null>(() => data.newsletter.niche ?? null);

// Sync local editor state when server refetches (e.g. after save)
useEffect(() => {
  setTopics(data.topics);
  setNiche(data.newsletter.niche ?? null);
}, [data]);
```

Remove the initial `loading` / `useEffect` load / `load` callback used only for first fetch. Remove the branch that rendered spinner for `loading` (Suspense fallback covers first suspend; after hydration, `useSuspenseQuery` resolves synchronously from cache).

- [ ] **Step 2: `useMutation` for PATCH topics**

```typescript
const saveMutation = useMutation({
  mutationFn: async (payload: TopicRow[]) => {
    const res = await fetch(`/api/newsletters/${newsletterId}/topics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics: payload.map((t) => ({
          id: t.id,
          title: t.title,
          summary: t.summary,
          sourceUrl: t.sourceUrl,
          isApproved: t.isApproved,
        })),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      topics?: TopicRow[];
    };
    if (!res.ok) {
      throw new Error(typeof data.error === "string" ? data.error : "Failed to save topics.");
    }
    if (!data.topics) throw new Error("Invalid save response.");
    return data.topics;
  },
  onSuccess: (updated) => {
    setTopics(updated);
    void queryClient.invalidateQueries({
      queryKey: newsletterDetailQueryKey(newsletterId),
    });
  },
});
```

Wire **Save** button to `saveMutation.mutate(topics)` and show `saveMutation.error` in the existing `Alert` pattern. Use `saveMutation.isPending` instead of `saving` state.

- [ ] **Step 3: Remove dead 404 inline branch**

404 is handled by `error.tsx` via thrown errors from suspense query; remove the `if (error && topics.length === 0 && !loading)` destructive alert block tied to old fetch error state. Keep inline `Alert` for **mutation** errors only.

- [ ] **Step 4: Run vitest + build**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm run test && npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/\[id\]/topics/topics-editor.tsx
git commit -m "refactor(topics): use useSuspenseQuery and useMutation for newsletter data"
```

---

### Task 9: Draft route — same hydration + error + editor refactor

**Files:**

- Modify: `app/dashboard/newsletter/[id]/draft/page.tsx`
- Create: `app/dashboard/newsletter/[id]/draft/error.tsx` (same pattern as topics; adjust `console.error` tag to `[draft]`).
- Modify: `app/dashboard/newsletter/[id]/draft/draft-editor.tsx`

- [ ] **Step 1: Update `draft/page.tsx`**

Mirror Task 7: `getNewsletterDehydratedState(id)`, `HydrationBoundary`, `Suspense` with `Spinner` fallback wrapping `DraftEditor`.

- [ ] **Step 2: Add `draft/error.tsx`**

Copy topics `error.tsx`, change log prefix to `[draft]`.

- [ ] **Step 3: Refactor `DraftEditor`**

- `useSuspenseQuery` with same `queryKey` / `fetchNewsletterDetail` as topics.
- Local `draftText` state initialized from `data.newsletter.finalDraft ?? ""`; `useEffect` to sync when `data` changes after invalidation.
- `useMutation` for: `POST /api/generate-draft`, `PATCH` save, publish flow (publish can stay sequential `fetch` inside one mutation function, or split — **one mutation** `publishDraft` is fine).
- After successful generate/save/publish: `invalidateQueries({ queryKey: newsletterDetailQueryKey(newsletterId) })` so status and draft text refresh from server.
- Remove `loading` / `notFound` / `useEffect` load; remove inline loading spinner block; remove `notFound` alert (404 → error boundary).

- [ ] **Step 4: Run tests + build**

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm run test && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/newsletter/\[id\]/draft/page.tsx app/dashboard/newsletter/\[id\]/draft/error.tsx app/dashboard/newsletter/\[id\]/draft/draft-editor.tsx
git commit -m "feat(draft): hydrate newsletter query and refactor editor with mutations"
```

---

### Task 10: Lint and final verification

- [ ] **Step 1: Lint**

Run:

```bash
cd /home/venusai/Desktop/skill-enhance/newsletter-ai && npm run lint
```

Fix any new issues in touched files.

- [ ] **Step 2: Final commit if fixes needed**

```bash
git add -A && git commit -m "chore: lint fixes for TanStack Query rollout"
```

---

## Spec coverage (self-review)

| Spec section | Tasks |
| --- | --- |
| Provider + defaults | Task 2, 6 |
| Shared keys | Task 3 |
| Server prefetch + dehydrate | Task 4, 5, 7, 9 |
| `useSuspenseQuery` + `Suspense` | Task 7, 8, 9 |
| `useMutation` + invalidate | Task 8, 9 |
| Error boundary for suspense errors | Task 7, 9 |
| Same `/api` contract | Task 4 (fetch helper) |
| Vitest for keys + fetch helper | Tasks 3–4 |
| Dashboard list stays RSC | No change to `app/dashboard/page.tsx` |
| Success: no redundant fetch when hydrated | Verified manually + React Query devtools optional |

**Placeholder scan:** None intentional; Task 5 instructs removing duplicate `headers()` import during implementation.

**Type consistency:** `TopicRow` and `NewsletterDetailPayload` live in `fetch-newsletter-detail.ts`; `topics-editor` should import types from there or re-export to avoid divergent shapes.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-04-tanstack-query-hydration.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach do you want?**
