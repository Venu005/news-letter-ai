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
