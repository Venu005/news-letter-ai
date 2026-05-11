# Newsletter / Issue Split — Implementation Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement these plans phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the conflated `Newsletter` model into `Newsletter` (publication) + `Issue` (article) so users can publish many articles inside one newsletter. Subscribers stay attached to the newsletter.

**Spec:** `docs/superpowers/specs/2026-05-11-newsletter-issue-split-design.md`

**Tech stack:** Next.js 15 App Router · TypeScript · Prisma (SQLite dev) · TanStack Query v5 · Vitest · Mastra (Tavily search + OpenAI agents) · Resend · Clerk

---

## Phase order (must run sequentially)

| Phase | Plan file | What it produces | Shippable on its own? |
| --- | --- | --- | --- |
| 1 | `2026-05-11-newsletter-issue-split-phase-1-data-model.md` | Prisma schema split, data migration with backfill, `lib/types/*` shared type modules. | No — old API routes become type-broken after the schema change. |
| 2 | `2026-05-11-newsletter-issue-split-phase-2-api.md` | New issue-scoped API routes (`/api/newsletters`, `/api/newsletters/[id]/issues`, `/api/issues/[id]/*`). Old routes deleted. Mastra calls rewired to issue scope. | No — UI still references old endpoints until Phase 3 lands. `npm run build` passes; new endpoints are exercisable. |
| 3 | `2026-05-11-newsletter-issue-split-phase-3-dashboard.md` | Mutations extracted into `lib/mutation/`, query layer adapted + new `prefetch-issue-detail`, new `/dashboard/newsletter/[id]` index page, repurposed forms, relocated topics/draft pages under `issue/[issueId]/`. | Almost — dashboard works end-to-end (create newsletter → article → topics → draft → publish), but public archive doesn't list issues yet. |
| 4 | `2026-05-11-newsletter-issue-split-phase-4-public.md` | `/p/[slug]` lists published issues; new `/p/[slug]/i/[issueSlug]` renders an issue's Markdown; empty placeholder route dir removed. | Yes — feature is end-user-visible. |

Each phase plan repeats the file structure and dependency notes it needs so the engineer can read them independently. Cross-references between phases use commit hashes or file paths, not phase numbers.

---

## Modularity convention (applies to all phases)

The user asked for types, queries, and mutations to live in separate files/folders. This plan honors that:

```
lib/
├── types/
│   ├── newsletter.ts      Newsletter type + NewsletterListItem + NewsletterDetailPayload
│   ├── issue.ts           Issue type + IssueListItem + IssueDetailPayload + IssueStatus
│   └── topic.ts           Topic + TopicInput
├── query/                 (existing; read-side only)
│   ├── newsletter-keys.ts (existing, extended)
│   ├── issue-keys.ts      NEW
│   ├── fetch-newsletter-detail.ts  (existing, type-only changes)
│   ├── fetch-issue-detail.ts       NEW
│   ├── prefetch-newsletter-detail.ts (existing, type-only changes)
│   └── prefetch-issue-detail.ts    NEW
└── mutation/              NEW FOLDER (write-side only)
    ├── newsletter-mutations.ts     createNewsletter, updateNewsletterMetadata
    └── issue-mutations.ts          createIssue, saveTopics, saveDraft, generateDraft, publishIssue
```

Components import from these focused modules. No inline `fetch()` in components after Phase 3.

---

## Verification gate at each phase boundary

- Phase 1: `npx prisma migrate dev` applies the new migration without error; a verification script confirms one `Issue` row per legacy `Newsletter` and that topics re-parent correctly.
- Phase 2: `npm run build` passes; manual curl checks against each new endpoint return expected status codes.
- Phase 3: `npm run build` passes; manual click-through in the dashboard creates a newsletter, creates an article, edits topics, generates a draft, publishes (single-recipient test email arrives).
- Phase 4: `npm run build` passes; public `/p/[slug]` lists the published issue; clicking through to `/p/[slug]/i/[issueSlug]` renders the Markdown.

If any phase's verification fails, do not advance to the next phase.

---

## Out of scope across all phases (deferred follow-ups)

- Real subscriber fan-out on publish (still single-recipient test).
- Edit-and-republish of issues.
- Public pagination, RSS, cover images.

See spec §12 for the full follow-up list.
