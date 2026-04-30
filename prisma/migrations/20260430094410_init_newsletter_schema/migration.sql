-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "niche" TEXT NOT NULL,
    "mastraThreadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESEARCHING',
    "finalDraft" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "newsletterId" TEXT NOT NULL,
    CONSTRAINT "Topic_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Newsletter_mastraThreadId_key" ON "Newsletter"("mastraThreadId");
