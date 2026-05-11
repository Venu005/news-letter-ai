# Newsletter / Issue Split — Design Spec

## 1. Purpose

The current `Newsletter` model conflates two things: a **publication** (long-lived: name, slug, tagline, subscribers) and a **single article** (one-shot: niche, mastra thread, status lifecycle, finalDraft, topics). Once a `Newsletter` reaches `status='PUBLISHED'`, the publication is effectively dead — there is no way to write a second article. Because `Subscriber` rows hang off `Newsletter`, subscribers are functionally subscribing to one article rather than to a recurring publication.

This spec splits the data model so a `Newsletter` is the **publication** (name, slug, tagline, subscribers) and a new `Issue` is the **article** (niche, thread, status, finalDraft, title, slug, topics). A publication can hold many issues. Subscribers stay on the publication.

This supersedes the implicit "one newsletter == one article" assumption in `docs/superpowers/specs/2026-04-30-ai-newsletter-system-design.md` and adjusts the URL surface introduced there.

## 2. Goals & Success Criteria

- A user can create a `Newsletter` by name only, then create **multiple** issues inside it; each issue runs the existing research → topics → draft → publish flow.
- Subscribers attach to the **newsletter** (publication), not to an individual article. Existing subscribe/confirm/unsub flows continue to work against the newsletter `slug`.
- Existing data is preserved: every current `Newsletter` row keeps its identity as a publication, and its current `finalDraft` / `mastraThreadId` / `topics` move into one corresponding `Issue` row.
- Each published issue has a stable public URL at `/p/[slug]/i/[issueSlug]`. The publication page at `/p/[slug]` lists published issues newest-first.
- Mastra agents (`searchAgent`, `writerAgent`, `editorAgent`) are unchanged. They are now invoked with the **issue**'s `mastraThreadId` and the **issue**'s id as the memory resource.

## 3. Scope

### In scope

- Prisma schema split into `Newsletter` (publication) and new `Issue` (article); `Topic` re-parented to `Issue`.
- One Prisma migration that creates `Issue`, backfills it from existing `Newsletter` rows, re-parents `Topic`, and slims `Newsletter` down.
- API route relocations from newsletter-scoped to issue-scoped (topics, draft, publish).
- Dashboard UX: two-step flow — create newsletter (name) on `/dashboard`, then "Create an article" (niche) on the newsletter page.
- Public archive page at `/p/[slug]` listing published issues + per-issue page at `/p/[slug]/i/[issueSlug]`.
- Cleanup of two empty placeholder migration directories and one empty placeholder public route directory.

### Out of scope

- **Real subscriber fan-out on publish.** `POST /api/issues/[id]/publish` keeps the existing single-recipient test behavior (`NEWSLETTER_PUBLISH_TO` env / optional `to` body field). Iterating over `newsletter.subscribers` is a follow-up.
- **Editing an issue after publish.** Publishing locks the issue's slug; the draft becomes read-only in this iteration.
- **Drafts visible on the public page.** Only `status='PUBLISHED'` issues appear at `/p/[slug]` and at `/p/[slug]/i/[issueSlug]`.
- **Pagination, RSS, cover images** on the public archive.
- **Auth, Clerk webhooks, user sync, rate limiting, DESIGN.md visuals.** Untouched.

## 4. Data Model

### 4.1 Updated schema

```prisma
model User {
  id          String       @id @default(uuid())
  clerkUserId String       @unique
  email       String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  newsletters Newsletter[]
}

model Newsletter {
  id          String       @id @default(uuid())
  userId      String?
  user        User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  slug        String?      @unique
  tagline     String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  issues      Issue[]
  subscribers Subscriber[]
}

model Issue {
  id             String     @id @default(uuid())
  newsletterId   String
  newsletter     Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  niche          String
  mastraThreadId String     @unique
  status         String     @default("RESEARCHING") // RESEARCHING | DRAFTING | REVIEWING | PUBLISHED
  finalDraft     String?
  title          String?
  slug           String?
  publishedAt    DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  topics         Topic[]

  @@unique([newsletterId, slug])
}

model Topic {
  id         String  @id @default(uuid())
  title      String
  summary    String
  sourceUrl  String
  isApproved Boolean @default(true)
  issueId    String
  issue      Issue   @relation(fields: [issueId], references: [id], onDelete: Cascade)
}

model Subscriber {
  id                    String     @id @default(uuid())
  newsletterId          String
  newsletter            Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  emailNormalized       String
  status                String     @default("pending") // pending | active | unsubscribed
  confirmationTokenHash String?
  confirmationExpiresAt DateTime?
  confirmedAt           DateTime?
  createdAt             DateTime   @default(now())
  updatedAt             DateTime   @updatedAt

  @@unique([newsletterId, emailNormalized])
}
```

### 4.2 Field-level decisions

- `Newsletter.name` replaces today's `displayName` and `niche` on the publication. Used in dashboard list, public page header, confirmation/unsub email templates, and publish email subjects.
- `Newsletter.tagline` stays optional, editable from the newsletter page.
- `Newsletter.slug` stays unique and is auto-derived from `name` on create using the existing `allocateNewsletterSlug` helper in `lib/slug.ts`.
- `Issue.title` is **resolved, not user-entered**. On every save of `Issue.finalDraft`, the server extracts the first `# heading` (Markdown ATX H1) from the draft and stores it as `title`. If no heading is present, `title` falls back to `niche`. Editable later from the draft page in a follow-up; for this iteration the derivation is automatic.
- `Issue.slug` is generated **on publish** by slugifying `Issue.title` and resolving collisions within the newsletter (`@@unique([newsletterId, slug])`). It is `NULL` while the issue is in `RESEARCHING`, `DRAFTING`, or `REVIEWING`. Two newsletters may both have an issue with slug `intro`.
- `Issue.publishedAt` is set at the moment of publish; otherwise `NULL`.
- `Issue.mastraThreadId` keeps the existing global uniqueness so Mastra memory keys never collide across issues.

## 5. Data Migration

One new migration: `prisma/migrations/<timestamp>_split_newsletter_issue/migration.sql`, executed as a single SQLite-safe sequence.

### 5.1 Steps (in order)

1. **Create `Issue`** with the columns from §4.1.
2. **Backfill issues from newsletters.** For each existing `Newsletter` row insert one `Issue` carrying `niche`, `mastraThreadId`, `status`, `finalDraft`, `createdAt`, `updatedAt`. Resolve `title` as: first ATX H1 from `finalDraft` if present (handled with SQL `SUBSTR`/`INSTR` over the leading line; otherwise the migration may leave `title` `NULL` and let the application derive it on next save) else `niche`. Resolve `slug` and `publishedAt` only when the source row's `status='PUBLISHED'`; otherwise leave both `NULL`.
3. **Re-parent topics.** Add `Topic.issueId`. Run `UPDATE Topic SET issueId = (SELECT id FROM Issue WHERE Issue.newsletterId = Topic.newsletterId)`. Drop `Topic.newsletterId` (Prisma's SQLite-aware migration handles the table rebuild).
4. **Slim down `Newsletter`.** Add `name`, populate with `COALESCE(displayName, niche)`. Drop `displayName`, `niche`, `mastraThreadId`, `status`, `finalDraft`. Mark `name` `NOT NULL`. Keep `slug`, `tagline`, `userId`, timestamps, and the existing `Subscriber` unique constraint.

### 5.2 Cleanup

- Delete the two empty placeholder migration directories `prisma/migrations/20260509120000_add_issue_model/` and `prisma/migrations/20260509120000_newsletter_issues/`. If `_prisma_migrations` records them as applied on the developer's `dev.db`, run `prisma migrate resolve --rolled-back <name>` for each before applying the new migration.
- Delete the empty placeholder route directory `app/p/[slug]/[issueSlug]/`. The kept public route is `app/p/[slug]/i/[issueSlug]/`.

### 5.3 Reversibility

The migration is one-way for this iteration. A `dev.db` snapshot taken before applying the migration is the recovery path if something goes wrong; the implementation plan will call out taking that snapshot.

## 6. API Contract

All issue-scoped routes load the issue, join to `Newsletter.userId`, and reject when the authenticated user does not own it. This is the same ownership pattern as today's `requireInternalUserId` + scoped Prisma query.

| Today | New |
| --- | --- |
| `POST /api/generate-topics` (creates Newsletter + research in one shot) | **Split.** `POST /api/newsletters` creates the publication (body: `{ name }`, no research; returns `{ newsletterId, slug }`). `POST /api/newsletters/[id]/issues` creates an issue (body: `{ niche }`), runs `searchAgent`, persists topics, returns `{ issueId }`. |
| `GET /api/newsletters/[id]` | Stays. Returns `{ newsletter: { id, name, slug, tagline, createdAt, updatedAt }, issues: [{ id, niche, title, status, slug, publishedAt, updatedAt }] }`. |
| `PATCH /api/newsletters/[id]` | Stays. Accepts `{ name?, tagline? }`. The `finalDraft` field is removed from this endpoint. |
| `GET/POST /api/newsletters/[id]/topics` | Becomes `GET/POST /api/issues/[id]/topics`. |
| `POST /api/generate-draft` (body: `{ newsletterId }`) | Becomes `POST /api/issues/[id]/draft`. Sets the issue's `status` through `DRAFTING → REVIEWING` exactly as today, writes `finalDraft`, and derives `Issue.title` from the first ATX H1. |
| `POST /api/publish` (body: `{ newsletterId, to? }`) | Becomes `POST /api/issues/[id]/publish`. On success: sets `status='PUBLISHED'`, `publishedAt=now`, generates `Issue.slug` from the resolved title with per-newsletter collision suffix, sends one email via Resend with subject `${newsletter.name}: ${issue.title}`. Single-recipient behavior (env / `to` body) preserved. |
| `POST /api/public/subscribe` | **Unchanged.** Subscribers were already keyed off the newsletter slug; that's now correct by construction. |
| _new_ | `GET /api/issues/[id]` returns the issue and its topics. |
| _new_ | `PATCH /api/issues/[id]` accepts `{ finalDraft? }`; re-derives `Issue.title` from the first ATX H1 on each save. |

### 6.1 Validation summary

- `POST /api/newsletters` — `name` required, trimmed, max 120 chars.
- `POST /api/newsletters/[id]/issues` — `niche` required, trimmed, non-empty.
- `POST /api/issues/[id]/publish` — issue must exist, owner must match, `status ∈ { DRAFTING, REVIEWING }`, `finalDraft` non-empty after trim. Reject `PUBLISHED` with 409. Reject `RESEARCHING` with 400. Same error shape as today's `/api/publish`.

## 7. Dashboard UX

```
/dashboard
  ├─ "Your newsletters" — list rows show: name, public slug link, issue count,
  │   latest issue summary ("3 issues · latest published May 11" or "3 issues · drafting").
  └─ "Create newsletter" form — asks: name → POST /api/newsletters
       → redirect to /dashboard/newsletter/[id]

/dashboard/newsletter/[id]                                              (new page)
  ├─ Editable header: name + tagline (PATCH /api/newsletters/[id])
  ├─ "Create an article" form — asks: niche → POST /api/newsletters/[id]/issues
  │     → redirect to /dashboard/newsletter/[id]/issue/[issueId]/topics
  └─ Issues list (newest first): title (or niche if not yet titled) ·
       status badge · Edit / Public link (if PUBLISHED).

/dashboard/newsletter/[id]/issue/[issueId]/topics    (replaces /dashboard/newsletter/[id]/topics)
/dashboard/newsletter/[id]/issue/[issueId]/draft     (replaces /dashboard/newsletter/[id]/draft)
```

### 7.1 Component reuse

- `topics-editor.tsx` and `draft-editor.tsx` keep their internals; their fetch calls are repointed from `/api/newsletters/[id]/topics` and `/api/generate-draft` to `/api/issues/[id]/topics` and `/api/issues/[id]/draft`. The `newsletterId` prop becomes `issueId`.
- `app/home-form.tsx` is repurposed into two thinner forms: `CreateNewsletterForm` (asks for name, lives on `/dashboard`) and `CreateArticleForm` (asks for niche, lives on `/dashboard/newsletter/[id]`).
- `lib/query/prefetch-newsletter-detail.ts` is replaced by `lib/query/prefetch-issue-detail.ts` (same shape, keyed by issue id).

### 7.2 Status badges

Dashboard rows no longer show a newsletter-level status (newsletters have no lifecycle). The newsletter card summarizes its issues. The status badge concept is preserved at the issue level inside the newsletter page.

## 8. Public Surface

```
/p/[slug]                Newsletter name + tagline. Subscribe form.
                         Published issues list newest-first; each row links to
                         /p/[slug]/i/[issueSlug]. If 0 published issues:
                         subscribe form only, with a one-line "No issues yet" note.

/p/[slug]/i/[issueSlug]  Issue title, publishedAt date, rendered Markdown body.
                         Header link back to /p/[slug]. Subscribe CTA at the
                         bottom (reuses the parent's SubscribeForm).
                         Drafts (status != PUBLISHED) return 404 here.
```

### 8.1 Markdown rendering

The implementation plan will pick a small Markdown renderer (likely `react-markdown` with a slim allowlist and no raw HTML). The choice is implementation-level, not a design question.

### 8.2 Routing cleanup

Delete `app/p/[slug]/[issueSlug]/` (wrong shape; would collide with future newsletter-level routes). Keep and fill in `app/p/[slug]/i/[issueSlug]/`.

## 9. Mastra Integration

- `searchAgent.generate` is invoked when an issue is created (`POST /api/newsletters/[id]/issues`), with `memory = { thread: issue.mastraThreadId, resource: issue.id }`. The newsletter id is not used as a memory key.
- `writerAgent.generate` and `editorAgent.generate` run inside `POST /api/issues/[id]/draft` with the same per-issue memory binding. The flow inside `app/api/generate-draft/route.ts` moves wholesale; only the lookup keys change from `newsletter.id` to `issue.id`.
- Existing prompts and `parseTopicsJson` are unchanged.

## 10. Affected Files

Approximate list; the implementation plan will confirm.

- `prisma/schema.prisma` — schema changes.
- `prisma/migrations/<timestamp>_split_newsletter_issue/migration.sql` — new migration.
- `prisma/migrations/20260509120000_*/` — delete both placeholder dirs.
- `app/api/generate-topics/route.ts` — split into `app/api/newsletters/route.ts` (POST) and `app/api/newsletters/[id]/issues/route.ts` (POST).
- `app/api/generate-draft/route.ts` → `app/api/issues/[id]/draft/route.ts`.
- `app/api/publish/route.ts` → `app/api/issues/[id]/publish/route.ts`.
- `app/api/newsletters/[id]/topics/route.ts` → `app/api/issues/[id]/topics/route.ts`.
- `app/api/newsletters/[id]/route.ts` — drop `finalDraft` from PATCH; return `issues` list on GET.
- `app/api/issues/[id]/route.ts` — new (GET/PATCH for issue + topics).
- `app/dashboard/page.tsx` — rework "Your newsletters" rows; replace HomeForm with CreateNewsletterForm.
- `app/dashboard/newsletter/[id]/page.tsx` — new newsletter detail page.
- `app/dashboard/newsletter/[id]/issue/[issueId]/topics/` — new dir, moves topics-editor here.
- `app/dashboard/newsletter/[id]/issue/[issueId]/draft/` — new dir, moves draft-editor here.
- `app/dashboard/newsletter/[id]/topics/`, `app/dashboard/newsletter/[id]/draft/` — deleted (moved).
- `app/p/[slug]/page.tsx` — add issues list.
- `app/p/[slug]/i/[issueSlug]/page.tsx` — new public issue page.
- `app/p/[slug]/[issueSlug]/` — deleted (empty placeholder).
- `app/home-form.tsx` — split into `CreateNewsletterForm` and `CreateArticleForm`.
- `lib/query/prefetch-newsletter-detail.ts` — adapted (newsletter shape) + new `prefetch-issue-detail.ts`.
- `lib/subscribe-email.ts`, `lib/newsletter-owner.ts` — replace `displayName` / `niche` reads with `name`.
- Subscribe/confirm/unsub email templates — replace `niche` / `displayName` substitutions with `name`.

## 11. Open Items for Implementation

- Confirm Markdown renderer choice (`react-markdown` with allowlist is the default unless a lighter option emerges).
- Decide whether the migration computes `Issue.title` for legacy rows in SQL or leaves it `NULL` and relies on the next `PATCH /api/issues/[id]` to derive it. The implementation plan will pick one based on how messy the SQL extraction is for ATX H1 in SQLite.
- Confirm dev.db handling: snapshot before applying the migration; document the `prisma migrate resolve --rolled-back` step for the two empty placeholder migrations if they appear in `_prisma_migrations`.

## 12. Follow-ups (post this spec)

- Real subscriber fan-out on `POST /api/issues/[id]/publish` (iterate `newsletter.subscribers` where `status='active'`, batch through Resend).
- Edit-and-republish flow for issues.
- Pagination on `/p/[slug]` once issue counts grow.
- RSS feed at `/p/[slug]/rss.xml`.
- Cover image / hero per issue.

## Revision history

| Date | Change |
| --- | --- |
| 2026-05-11 | Initial design: split Newsletter (publication) from Issue (article); subscribers stay on newsletter; per-issue topics/draft/publish; public archive + per-issue page; in-place data migration. |
