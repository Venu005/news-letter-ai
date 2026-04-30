# Newsletter Multi-Route UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the multi-route newsletter UI (`/` → topics → draft) and three REST endpoints (`GET`/`PATCH` newsletter, batch `PATCH` topics) per `docs/superpowers/specs/2026-04-30-newsletter-multi-route-ui-design.md`.

**Architecture:** Next.js App Router pages call route handlers under `app/api/newsletters/`. Prisma (`@/lib/prisma`) loads and updates `Newsletter` / `Topic`. Interactive editing lives in `"use client"` components; shells can stay server components where trivial.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Prisma 7, Zod 4.

---

### File map (create / modify)

| Path | Role |
|------|------|
| `app/api/newsletters/[id]/route.ts` | `GET` newsletter + topics; `PATCH` `{ finalDraft }` |
| `app/api/newsletters/[id]/topics/route.ts` | `PATCH` batch topic updates |
| `app/page.tsx` | Home: niche form → `POST /api/generate-topics` → redirect |
| `app/newsletter/[id]/topics/page.tsx` | Topics shell |
| `app/newsletter/[id]/topics/topics-editor.tsx` | Client: load/save topics, navigate to draft |
| `app/newsletter/[id]/draft/page.tsx` | Draft shell |
| `app/newsletter/[id]/draft/draft-editor.tsx` | Client: generate draft, edit, save |
| `app/layout.tsx` | Optional: metadata title/description for product |

---

### Task 1: `GET` + `PATCH` `/api/newsletters/[id]`

**Files:**
- Create: `app/api/newsletters/[id]/route.ts`

- [ ] **Step 1: Implement `GET`**

Return `404` if newsletter missing. Serialize dates as ISO strings in JSON (NextResponse.json handles Date if you map explicitly — Prisma returns Date objects).

Shape:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { id },
    include: {
      topics: { orderBy: { title: "asc" } },
    },
  });
  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }
  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      niche: newsletter.niche,
      mastraThreadId: newsletter.mastraThreadId,
      status: newsletter.status,
      finalDraft: newsletter.finalDraft,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
    topics: newsletter.topics.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      sourceUrl: t.sourceUrl,
      isApproved: t.isApproved,
      newsletterId: t.newsletterId,
    })),
  });
}
```

- [ ] **Step 2: Implement `PATCH` (save `finalDraft`)**

Validate body with Zod:

```typescript
import { z } from "zod";

const patchNewsletterSchema = z.object({
  finalDraft: z.string(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  try {
    const newsletter = await prisma.newsletter.update({
      where: { id },
      data: { finalDraft: parsed.data.finalDraft },
    });
    return NextResponse.json({
      newsletter: {
        id: newsletter.id,
        niche: newsletter.niche,
        mastraThreadId: newsletter.mastraThreadId,
        status: newsletter.status,
        finalDraft: newsletter.finalDraft,
        createdAt: newsletter.createdAt.toISOString(),
        updatedAt: newsletter.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }
}
```

- [ ] **Step 3: Verify**

Run (replace `UUID` after creating a newsletter via UI or generate-topics):

```bash
curl -s "http://localhost:3000/api/newsletters/UUID" | head -c 400
```

Expected: JSON with `newsletter` and `topics` arrays.

```bash
pnpm run build
```

Expected: completes without TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/newsletters/[id]/route.ts
git commit -m "feat(api): GET/PATCH newsletter by id"
```

---

### Task 2: `PATCH` `/api/newsletters/[id]/topics`

**Files:**
- Create: `app/api/newsletters/[id]/topics/route.ts`

- [ ] **Step 1: Implement validation + updates**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: newsletterId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchTopicsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.topic.findMany({
    where: { newsletterId },
    select: { id: true },
  });
  const allowed = new Set(existing.map((t) => t.id));
  for (const row of parsed.data.topics) {
    if (!allowed.has(row.id)) {
      return NextResponse.json(
        { error: `Topic ${row.id} does not belong to this newsletter.` },
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
    where: { newsletterId },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary,
      sourceUrl: t.sourceUrl,
      isApproved: t.isApproved,
      newsletterId: t.newsletterId,
    })),
  });
}
```

- [ ] **Step 2: Verify**

```bash
pnpm run build
```

- [ ] **Step 3: Commit**

```bash
git add app/api/newsletters/[id]/topics/route.ts
git commit -m "feat(api): PATCH newsletter topics batch"
```

---

### Task 3: Home page — niche → generate topics → redirect

**Files:**
- Modify: `app/page.tsx`
- Create: `app/home-form.tsx` (client component keeps `page.tsx` thin — optional single file if preferred)

- [ ] **Step 1: Client form**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeForm() {
  const router = useRouter();
  const [niche, setNiche] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to generate topics.");
        return;
      }
      router.push(`/newsletter/${data.newsletterId}/topics`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        Niche
        <input
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-950"
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="e.g. climate tech"
          required
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading || !niche.trim()}
        className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Generating…" : "Generate topics"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

Use a simple centered layout with heading + `<HomeForm />` (import from `./home-form`). Remove starter Next/Vercel marketing content.

- [ ] **Step 3: Verify**

Manual: start dev server, submit niche, confirm redirect to `/newsletter/<uuid>/topics`.

```bash
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/home-form.tsx
git commit -m "feat(ui): home niche form and redirect to topics"
```

---

### Task 4: Topics page — load, edit, save, continue

**Files:**
- Create: `app/newsletter/[id]/topics/page.tsx`
- Create: `app/newsletter/[id]/topics/topics-editor.tsx`

- [ ] **Step 1: Server shell**

`page.tsx` passes `params.id` into client editor:

```tsx
import { TopicsEditor } from "./topics-editor";

export default async function TopicsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Topics
      </h1>
      <TopicsEditor newsletterId={id} />
    </div>
  );
}
```

- [ ] **Step 2: Client `TopicsEditor`**

Behavior:

1. `useEffect` → `GET /api/newsletters/[id]` — set rows + loading/error.
2. Local state mirrors topics; **Save changes** builds `{ topics: [...] }` with full current row values for each topic (simplest) or only changed fields — plan uses **send all rows** with `id`, `title`, `summary`, `sourceUrl`, `isApproved`.
3. **Continue to draft** → `router.push(/newsletter/${id}/draft)` only if `topics.some(t => t.isApproved)`.

Include link “Start over” → `/`.

Use semantic table or stacked cards; Tailwind only.

- [ ] **Step 3: Verify**

Refresh `/newsletter/[id]/topics` — data reloads. Toggle approve + save — reload confirms persistence.

```bash
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/newsletter/[id]/topics/
git commit -m "feat(ui): newsletter topics editor page"
```

---

### Task 5: Draft page — generate, edit, save

**Files:**
- Create: `app/newsletter/[id]/draft/page.tsx`
- Create: `app/newsletter/[id]/draft/draft-editor.tsx`

- [ ] **Step 1: Server shell**

Same pattern as topics: heading + `<DraftEditor newsletterId={id} />`.

- [ ] **Step 2: Client `DraftEditor`**

1. Load `GET /api/newsletters/[id]` — show `status` badge; seed textarea from `newsletter.finalDraft ?? ""`.
2. **Generate draft** → `POST /api/generate-draft` `{ newsletterId }` — on success set textarea from `data.draft`; surface `data.error` / status **400** message if no approved topics.
3. **Save draft** → `PATCH /api/newsletters/[id]` `{ finalDraft: text }`.

Disable buttons while respective requests run.

- [ ] **Step 3: Verify**

Full manual journey: home → topics → save → draft → generate → save → refresh draft page shows saved content.

```bash
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/newsletter/[id]/draft/
git commit -m "feat(ui): newsletter draft page"
```

---

### Task 6: Polish metadata & lint

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `metadata`**

```typescript
export const metadata: Metadata = {
  title: "Newsletter AI",
  description: "Generate and refine niche newsletters with AI assistance.",
};
```

- [ ] **Step 2: Lint**

```bash
pnpm run lint
```

Fix any new issues in touched files.

- [ ] **Step 3: Final build**

```bash
pnpm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "chore(ui): app metadata for newsletter flow"
```

---

## Verification checklist (manual)

- [ ] `/` → generate topics → lands on `/newsletter/[id]/topics`.
- [ ] Refresh topics page keeps data.
- [ ] Save topics + continue only when ≥1 approved.
- [ ] Draft generate + save + refresh restores `finalDraft`.
- [ ] Invalid `[id]` shows friendly error + link home (implement minimal `notFound` or error UI in editors when GET returns 404).

---

## Notes

- **UUID validation:** Route `[id]` accepts strings; rely on Prisma `findUnique` for existence.
- **Topic ids:** Plan uses `z.string().uuid()` — aligns with Prisma `@default(uuid())`.
- **Tests:** No repo test runner yet; verification is build + manual + optional curl. Add `node:test` or Vitest in a follow-up if desired.
