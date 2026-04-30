import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

function isRemoteLibsql(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("libsqls://");
}

/**
 * Mastra memory DB URL.
 * - Remote Turso: set DATABASE_URL to libsql(s)://… or override with MASTRA_DATABASE_URL.
 * - Local dev: defaults to file:mastra-memory.db when DATABASE_URL is a local SQLite file.
 */
function resolveMastraLibSqlUrl(): string {
  const explicit = process.env.MASTRA_DATABASE_URL?.trim();
  if (explicit) return explicit;
  const db = process.env.DATABASE_URL?.trim() ?? "";
  if (db && isRemoteLibsql(db)) return db;
  return "file:mastra-memory.db";
}

function resolveLibSqlAuthToken(): string | undefined {
  const mastraToken = process.env.MASTRA_TURSO_AUTH_TOKEN?.trim();
  if (mastraToken) return mastraToken;
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  return token || undefined;
}

const mastraUrl = resolveMastraLibSqlUrl();
const authToken = resolveLibSqlAuthToken();

if (isRemoteLibsql(mastraUrl) && !authToken) {
  throw new Error(
    "Remote Mastra DB URL set but no token: add MASTRA_TURSO_AUTH_TOKEN (that DB) or TURSO_AUTH_TOKEN (fallback).",
  );
}

const newsletterMemoryStore = new LibSQLStore({
  id: "newsletter-memory-store",
  url: mastraUrl,
  ...(authToken ? { authToken } : {}),
});

export const memory = new Memory({
  storage: newsletterMemoryStore,
});
