-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "newsletterId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmationTokenHash" TEXT,
    "confirmationExpiresAt" DATETIME,
    "confirmedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscriber_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Newsletter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "niche" TEXT NOT NULL,
    "mastraThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESEARCHING',
    "finalDraft" TEXT,
    "userId" TEXT,
    "slug" TEXT,
    "displayName" TEXT,
    "tagline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Newsletter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Newsletter" ("createdAt", "finalDraft", "id", "mastraThreadId", "niche", "status", "updatedAt") SELECT "createdAt", "finalDraft", "id", "mastraThreadId", "niche", "status", "updatedAt" FROM "Newsletter";
DROP TABLE "Newsletter";
ALTER TABLE "new_Newsletter" RENAME TO "Newsletter";
CREATE UNIQUE INDEX "Newsletter_mastraThreadId_key" ON "Newsletter"("mastraThreadId");
CREATE UNIQUE INDEX "Newsletter_slug_key" ON "Newsletter"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_newsletterId_emailNormalized_key" ON "Subscriber"("newsletterId", "emailNormalized");
