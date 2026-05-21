/*
  Warnings:

  - You are about to drop the column `summary` on the `Topic` table. All the data in the column will be lost.
  - Added the required column `brief` to the `Topic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullText` to the `Topic` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keyFacts` to the `Topic` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "keyFacts" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "issueId" TEXT NOT NULL,
    CONSTRAINT "Topic_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Topic" ("id", "isApproved", "issueId", "sourceUrl", "title", "brief", "keyFacts", "fullText") SELECT "id", "isApproved", "issueId", "sourceUrl", "title", '', '[]', '' FROM "Topic";
DROP TABLE "Topic";
ALTER TABLE "new_Topic" RENAME TO "Topic";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
