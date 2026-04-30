/**
 * One-shot: assign legacy newsletters (null userId/slug) to a bootstrap Clerk user
 * and synthesize unique slugs. Run: LEGACY_BOOTSTRAP_CLERK_USER_ID=user_xxx pnpm db:backfill-phase1
 */
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { nanoid } from "nanoid";
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

function slugify(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s.length >= 3 ? s : "newsletter";
}

async function main() {
  const clerkUserId = process.env.LEGACY_BOOTSTRAP_CLERK_USER_ID?.trim();
  if (!clerkUserId) {
    console.error("Set LEGACY_BOOTSTRAP_CLERK_USER_ID to your Clerk user id.");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: adapterFromEnv() });
  const email = process.env.LEGACY_BOOTSTRAP_EMAIL?.trim() ?? null;

  const user = await prisma.user.upsert({
    where: { clerkUserId },
    create: { clerkUserId, email },
    update: email ? { email } : {},
  });

  const orphans = await prisma.newsletter.findMany({
    where: { OR: [{ userId: null }, { slug: null }] },
    select: { id: true, niche: true, slug: true },
  });

  for (const row of orphans) {
    const candidate = slugify(row.niche);
    let slug = row.slug ?? candidate;
    if (!row.slug) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const exists = await prisma.newsletter.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!exists || exists.id === row.id) break;
        slug = `${candidate}-${nanoid(6)}`;
      }
    }

    await prisma.newsletter.update({
      where: { id: row.id },
      data: {
        userId: user.id,
        slug: slug ?? `${candidate}-${nanoid(6)}`,
      },
    });
    console.log(`Updated newsletter ${row.id} → slug ${slug}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
