import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/lib/generated/prisma/client";

function isRemoteLibsql(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("libsqls://");
}

function resolveLocalSqlitePath(raw: string): string {
  if (raw === ":memory:" || raw.startsWith("file::memory:")) {
    return ":memory:";
  }
  if (raw.startsWith("file:")) {
    return raw.slice("file:".length);
  }
  return raw;
}

function createAdapter() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (isRemoteLibsql(databaseUrl)) {
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
    if (!authToken) {
      throw new Error(
        "DATABASE_URL is a Turso/libSQL URL but TURSO_AUTH_TOKEN is missing. Create a database token in the Turso dashboard and set TURSO_AUTH_TOKEN (see .env.example).",
      );
    }
    return new PrismaLibSql({
      url: databaseUrl,
      authToken,
    });
  }

  return new PrismaBetterSqlite3({
    url: resolveLocalSqlitePath(databaseUrl),
  });
}

export const prisma = new PrismaClient({ adapter: createAdapter() });
