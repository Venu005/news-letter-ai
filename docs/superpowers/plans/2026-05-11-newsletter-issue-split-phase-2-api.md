# Phase 2 — API Layer & Mastra Rewiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the newsletter-scoped API routes with issue-scoped routes. Split the "create newsletter" path into two endpoints (name-only create + niche-only article create). Rewire Mastra agents to per-issue memory binding. Add small server helpers (`allocateIssueSlug`, `extractTitleFromMarkdown`) under `lib/`.

**Architecture:** Each issue-scoped route loads the issue, joins through `Newsletter.userId` to enforce ownership, and returns the wire-shape types defined in `lib/types/*` from Phase 1. Mastra agents are unchanged; only the memory keys flip from newsletter id/thread to issue id/thread.

**Spec sections covered:** §6 (API Contract), §9 (Mastra Integration), parts of §10.

**Depends on:** Phase 1 (`prisma migrate dev` applied, `lib/types/*` present).

**After this phase:** `npm run build` passes. Every new endpoint can be exercised via curl. Existing UI (dashboard pages, draft editor, topics editor) still references the deleted/renamed routes and will be broken — Phase 3 fixes it.

---

## File structure (this phase)

```
Create:
- app/api/newsletters/route.ts                      POST: create newsletter (name)
- app/api/newsletters/[id]/issues/route.ts          POST: create issue (niche) + run search agent
- app/api/issues/[id]/route.ts                      GET/PATCH issue
- app/api/issues/[id]/topics/route.ts               GET/PATCH topics for issue
- app/api/issues/[id]/draft/route.ts                POST: generate draft (writer + editor agents)
- app/api/issues/[id]/publish/route.ts              POST: publish (slug + Resend)
- lib/issue-owner.ts                                ownership helper for issues
- lib/markdown-title.ts                             extractTitleFromMarkdown
- lib/markdown-title.test.ts                        unit test for extractTitleFromMarkdown
- lib/slug.test.ts                                  unit test for allocateIssueSlug (add if missing)

Modify:
- app/api/newsletters/[id]/route.ts                 drop finalDraft from PATCH; GET returns issues list
- lib/slug.ts                                       add allocateIssueSlug
- lib/newsletter-owner.ts                           keep for ownership-check reuse in Phase 3 if needed

Delete:
- app/api/generate-topics/route.ts
- app/api/generate-draft/route.ts
- app/api/publish/route.ts
- app/api/newsletters/[id]/topics/route.ts          (moves to /api/issues/[id]/topics)
```

---

## Task 1: Helper — `extractTitleFromMarkdown`

The draft endpoint and the publish endpoint both need this. Build it test-first.

**Files:**
- Create: `lib/markdown-title.ts`
- Create: `lib/markdown-title.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/markdown-title.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { extractTitleFromMarkdown } from "./markdown-title";

describe("extractTitleFromMarkdown", () => {
  it("returns the first ATX H1 trimmed", () => {
    expect(extractTitleFromMarkdown("# Heat pumps go mainstream\n\nBody")).toBe(
      "Heat pumps go mainstream",
    );
  });

  it("ignores leading whitespace and blank lines", () => {
    expect(extractTitleFromMarkdown("\n\n   # Hello world  \n")).toBe("Hello world");
  });

  it("falls back when no H1 exists", () => {
    expect(extractTitleFromMarkdown("## Subhead only\n\nBody", "fallback")).toBe(
      "fallback",
    );
  });

  it("returns null when no H1 and no fallback", () => {
    expect(extractTitleFromMarkdown("just a paragraph")).toBeNull();
  });

  it("does not match ##, ###, etc as H1", () => {
    expect(extractTitleFromMarkdown("## Not an H1\n# Real H1")).toBe("Real H1");
  });

  it("strips trailing # characters (closed ATX)", () => {
    expect(extractTitleFromMarkdown("# Title ##")).toBe("Title");
  });

  it("returns null on empty/whitespace input", () => {
    expect(extractTitleFromMarkdown("")).toBeNull();
    expect(extractTitleFromMarkdown("   \n  ")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/markdown-title.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `extractTitleFromMarkdown`**

Create `lib/markdown-title.ts`:

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/markdown-title.test.ts
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/markdown-title.ts lib/markdown-title.test.ts
git commit -m "feat(lib): extractTitleFromMarkdown helper (first ATX H1)"
```

---

## Task 2: Helper — `allocateIssueSlug` in `lib/slug.ts`

Mirrors `allocateNewsletterSlug` but scopes uniqueness checks to a single newsletter.

**Files:**
- Modify: `lib/slug.ts`
- Create: `lib/slug.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/slug.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { allocateIssueSlug } from "./slug";

describe("allocateIssueSlug", () => {
  it("returns the slugified base on first attempt when free", async () => {
    const slug = await allocateIssueSlug("Heat pumps go mainstream", async () => false);
    expect(slug).toBe("heat-pumps-go-mainstream");
  });

  it("retries with a nanoid suffix on collision", async () => {
    let calls = 0;
    const slug = await allocateIssueSlug("Hello", async (candidate) => {
      calls += 1;
      return candidate === "hello";
    });
    expect(slug.startsWith("hello-")).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("falls back to 'issue' base when input has no usable characters", async () => {
    const slug = await allocateIssueSlug("!!", async () => false);
    expect(slug).toBe("issue");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/slug.test.ts
```

Expected: FAIL — `allocateIssueSlug` is not exported.

- [ ] **Step 3: Add the helper**

Append to `lib/slug.ts`:

```typescript
function slugifyIssueSegment(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return s.length >= 1 ? s : "issue";
}

/**
 * Allocate a slug unique within a single newsletter. `exists(candidate)`
 * must return true when `candidate` is already taken inside that newsletter.
 */
export async function allocateIssueSlug(
  title: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyIssueSegment(title);
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${nanoid(6)}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("Could not allocate issue slug");
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/slug.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/slug.ts lib/slug.test.ts
git commit -m "feat(slug): allocateIssueSlug for per-newsletter issue slug allocation"
```

---

## Task 3: Helper — `issueBelongsToUser` in `lib/issue-owner.ts`

Mirrors `lib/newsletter-owner.ts` but resolves ownership through `Issue → Newsletter → userId`.

**Files:**
- Create: `lib/issue-owner.ts`

- [ ] **Step 1: Write the helper**

Create `lib/issue-owner.ts`:

```typescript
import { prisma } from "@/lib/prisma";

/**
 * Returns the issue's `newsletterId` when this issue exists and the parent
 * newsletter belongs to `internalUserId`; otherwise returns `null`.
 *
 * Callers use the returned newsletterId to load related data (subscribers,
 * newsletter name for email subjects, etc.) without a second query.
 */
export async function issueOwnedBy(
  issueId: string,
  internalUserId: string,
): Promise<{ newsletterId: string } | null> {
  const row = await prisma.issue.findFirst({
    where: { id: issueId, newsletter: { userId: internalUserId } },
    select: { newsletterId: true },
  });
  return row ? { newsletterId: row.newsletterId } : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/issue-owner.ts
git commit -m "feat(lib): issueOwnedBy ownership helper"
```

---

## Task 4: Split `POST /api/generate-topics` into two endpoints

`POST /api/newsletters` (create publication, name only, no research) and `POST /api/newsletters/[id]/issues` (create issue, run searchAgent).

**Files:**
- Create: `app/api/newsletters/route.ts`
- Create: `app/api/newsletters/[id]/issues/route.ts`
- Delete: `app/api/generate-topics/route.ts`

- [ ] **Step 1: Write `app/api/newsletters/route.ts`**

Create `app/api/newsletters/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { allocateNewsletterSlug } from "@/lib/slug";

const createNewsletterSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: Request) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const json = await req.json().catch(() => null);
  const parsed = createNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const slug = await allocateNewsletterSlug(parsed.data.name, async (candidate) => {
    const row = await prisma.newsletter.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return !!row;
  });

  const newsletter = await prisma.newsletter.create({
    data: {
      name: parsed.data.name,
      slug,
      userId: authResult.userId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
```

- [ ] **Step 2: Write `app/api/newsletters/[id]/issues/route.ts`**

Create `app/api/newsletters/[id]/issues/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { newsletterBelongsToUser } from "@/lib/newsletter-owner";
import { prisma } from "@/lib/prisma";
import { parseTopicsJson } from "@/mastra/lib/topics-json";

const createIssueSchema = z.object({
  niche: z.string().trim().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id: newsletterId } = await ctx.params;
  const ok = await newsletterBelongsToUser(newsletterId, authResult.userId);
  if (!ok) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const threadId = randomUUID();

  const issue = await prisma.issue.create({
    data: {
      newsletterId,
      niche: parsed.data.niche,
      mastraThreadId: threadId,
      status: "RESEARCHING",
    },
    select: { id: true, niche: true, mastraThreadId: true },
  });

  const agent = mastra.getAgent("searchAgent");
  const memoryOpts = { thread: threadId, resource: issue.id } as const;

  const researchResult = await agent.generate(
    `Research niche: "${issue.niche}". Gather diverse stories, cite real URLs from tools, then emit ONLY the JSON topic array described in your instructions.`,
    { memory: memoryOpts, maxSteps: 24 },
  );

  const topicsPayload = parseTopicsJson(researchResult.text);

  await prisma.topic.createMany({
    data: topicsPayload.map((topic) => ({
      title: topic.title,
      summary: topic.summary,
      sourceUrl: topic.sourceUrl,
      issueId: issue.id,
      isApproved: true,
    })),
  });

  return NextResponse.json({ issueId: issue.id, threadId });
}
```

- [ ] **Step 3: Delete the old generate-topics route**

```bash
rm app/api/generate-topics/route.ts
rmdir app/api/generate-topics
```

- [ ] **Step 4: Verify the build still typechecks for these new files**

```bash
npx tsc --noEmit 2>&1 | grep -E "app/api/newsletters/route\.ts|app/api/newsletters/\[id\]/issues/route\.ts" || echo "new routes typecheck clean"
```

Expected: `new routes typecheck clean`. (Errors elsewhere are expected until later tasks.)

- [ ] **Step 5: Commit**

```bash
git add app/api/newsletters/route.ts app/api/newsletters/[id]/issues/route.ts
git add app/api/generate-topics
git commit -m "feat(api): split newsletter creation from issue creation"
```

---

## Task 5: Adapt `GET/PATCH /api/newsletters/[id]/route.ts` to the new shape

GET returns `{ newsletter, issues }`. PATCH no longer accepts `finalDraft`.

**Files:**
- Modify: `app/api/newsletters/[id]/route.ts`

- [ ] **Step 1: Replace the file contents**

Replace `app/api/newsletters/[id]/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import type { IssueStatus } from "@/lib/types/issue";

const patchNewsletterSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  tagline: z.string().trim().max(280).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const newsletter = await prisma.newsletter.findFirst({
    where: { id, userId: authResult.userId },
    include: {
      issues: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          newsletterId: true,
          niche: true,
          title: true,
          status: true,
          slug: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
    issues: newsletter.issues.map((i) => ({
      id: i.id,
      newsletterId: i.newsletterId,
      niche: i.niche,
      title: i.title,
      status: i.status as IssueStatus,
      slug: i.slug,
      publishedAt: i.publishedAt ? i.publishedAt.toISOString() : null,
      updatedAt: i.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (body.name === undefined && body.tagline === undefined) {
    return NextResponse.json({ error: "At least one field required." }, { status: 400 });
  }

  const owned = await prisma.newsletter.findFirst({
    where: { id, userId: authResult.userId },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  const newsletter = await prisma.newsletter.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.tagline !== undefined && { tagline: body.tagline }),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/newsletters/[id]/route.ts
git commit -m "refactor(api): newsletter detail returns issues list, drops finalDraft"
```

---

## Task 6: Issue detail + topics endpoints

Move `/api/newsletters/[id]/topics` to `/api/issues/[id]/topics`. Add `/api/issues/[id]` (GET issue + topics, PATCH `finalDraft`).

**Files:**
- Create: `app/api/issues/[id]/route.ts`
- Create: `app/api/issues/[id]/topics/route.ts`
- Delete: `app/api/newsletters/[id]/topics/route.ts`

- [ ] **Step 1: Write `app/api/issues/[id]/route.ts`**

Create `app/api/issues/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { extractTitleFromMarkdown } from "@/lib/markdown-title";
import { prisma } from "@/lib/prisma";
import type { IssueDetail, IssueStatus } from "@/lib/types/issue";
import type { Topic } from "@/lib/types/topic";

const patchIssueSchema = z.object({
  finalDraft: z.string().optional(),
});

function mapIssue(row: {
  id: string;
  newsletterId: string;
  niche: string;
  title: string | null;
  status: string;
  slug: string | null;
  publishedAt: Date | null;
  finalDraft: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IssueDetail {
  return {
    id: row.id,
    newsletterId: row.newsletterId,
    niche: row.niche,
    title: row.title,
    status: row.status as IssueStatus,
    slug: row.slug,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    finalDraft: row.finalDraft,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTopic(row: {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
}): Topic {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    isApproved: row.isApproved,
    issueId: row.issueId,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { topics: { orderBy: { title: "asc" } } },
  });
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  return NextResponse.json({
    issue: mapIssue(issue),
    topics: issue.topics.map(mapTopic),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchIssueSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.finalDraft === undefined) {
    return NextResponse.json({ error: "At least one field required." }, { status: 400 });
  }

  const issueBefore = await prisma.issue.findUnique({
    where: { id },
    select: { niche: true, status: true },
  });
  if (!issueBefore) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const title =
    extractTitleFromMarkdown(parsed.data.finalDraft, issueBefore.niche) ?? issueBefore.niche;

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      finalDraft: parsed.data.finalDraft,
      title,
    },
    include: { topics: { orderBy: { title: "asc" } } },
  });

  return NextResponse.json({
    issue: mapIssue(issue),
    topics: issue.topics.map(mapTopic),
  });
}
```

- [ ] **Step 2: Write `app/api/issues/[id]/topics/route.ts`**

This is the topics endpoint, rewritten from `app/api/newsletters/[id]/topics/route.ts`, scoped to issues.

Create `app/api/issues/[id]/topics/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { prisma } from "@/lib/prisma";
import type { Topic } from "@/lib/types/topic";

const topicRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  summary: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  isApproved: z.boolean().optional(),
});

const patchTopicsSchema = z.object({
  topics: z.array(topicRowSchema).min(1),
});

function mapTopic(row: {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
}): Topic {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    isApproved: row.isApproved,
    issueId: row.issueId,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const topics = await prisma.topic.findMany({
    where: { issueId: id },
    orderBy: { title: "asc" },
  });
  return NextResponse.json({ topics: topics.map(mapTopic) });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id: issueId } = await ctx.params;
  const owner = await issueOwnedBy(issueId, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchTopicsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.topic.findMany({
    where: { issueId },
    select: { id: true },
  });
  const allowed = new Set(existing.map((t) => t.id));
  for (const row of parsed.data.topics) {
    if (!allowed.has(row.id)) {
      return NextResponse.json(
        { error: `Topic ${row.id} does not belong to this issue.` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(
    parsed.data.topics.map((row) =>
      prisma.topic.update({
        where: { id: row.id },
        data: {
          ...(row.title !== undefined && { title: row.title }),
          ...(row.summary !== undefined && { summary: row.summary }),
          ...(row.sourceUrl !== undefined && { sourceUrl: row.sourceUrl }),
          ...(row.isApproved !== undefined && { isApproved: row.isApproved }),
        },
      }),
    ),
  );

  const topics = await prisma.topic.findMany({
    where: { issueId },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ topics: topics.map(mapTopic) });
}
```

- [ ] **Step 3: Delete the old newsletter-scoped topics route**

```bash
rm app/api/newsletters/[id]/topics/route.ts
rmdir app/api/newsletters/[id]/topics
```

- [ ] **Step 4: Commit**

```bash
git add app/api/issues/[id]/route.ts app/api/issues/[id]/topics/route.ts app/api/newsletters/[id]/topics
git commit -m "feat(api): issue-scoped GET/PATCH + topics endpoint"
```

---

## Task 7: Draft generation moves to `/api/issues/[id]/draft`

**Files:**
- Create: `app/api/issues/[id]/draft/route.ts`
- Delete: `app/api/generate-draft/route.ts`

- [ ] **Step 1: Write `app/api/issues/[id]/draft/route.ts`**

Create `app/api/issues/[id]/draft/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { mastra } from "@/mastra/index";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { extractTitleFromMarkdown } from "@/lib/markdown-title";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireInternalUserId();
    if (!authResult.ok) return authResult.response;

    const { id } = await ctx.params;
    const owner = await issueOwnedBy(id, authResult.userId);
    if (!owner) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        topics: {
          where: { isApproved: true },
          orderBy: { title: "asc" },
        },
      },
    });
    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }
    if (!issue.topics.length) {
      return NextResponse.json(
        { error: "No approved topics available for this issue." },
        { status: 400 },
      );
    }

    await prisma.issue.update({
      where: { id },
      data: { status: "DRAFTING" },
    });

    const outline = issue.topics
      .map(
        (topic, index) =>
          `${index + 1}. ${topic.title}\n   Summary: ${topic.summary}\n   Source: ${topic.sourceUrl}`,
      )
      .join("\n");

    const writer = mastra.getAgent("writerAgent");
    const editor = mastra.getAgent("editorAgent");
    const memoryOpts = { thread: issue.mastraThreadId, resource: issue.id } as const;

    const writerResult = await writer.generate(
      `Approved article outline:\n${outline}\n\nUsing ONLY prior research stored in this Mastra thread (plus this outline), draft the full Markdown article with mandatory inline citations.`,
      { memory: memoryOpts, maxSteps: 30 },
    );

    const editorResult = await editor.generate(
      `Writer draft to supervise:\n\n${writerResult.text}`,
      { memory: memoryOpts, maxSteps: 20 },
    );

    const title = extractTitleFromMarkdown(editorResult.text, issue.niche) ?? issue.niche;

    await prisma.issue.update({
      where: { id },
      data: {
        finalDraft: editorResult.text,
        status: "REVIEWING",
        title,
      },
    });

    return NextResponse.json({ draft: editorResult.text, title });
  } catch (error) {
    console.error("[issues/draft]", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error generating draft.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Delete the old route**

```bash
rm app/api/generate-draft/route.ts
rmdir app/api/generate-draft
```

- [ ] **Step 3: Commit**

```bash
git add app/api/issues/[id]/draft/route.ts app/api/generate-draft
git commit -m "feat(api): per-issue draft generation (writer + editor agents)"
```

---

## Task 8: Publish moves to `/api/issues/[id]/publish`

The new route generates `Issue.slug` from the resolved title on success.

**Files:**
- Create: `app/api/issues/[id]/publish/route.ts`
- Delete: `app/api/publish/route.ts`

- [ ] **Step 1: Write `app/api/issues/[id]/publish/route.ts`**

Create `app/api/issues/[id]/publish/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { prisma } from "@/lib/prisma";
import { allocateIssueSlug } from "@/lib/slug";

const RESEND_SEND_URL = "https://api.resend.com/emails";

const publishBodySchema = z.object({
  to: z.string().email().optional(),
});

function truncateSubject(raw: string, max = 78): string {
  const t = raw.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true; messageId?: string } | { ok: false }> {
  let response: Response;
  try {
    response = await fetch(RESEND_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
  } catch {
    return { ok: false };
  }

  if (!response.ok) {
    console.error("Resend publish failed:", response.status);
    return { ok: false };
  }
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  const messageId = typeof payload?.id === "string" ? payload.id : undefined;
  return { ok: true, messageId };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Publishing is not configured on this server." },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = publishBodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let recipient = parsed.data.to?.trim();
  if (!recipient) recipient = process.env.NEWSLETTER_PUBLISH_TO?.trim();
  if (!recipient) {
    return NextResponse.json(
      {
        error:
          'No recipient configured. Set NEWSLETTER_PUBLISH_TO or send a valid "to" address.',
      },
      { status: 400 },
    );
  }

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { newsletter: { select: { name: true } } },
  });
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }
  if (issue.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "This issue is already published." },
      { status: 409 },
    );
  }
  if (issue.status === "RESEARCHING") {
    return NextResponse.json(
      { error: "Finish researching and drafting before publishing." },
      { status: 400 },
    );
  }
  if (issue.status !== "DRAFTING" && issue.status !== "REVIEWING") {
    return NextResponse.json(
      { error: "Issue cannot be published in its current state." },
      { status: 400 },
    );
  }

  const bodyText = issue.finalDraft?.trim() ?? "";
  if (!bodyText) {
    return NextResponse.json(
      { error: "Draft is empty. Save or generate a draft before publishing." },
      { status: 400 },
    );
  }

  const titleSource = issue.title?.trim() || issue.niche;

  const slug = await allocateIssueSlug(titleSource, async (candidate) => {
    const row = await prisma.issue.findFirst({
      where: { newsletterId: issue.newsletterId, slug: candidate },
      select: { id: true },
    });
    return !!row;
  });

  const subject = truncateSubject(`${issue.newsletter.name}: ${titleSource}`);
  const sent = await sendViaResend({
    apiKey,
    from,
    to: recipient,
    subject,
    text: bodyText,
  });
  if (!sent.ok) {
    return NextResponse.json(
      { error: "Could not send email. Try again later." },
      { status: 502 },
    );
  }

  await prisma.issue.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      slug,
      title: titleSource,
    },
  });

  return NextResponse.json({
    ok: true,
    slug,
    ...(sent.messageId !== undefined ? { messageId: sent.messageId } : {}),
  });
}
```

- [ ] **Step 2: Delete the old route**

```bash
rm app/api/publish/route.ts
rmdir app/api/publish
```

- [ ] **Step 3: Commit**

```bash
git add app/api/issues/[id]/publish/route.ts app/api/publish
git commit -m "feat(api): per-issue publish endpoint with slug generation"
```

---

## Task 9: Audit downstream Prisma callers for dropped field references

Some files outside `app/api/` reference fields that moved or were dropped:
- `lib/subscribe-email.ts` — read `displayName` or `niche` of the newsletter for email templates.
- `lib/clerk-webhook-user.ts`, `lib/user-sync.ts`, `app/api/public/subscribe/route.ts`, `app/api/webhooks/clerk/**` — sanity check for any `newsletter.niche` / `newsletter.displayName` reads.

- [ ] **Step 1: Find all references**

```bash
rg "newsletter\.(niche|displayName|finalDraft|mastraThreadId|status)" lib/ app/ --type ts -n
rg "topic\.newsletterId|where: \{ newsletterId" lib/ app/ --type ts -n
```

- [ ] **Step 2: For each hit, replace as follows**

| Pattern | Replacement |
| --- | --- |
| `newsletter.displayName` or `newsletter.niche` (publication context) | `newsletter.name` |
| `newsletter.finalDraft` | remove or move to `issue.finalDraft` (almost certainly only in subscribe-email; if subscribe-email referenced `finalDraft`, that was wrong — drop it) |
| `newsletter.status` | remove unless it's specifically about issue status, in which case load the issue |
| `newsletter.mastraThreadId` | remove unless it's about a specific issue thread (only `app/api/issues/[id]/*` should ever read this) |
| `prisma.topic.findMany({ where: { newsletterId } })` | move query into an issue-scoped context, replace `newsletterId` with `issueId` |

After each file's edits, `npx tsc --noEmit` should report fewer errors. The remaining errors will all be in `app/dashboard/**` and `components/**` (frontend), which Phase 3 fixes.

- [ ] **Step 3: Commit (one commit per file that you touched)**

```bash
git add lib/<file>.ts
git commit -m "refactor(<area>): replace dropped newsletter fields after model split"
```

---

## Task 10: Smoke-test the new endpoints

Run the dev server in a separate terminal and exercise each endpoint with curl. (Skip if you're confident; the manual click-through in Phase 3 will also exercise these.)

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Wait for `Local: http://localhost:3000`.

- [ ] **Step 2: Authenticate via the browser**

Open `http://localhost:3000/sign-in`, sign in, copy the `__session` cookie value from devtools. Save to a temp env var:

```bash
export SESSION_COOKIE="__session=<value>"
```

- [ ] **Step 3: Create a newsletter**

```bash
curl -s -X POST http://localhost:3000/api/newsletters \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{"name":"Test Newsletter"}' | jq
```

Expected: `{ "newsletter": { "id": "<uuid>", "name": "Test Newsletter", "slug": "test-newsletter", ... } }`.

Save the id:

```bash
export NEWSLETTER_ID=<paste-id>
```

- [ ] **Step 4: Create an issue (this will hit the search agent — slow)**

```bash
curl -s -X POST "http://localhost:3000/api/newsletters/$NEWSLETTER_ID/issues" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{"niche":"climate tech this week"}' | jq
```

Expected: `{ "issueId": "<uuid>", "threadId": "<uuid>" }`. Takes 30–60s depending on Tavily/OpenAI latency.

```bash
export ISSUE_ID=<paste-id>
```

- [ ] **Step 5: Read issue + topics**

```bash
curl -s "http://localhost:3000/api/issues/$ISSUE_ID" \
  -H "Cookie: $SESSION_COOKIE" | jq '.issue.status, .topics | length'
```

Expected: `"RESEARCHING"` and a non-zero topics count.

- [ ] **Step 6: Generate a draft**

```bash
curl -s -X POST "http://localhost:3000/api/issues/$ISSUE_ID/draft" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{}' | jq '.title'
```

Expected: a non-null title string. Takes 60–120s.

- [ ] **Step 7: Publish (requires RESEND_API_KEY + RESEND_FROM + NEWSLETTER_PUBLISH_TO env)**

```bash
curl -s -X POST "http://localhost:3000/api/issues/$ISSUE_ID/publish" \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION_COOKIE" \
  -d '{}' | jq
```

Expected: `{ "ok": true, "slug": "<slugified-title>" }`. The email arrives at NEWSLETTER_PUBLISH_TO.

- [ ] **Step 8: Confirm DB state**

```bash
sqlite3 dev.db "SELECT status, slug, publishedAt FROM Issue WHERE id='$ISSUE_ID';"
```

Expected: `PUBLISHED|<slug>|<timestamp>`.

---

## Phase 2 verification gate

- [ ] `npx vitest run lib/markdown-title.test.ts lib/slug.test.ts` — 10 passed.
- [ ] `npx tsc --noEmit 2>&1 | rg "^(app/api|lib)/" | wc -l` returns `0` (server-side compiles).
- [ ] `npm run build` either passes outright or fails only with errors in `app/dashboard/**` and `components/**` (frontend — Phase 3).
- [ ] Smoke test Tasks 10.3–10.8 succeed (skip if you trust the wiring; Phase 3 will exercise everything via the UI).

Hand off to Phase 3 (`2026-05-11-newsletter-issue-split-phase-3-dashboard.md`).

---

## Out of scope for this phase

- Query/mutation library files (Phase 3).
- Dashboard pages, forms, route restructuring (Phase 3).
- Public archive and issue rendering (Phase 4).
- Real fan-out to subscribers on publish (deferred follow-up).
