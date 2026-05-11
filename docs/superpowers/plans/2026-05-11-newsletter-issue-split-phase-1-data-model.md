# Phase 1 — Data Model & Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `Newsletter` model into `Newsletter` (publication) and a new `Issue` (article); re-parent `Topic` to `Issue`; backfill existing rows in place; introduce shared TypeScript type modules.

**Architecture:** One Prisma migration handles schema + data backfill in a single SQLite-safe sequence. Shared TS types live under `lib/types/` so API routes, query helpers, and mutation helpers can reuse them without circular imports.

**Spec sections covered:** §4 (Data Model), §5 (Data Migration), parts of §10 (Affected Files).

**Depends on:** nothing (entry point of the work).

**After this phase:** `prisma migrate dev` applies cleanly and `dev.db` has the new shape. The existing API routes (`app/api/generate-topics`, `app/api/generate-draft`, `app/api/publish`, `app/api/newsletters/[id]/route.ts`, `app/api/newsletters/[id]/topics/route.ts`) will fail to compile because they reference dropped fields (`niche`, `displayName`, `mastraThreadId`, `status`, `finalDraft` on `Newsletter`, and `newsletterId` on `Topic`). Phase 2 fixes them.

---

## File structure (this phase)

```
Create:
- prisma/migrations/20260511120000_split_newsletter_issue/migration.sql
- lib/types/newsletter.ts
- lib/types/issue.ts
- lib/types/topic.ts
- scripts/verify-issue-migration.mjs

Modify:
- prisma/schema.prisma
- prisma/migrations/migration_lock.toml (no change expected; verify)

Delete:
- prisma/migrations/20260509120000_add_issue_model/   (empty placeholder)
- prisma/migrations/20260509120000_newsletter_issues/ (empty placeholder)
```

---

## Task 1: Snapshot dev.db and clear empty placeholder migrations

**Files:**
- Backup: `dev.db` → `dev.db.before-split-phase-1`
- Delete: `prisma/migrations/20260509120000_add_issue_model/`
- Delete: `prisma/migrations/20260509120000_newsletter_issues/`

- [ ] **Step 1: Snapshot dev.db so the migration is reversible**

```bash
cp dev.db dev.db.before-split-phase-1
ls -la dev.db dev.db.before-split-phase-1
```

Expected: both files exist with identical size.

- [ ] **Step 2: Check whether the empty placeholder migrations were ever registered**

```bash
sqlite3 dev.db "SELECT migration_name, applied_steps_count, finished_at FROM _prisma_migrations WHERE migration_name LIKE '%20260509120000%';"
```

If the query returns rows, run for each row:

```bash
npx prisma migrate resolve --rolled-back 20260509120000_add_issue_model
npx prisma migrate resolve --rolled-back 20260509120000_newsletter_issues
```

If the query returns nothing, skip the resolve commands.

- [ ] **Step 3: Delete the empty placeholder directories**

```bash
rmdir prisma/migrations/20260509120000_add_issue_model
rmdir prisma/migrations/20260509120000_newsletter_issues
ls prisma/migrations/
```

Expected: only `20260430094410_init_newsletter_schema/`, `20260430162723_phase1_multi_tenant/`, `migration_lock.toml`.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/ dev.db.before-split-phase-1
git commit -m "chore(prisma): remove empty placeholder issue migrations, snapshot dev.db"
```

(If `.gitignore` excludes `dev.db.before-split-phase-1`, that's fine — the snapshot is local recovery only and doesn't need to be tracked. Commit just the migration dir change in that case.)

---

## Task 2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the model block with the new shape**

Replace the contents of `prisma/schema.prisma` (keep the `generator` and `datasource` blocks at the top exactly as they are; replace everything from `model User {` onward) with:

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

model Topic {
  id         String  @id @default(uuid())
  title      String
  summary    String
  sourceUrl  String
  isApproved Boolean @default(true)
  issueId    String
  issue      Issue   @relation(fields: [issueId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Regenerate the Prisma client to update TypeScript types**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" message; `lib/generated/prisma/` is updated. The command runs in <10s.

`npm run build` will now fail to typecheck because the existing API routes still reference dropped fields. That is expected; Phase 2 fixes them.

- [ ] **Step 3: Commit the schema change (do not commit a migration yet — Task 3 writes it manually)**

```bash
git add prisma/schema.prisma lib/generated/prisma
git commit -m "feat(prisma): split Newsletter into publication + Issue (article)"
```

---

## Task 3: Author the migration SQL manually

We do not run `prisma migrate dev` to auto-generate the migration, because the auto-generated version would not include the data backfill step. We hand-write one migration directory.

**Files:**
- Create: `prisma/migrations/20260511120000_split_newsletter_issue/migration.sql`

- [ ] **Step 1: Create the migration directory**

```bash
mkdir -p prisma/migrations/20260511120000_split_newsletter_issue
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260511120000_split_newsletter_issue/migration.sql` with:

```sql
-- This migration:
--   1. creates the new Issue table
--   2. backfills one Issue row per existing Newsletter row
--   3. re-parents Topic from Newsletter to Issue
--   4. slims Newsletter down (drops niche/displayName/mastraThreadId/status/finalDraft; adds name)
-- SQLite requires table rebuilds for column drops; we use the CREATE/INSERT/DROP/RENAME idiom.

PRAGMA foreign_keys=OFF;

-- 1. Create new Issue table.
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "newsletterId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "mastraThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESEARCHING',
    "finalDraft" TEXT,
    "title" TEXT,
    "slug" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Issue_mastraThreadId_key" ON "Issue"("mastraThreadId");
CREATE UNIQUE INDEX "Issue_newsletterId_slug_key" ON "Issue"("newsletterId", "slug");

-- 2. Backfill: one Issue per existing Newsletter.
--    Title = niche (skips ATX H1 extraction; runtime save will derive from heading later).
--    Slug + publishedAt only when source is PUBLISHED. Slug = lowercase niche with non-alphanumerics
--    collapsed to hyphens; SQLite has no native regex, so we use REPLACE chains for the common
--    troublesome chars. Collision suffixing is unnecessary because each newsletter has exactly one
--    backfilled issue, so (newsletterId, slug) is unique by construction.
INSERT INTO "Issue" (
    "id", "newsletterId", "niche", "mastraThreadId",
    "status", "finalDraft", "title", "slug",
    "publishedAt", "createdAt", "updatedAt"
)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))), 2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))), 2) || '-' ||
        lower(hex(randomblob(6))),
    n."id",
    n."niche",
    n."mastraThreadId",
    n."status",
    n."finalDraft",
    n."niche",
    CASE
        WHEN n."status" = 'PUBLISHED' THEN
            lower(
                replace(replace(replace(replace(replace(replace(replace(replace(
                    n."niche",
                ' ', '-'), '.', '-'), ',', '-'), '/', '-'),
                '\', '-'), ':', '-'), '?', '-'), '&', '-')
            )
        ELSE NULL
    END,
    CASE WHEN n."status" = 'PUBLISHED' THEN n."updatedAt" ELSE NULL END,
    n."createdAt",
    n."updatedAt"
FROM "Newsletter" n;

-- 3. Re-parent Topic from newsletterId to issueId.
--    Add issueId as nullable, backfill, then rebuild the table with NOT NULL.
ALTER TABLE "Topic" ADD COLUMN "issueId" TEXT;
UPDATE "Topic"
SET "issueId" = (
    SELECT i."id" FROM "Issue" i WHERE i."newsletterId" = "Topic"."newsletterId" LIMIT 1
);

CREATE TABLE "Topic_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "issueId" TEXT NOT NULL,
    CONSTRAINT "Topic_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Topic_new" ("id", "title", "summary", "sourceUrl", "isApproved", "issueId")
SELECT "id", "title", "summary", "sourceUrl", "isApproved", "issueId" FROM "Topic"
WHERE "issueId" IS NOT NULL;
DROP TABLE "Topic";
ALTER TABLE "Topic_new" RENAME TO "Topic";

-- 4. Slim down Newsletter.
--    Drop niche, displayName, mastraThreadId, status, finalDraft.
--    Add name (NOT NULL), populated from COALESCE(displayName, niche).
CREATE TABLE "Newsletter_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "tagline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Newsletter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "Newsletter_new" ("id", "userId", "name", "slug", "tagline", "createdAt", "updatedAt")
SELECT
    "id",
    "userId",
    COALESCE("displayName", "niche"),
    "slug",
    "tagline",
    "createdAt",
    "updatedAt"
FROM "Newsletter";
DROP TABLE "Newsletter";
ALTER TABLE "Newsletter_new" RENAME TO "Newsletter";
CREATE UNIQUE INDEX "Newsletter_slug_key" ON "Newsletter"("slug");

PRAGMA foreign_keys=ON;
```

- [ ] **Step 3: Apply the migration to dev.db**

```bash
npx prisma migrate dev --skip-generate
```

Expected output: `Applying migration "20260511120000_split_newsletter_issue"` then `Your database is now in sync with your Prisma schema.` Exits 0.

If the command errors with a checksum / drift complaint about prior migrations, run `npx prisma migrate resolve --applied <migration_name>` for each unapplied baseline migration listed, then re-run.

- [ ] **Step 4: Spot-check the migration in sqlite**

```bash
sqlite3 dev.db ".tables"
```

Expected (rows may include `_prisma_migrations`): `Issue`, `Newsletter`, `Subscriber`, `Topic`, `User`.

```bash
sqlite3 dev.db "SELECT COUNT(*) AS newsletters FROM Newsletter; SELECT COUNT(*) AS issues FROM Issue;"
```

Expected: equal counts.

```bash
sqlite3 dev.db "SELECT n.id, n.name, i.id AS issueId, i.status, i.slug FROM Newsletter n LEFT JOIN Issue i ON i.newsletterId = n.id LIMIT 5;"
```

Expected: every row has a non-null `issueId`; PUBLISHED issues have a non-null `slug`; others have `slug` = NULL.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/20260511120000_split_newsletter_issue/
git commit -m "feat(prisma): migrate Newsletter→Newsletter+Issue with topic re-parenting"
```

---

## Task 4: Verification script (TDD-style check that backfill is correct)

We don't have an integration test framework wired for Prisma migrations, so we write a small Node script that asserts the migration's invariants and run it after applying. It exits non-zero on failure so it can be reused in CI later.

**Files:**
- Create: `scripts/verify-issue-migration.mjs`

- [ ] **Step 1: Write the verification script**

Create `scripts/verify-issue-migration.mjs`:

```javascript
#!/usr/bin/env node
import { PrismaClient } from "../lib/generated/prisma/client.js";

const prisma = new PrismaClient();

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
  const newsletters = await prisma.newsletter.findMany({
    include: { issues: true, subscribers: true },
  });

  if (newsletters.length === 0) {
    console.log("OK: no rows to check (empty dev.db).");
    return;
  }

  for (const n of newsletters) {
    if (!n.name) fail(`Newsletter ${n.id} has empty name`);
    if (n.issues.length !== 1) {
      fail(`Newsletter ${n.id} (${n.name}) has ${n.issues.length} issues, expected exactly 1 after backfill`);
    }
    const issue = n.issues[0];
    if (!issue.niche) fail(`Issue ${issue.id} has empty niche`);
    if (!issue.mastraThreadId) fail(`Issue ${issue.id} has empty mastraThreadId`);
    if (!issue.title) fail(`Issue ${issue.id} has null title (should equal niche at this point)`);
    if (issue.status === "PUBLISHED") {
      if (!issue.slug) fail(`Issue ${issue.id} is PUBLISHED but has null slug`);
      if (!issue.publishedAt) fail(`Issue ${issue.id} is PUBLISHED but has null publishedAt`);
    } else {
      if (issue.slug) fail(`Issue ${issue.id} has slug "${issue.slug}" but is not PUBLISHED`);
    }
  }

  const orphanedTopics = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS c FROM Topic WHERE issueId NOT IN (SELECT id FROM Issue)",
  );
  if (orphanedTopics[0].c > 0) {
    fail(`${orphanedTopics[0].c} topic rows reference unknown issue ids`);
  }

  console.log(`OK: ${newsletters.length} newsletters, ${newsletters.length} issues, no orphan topics.`);
}

main()
  .catch((err) => fail(err.stack ?? String(err)))
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run it**

```bash
node scripts/verify-issue-migration.mjs
```

Expected: `OK: ...` line and exit 0. If it fails, restore dev.db from `dev.db.before-split-phase-1`, fix the migration SQL, and re-run Task 3 Step 3.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-issue-migration.mjs
git commit -m "test(prisma): verification script for newsletter→issue backfill"
```

---

## Task 5: Shared type modules under `lib/types/`

Co-locate shared TypeScript types so API routes, query helpers, and mutation helpers reuse them. These types are the **wire shape** (what comes back over `fetch`); they intentionally use `string` for dates and exclude internals like `mastraThreadId`.

**Files:**
- Create: `lib/types/newsletter.ts`
- Create: `lib/types/issue.ts`
- Create: `lib/types/topic.ts`

- [ ] **Step 1: Write `lib/types/topic.ts`**

```typescript
export type Topic = {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  isApproved: boolean;
  issueId: string;
};

export type TopicInput = {
  id: string;
  title?: string;
  summary?: string;
  sourceUrl?: string;
  isApproved?: boolean;
};
```

- [ ] **Step 2: Write `lib/types/issue.ts`**

```typescript
import type { Topic } from "./topic";

export type IssueStatus = "RESEARCHING" | "DRAFTING" | "REVIEWING" | "PUBLISHED";

export type IssueListItem = {
  id: string;
  newsletterId: string;
  niche: string;
  title: string | null;
  status: IssueStatus;
  slug: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type IssueDetail = IssueListItem & {
  finalDraft: string | null;
  createdAt: string;
};

export type IssueDetailPayload = {
  issue: IssueDetail;
  topics: Topic[];
};
```

- [ ] **Step 3: Write `lib/types/newsletter.ts`**

```typescript
import type { IssueListItem } from "./issue";

export type NewsletterListItem = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  issueCount: number;
  latestIssueAt: string | null;
  latestIssueStatus: string | null;
  updatedAt: string;
};

export type Newsletter = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterDetailPayload = {
  newsletter: Newsletter;
  issues: IssueListItem[];
};
```

- [ ] **Step 4: Verify the types compile**

```bash
npx tsc --noEmit
```

Expected: many errors about `app/api/...` and `app/dashboard/...` files referencing dropped fields. **The errors in `lib/types/*` itself should be zero.** Filter:

```bash
npx tsc --noEmit 2>&1 | grep "lib/types/" || echo "types modules compile clean"
```

Expected: `types modules compile clean`.

- [ ] **Step 5: Commit**

```bash
git add lib/types/
git commit -m "feat(types): add shared Newsletter/Issue/Topic types under lib/types"
```

---

## Phase 1 verification gate

- [ ] `npx prisma migrate dev --skip-generate` is a no-op (says "Already in sync").
- [ ] `node scripts/verify-issue-migration.mjs` exits 0.
- [ ] `npx tsc --noEmit 2>&1 | grep "lib/types/"` is empty.

If all three pass, Phase 1 is complete. Hand off to Phase 2 (`2026-05-11-newsletter-issue-split-phase-2-api.md`).

If you need to roll back (e.g. unrecoverable migration error before Task 3 Step 5 was committed):

```bash
cp dev.db.before-split-phase-1 dev.db
git reset --hard HEAD~<commits-this-phase>
```

---

## Out of scope for this phase

- API route changes (Phase 2).
- UI changes (Phase 3).
- Public page changes (Phase 4).
- Title extraction from Markdown H1 — runtime concern, addressed in Phase 2's `saveDraft` handler.
- `allocateIssueSlug` helper — added in Phase 2 when the publish endpoint needs it.
