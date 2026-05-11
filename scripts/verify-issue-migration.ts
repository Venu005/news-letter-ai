#!/usr/bin/env tsx
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../lib/generated/prisma/client";

function adapterFromEnv() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const isRemote =
    databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("libsqls://");
  if (isRemote) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    if (!authToken) throw new Error("TURSO_AUTH_TOKEN required for Turso URL");
    return new PrismaLibSql({ url: databaseUrl, authToken });
  }
  const path = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
  return new PrismaBetterSqlite3({ url: path });
}

const prisma = new PrismaClient({ adapter: adapterFromEnv() });

function fail(msg: string): never {
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
      fail(
        `Newsletter ${n.id} (${n.name}) has ${n.issues.length} issues, expected exactly 1 after backfill`,
      );
    }
    const issue = n.issues[0];
    if (!issue.niche) fail(`Issue ${issue.id} has empty niche`);
    if (!issue.mastraThreadId) fail(`Issue ${issue.id} has empty mastraThreadId`);
    if (!issue.title) fail(`Issue ${issue.id} has null title (should equal niche at this point)`);
    if (issue.status === "PUBLISHED") {
      if (!issue.slug) fail(`Issue ${issue.id} is PUBLISHED but has null slug`);
      if (!issue.publishedAt) fail(`Issue ${issue.id} is PUBLISHED but has null publishedAt`);
    } else if (issue.slug) {
      fail(`Issue ${issue.id} has slug "${issue.slug}" but is not PUBLISHED`);
    }
  }

  const orphanedTopics = await prisma.$queryRawUnsafe<Array<{ c: number | bigint }>>(
    "SELECT COUNT(*) AS c FROM Topic WHERE issueId NOT IN (SELECT id FROM Issue)",
  );
  const orphanCount = Number(orphanedTopics[0]?.c ?? 0);
  if (orphanCount > 0) {
    fail(`${orphanCount} topic rows reference unknown issue ids`);
  }

  console.log(
    `OK: ${newsletters.length} newsletters, ${newsletters.length} issues, no orphan topics.`,
  );
}

main()
  .catch((err: unknown) => fail(err instanceof Error ? (err.stack ?? err.message) : String(err)))
  .finally(() => prisma.$disconnect());
