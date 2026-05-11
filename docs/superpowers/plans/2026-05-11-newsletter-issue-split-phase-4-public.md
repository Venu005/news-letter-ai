# Phase 4 — Public Surface (Archive + Per-Issue Page)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make published issues end-user-visible. `/p/[slug]` shows the newsletter name, tagline, subscribe form, and a list of published issues. A new `/p/[slug]/i/[issueSlug]` route renders the issue's Markdown body. Clean up the misnamed placeholder route.

**Architecture:** Both public pages are server components — they read directly from Prisma using the public ownership rule (any `PUBLISHED` issue is visible to anyone who knows the slug). Markdown rendering uses `streamdown` (already a dependency) for parity with the in-app draft display. Drafts (non-`PUBLISHED` issues) return 404 on the per-issue page.

**Spec sections covered:** §8 (Public Surface), §8.2 (routing cleanup), §10 (final affected files).

**Depends on:** Phase 3 (publish UI sets `Issue.slug` and `publishedAt`).

**After this phase:** Feature is shippable. End-to-end flow works: create newsletter → publish article → subscriber discovers it on `/p/[slug]` → reads it on `/p/[slug]/i/[issueSlug]`.

---

## File structure (this phase)

```
Create:
- app/p/[slug]/issues-archive.tsx                  client list (or server, see Task 2)
- app/p/[slug]/i/[issueSlug]/page.tsx              public issue page
- app/p/[slug]/i/[issueSlug]/issue-markdown.tsx    client-side Markdown wrapper
- lib/query/fetch-public-issue.ts                  shared shape (used by per-issue page if we add JS-side hydration; otherwise optional)

Modify:
- app/p/[slug]/page.tsx                            add archive list, swap niche→name

Delete:
- app/p/[slug]/[issueSlug]/                        empty placeholder route dir
```

If the read of `lib/query/fetch-public-issue.ts` doesn't end up being needed (Task 3 demonstrates the per-issue page can use Prisma directly), skip its creation. The task below marks it optional.

---

## Task 1: Delete the empty placeholder route

The directory `app/p/[slug]/[issueSlug]/` was scaffolded earlier but its shape collides with the intended `/p/[slug]/i/[issueSlug]` structure. Remove it before adding the real route to avoid Next.js route-conflict surprises.

- [ ] **Step 1: Confirm it's empty, then delete**

```bash
ls -la app/p/[slug]/[issueSlug]
rmdir app/p/[slug]/[issueSlug]
```

If `ls` shows any files, stop and investigate — the placeholder may have been filled by someone else; don't blow it away.

- [ ] **Step 2: Commit**

```bash
git add app/p/[slug]
git commit -m "chore(public): remove empty [issueSlug] placeholder route"
```

---

## Task 2: Public newsletter page lists published issues

`/p/[slug]` already exists and renders name/tagline plus the subscribe form. Add a "Published" section underneath. Continue using server-side Prisma (no client query needed — this is a static-ish page that doesn't change while a visitor is on it).

**Files:**
- Modify: `app/p/[slug]/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "./subscribe-form";

export default async function PublicNewsletterPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      tagline: true,
      issues: {
        where: { status: "PUBLISHED", slug: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { id: true, slug: true, title: true, niche: true, publishedAt: true },
      },
    },
  });
  if (!newsletter?.slug) notFound();

  const publishedIssues = newsletter.issues;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-2xl">{newsletter.name}</CardTitle>
          {newsletter.tagline ? (
            <CardDescription>{newsletter.tagline}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          <SubscribeForm slug={newsletter.slug} />
        </CardContent>
      </Card>

      {publishedIssues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issues yet.</p>
      ) : (
        <section className="flex flex-col gap-intel-stack-md">
          <h2 className="orchestra-heading text-xl font-normal text-foreground">
            Published
          </h2>
          <ul className="flex flex-col gap-intel-stack-sm">
            {publishedIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/p/${newsletter.slug}/i/${issue.slug}`}
                  className="block rounded-md border border-black/10 p-4 hover:bg-black/[0.02]"
                >
                  <div className="text-base font-medium text-foreground">
                    {issue.title ?? issue.niche}
                  </div>
                  {issue.publishedAt ? (
                    <div className="text-xs text-muted-foreground">
                      {issue.publishedAt.toLocaleDateString()}
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify the page loads**

```bash
npm run dev
```

Browse to `http://localhost:3000/p/<slug-of-a-newsletter-with-a-published-issue>`. Expected:

- Card with newsletter name and tagline
- Subscribe form
- "Published" section listing the issue with its title and date
- Link to `/p/<slug>/i/<issue-slug>` (which 404s until Task 3)

If the newsletter has zero published issues, expect the "No issues yet." line under the card.

- [ ] **Step 3: Commit**

```bash
git add app/p/[slug]/page.tsx
git commit -m "feat(public): list published issues on /p/[slug]"
```

---

## Task 3: Per-issue public page

A new route at `/p/[slug]/i/[issueSlug]/page.tsx`. Renders the issue's Markdown body with `streamdown`. Non-`PUBLISHED` issues 404.

**Files:**
- Create: `app/p/[slug]/i/[issueSlug]/page.tsx`
- Create: `app/p/[slug]/i/[issueSlug]/issue-markdown.tsx`

- [ ] **Step 1: Write the client-side Markdown wrapper**

Streamdown is a React component already in this project's dependencies; its named export is `Streamdown` (verified against `node_modules/streamdown/dist/index.d.ts`). Wrapping it in a tiny client component keeps the server page server-renderable while the Markdown widget stays interactive (code highlighting via Shiki, etc.). Use `mode="static"` because the published issue is not streaming.

`app/p/[slug]/i/[issueSlug]/issue-markdown.tsx`:

```tsx
"use client";

import { Streamdown } from "streamdown";

export function IssueMarkdown({ source }: { source: string }) {
  return (
    <article className="prose prose-neutral max-w-none">
      <Streamdown mode="static">{source}</Streamdown>
    </article>
  );
}
```

- [ ] **Step 2: Write the page**

`app/p/[slug]/i/[issueSlug]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { SubscribeForm } from "../../subscribe-form";
import { IssueMarkdown } from "./issue-markdown";

export default async function PublicIssuePage(props: {
  params: Promise<{ slug: string; issueSlug: string }>;
}) {
  const { slug, issueSlug } = await props.params;

  const newsletter = await prisma.newsletter.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      tagline: true,
    },
  });
  if (!newsletter?.slug) notFound();

  const issue = await prisma.issue.findFirst({
    where: {
      newsletter: { slug },
      slug: issueSlug,
      status: "PUBLISHED",
    },
    select: {
      title: true,
      niche: true,
      finalDraft: true,
      publishedAt: true,
    },
  });
  if (!issue || !issue.finalDraft) notFound();

  const title = issue.title ?? issue.niche;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-intel-stack-lg px-intel-margin py-intel-stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-intel-stack-sm">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/p/${newsletter.slug}`}>← {newsletter.name}</Link>
        </Button>
        {issue.publishedAt ? (
          <span className="text-xs text-muted-foreground">
            Published {issue.publishedAt.toLocaleDateString()}
          </span>
        ) : null}
      </div>

      <header className="space-y-intel-stack-sm">
        <h1 className="orchestra-heading text-3xl font-normal text-foreground">
          {title}
        </h1>
      </header>

      <IssueMarkdown source={issue.finalDraft} />

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-lg">
            Subscribe to {newsletter.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubscribeForm slug={newsletter.slug} />
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify draft issues 404**

```bash
sqlite3 dev.db "SELECT i.id, n.slug AS nslug, i.slug AS islug, i.status FROM Issue i JOIN Newsletter n ON n.id = i.newsletterId WHERE i.status != 'PUBLISHED' LIMIT 3;"
```

Pick one drafting/reviewing issue and attempt to visit `/p/<nslug>/i/<islug>` — but note that a non-PUBLISHED issue has `slug=NULL`, so the URL would have `null` literally. The query in `page.tsx` filters by `status='PUBLISHED'`, so even if a visitor crafted a URL guessing a slug, they'd get a 404. To verify defensively, visit `/p/<valid-newsletter-slug>/i/does-not-exist` and confirm a 404 page.

- [ ] **Step 4: Verify the build**

```bash
npx tsc --noEmit
npm run build
```

Expected: 0 type errors; build succeeds.

- [ ] **Step 5: Visit the live page**

In a browser, navigate to `/p/<newsletter-slug>` and click the published issue link. Expected: Markdown body renders with headings, lists, and links. The "Subscribe" card at the bottom uses the same form as the parent page.

- [ ] **Step 6: Commit**

```bash
git add app/p/[slug]/i
git commit -m "feat(public): per-issue page renders Markdown with streamdown"
```

---

## Task 4: Final end-to-end verification

- [ ] **Step 1: From scratch flow**

In a browser, signed in:

1. `/dashboard` → "Create newsletter" → enter "Phase 4 Test" → redirected to `/dashboard/newsletter/<id>`.
2. Edit tagline to "Verifying end-to-end" → Save.
3. "Create an article" → enter "newsletter ai milestones" → wait for research (~30–60s).
4. Approve at least one topic → "Continue to draft".
5. "Generate draft" → wait → "Publish".
6. From the newsletter page, click "Public link".
7. Confirm the article renders at `/p/phase-4-test/i/<slug>`. Confirm the parent page `/p/phase-4-test` lists it under "Published".

- [ ] **Step 2: From the spec, walk the success criteria once more**

| Spec §2 success criterion | Where verified |
| --- | --- |
| Multiple issues per newsletter | Created two issues in Step 1 (repeat step 3 if needed) |
| Subscribers attach to newsletter | Existing `/api/public/subscribe` accepts an email against the newsletter slug, untouched |
| Existing data preserved | Phase 1 `node scripts/verify-issue-migration.mjs` passed |
| Published issue stable URL | Step 6 above |
| Mastra agents per-issue | Phase 2 Task 7 + Task 4 use issue-scoped memory |

- [ ] **Step 3: Run the full test suite**

```bash
npm run test
```

Expected: all green.

- [ ] **Step 4: Final build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 5: Final commit (if anything was tweaked)**

```bash
git add -A
git diff --cached --stat
git commit -m "chore: end-to-end smoke pass for newsletter/issue split"
```

If `git diff --cached --stat` shows zero changes, skip the commit.

---

## Phase 4 verification gate

- [ ] `/p/[slug]` shows the published issues list.
- [ ] `/p/[slug]/i/[issueSlug]` renders Markdown for PUBLISHED issues and 404s for everything else.
- [ ] `npm run test && npm run build` both succeed.
- [ ] The end-to-end walkthrough in Task 4 Step 1 completes without manual fixes.

The feature is now shippable. See spec §12 for the follow-up list (real subscriber fan-out, RSS, pagination, etc).

---

## Out of scope for this phase

- Real subscriber fan-out on publish (still single-recipient test email).
- Pagination on `/p/[slug]` when there are many issues.
- RSS feed at `/p/[slug]/rss.xml`.
- Cover image per issue.
- Edit/republish flow.
