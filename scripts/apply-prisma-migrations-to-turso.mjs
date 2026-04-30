#!/usr/bin/env node
/**
 * Applies each prisma/migrations/<folder>/migration.sql to Turso using DATABASE_URL + TURSO_AUTH_TOKEN.
 *
 * Prisma Migrate / db push CLI cannot target libsql:// URLs; they use file:./dev.db locally (see prisma.config.ts).
 * Run this after migrate dev to sync DDL to Turso.
 *
 * Tracks applied folders in `_newsletter_ai_turso_migrations` so re-runs skip completed migrations.
 *
 * Usage:
 *   pnpm db:apply-turso
 *
 * If Turso already matches an older migration but was applied outside this script (no tracking row yet):
 *   pnpm db:turso-mark-applied -- 20260430094410_init_newsletter_schema
 *
 * Requires Node 20.6+ (--env-file) or export vars manually before running.
 */

import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const TRACK_TABLE = "_newsletter_ai_turso_migrations";

/** Strip full-line `--` comments and split into statements for batch(). */
function statementsFromMigration(sql) {
  const body = sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join("\n");
  return body
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function rowCount(result) {
  const rows = result?.rows;
  if (!rows) return 0;
  if (typeof rows.length === "number") return rows.length;
  try {
    return [...rows].length;
  } catch {
    return 0;
  }
}

async function ensureTrackingTable(client) {
  await client.execute(`
CREATE TABLE IF NOT EXISTS ${TRACK_TABLE} (
  folder_name TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
}

async function isMigrationApplied(client, folderName) {
  const r = await client.execute({
    sql: `SELECT 1 FROM ${TRACK_TABLE} WHERE folder_name = ? LIMIT 1`,
    args: [folderName],
  });
  return rowCount(r) > 0;
}

async function recordMigration(client, folderName) {
  await client.execute({
    sql: `INSERT OR IGNORE INTO ${TRACK_TABLE} (folder_name) VALUES (?)`,
    args: [folderName],
  });
}

function isAlreadyExistsError(err) {
  const msg = `${err?.message ?? ""}${err?.cause?.message ?? ""}`;
  return /already exists/i.test(msg);
}

const url = process.env.DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

const argv = process.argv.slice(2);
const markIdx = argv.indexOf("mark");
if (markIdx !== -1) {
  const folder = argv[markIdx + 1];
  if (!folder) {
    console.error('Usage: node scripts/apply-prisma-migrations-to-turso.mjs mark <migration_folder_name>');
    console.error('Example: ... mark 20260430094410_init_newsletter_schema');
    process.exit(1);
  }
  if (!url?.startsWith("libsql://") && !url?.startsWith("libsqls://")) {
    console.error("DATABASE_URL must be libsql:// or libsqls:// (Turso).");
    process.exit(1);
  }
  if (!authToken) {
    console.error("TURSO_AUTH_TOKEN is required.");
    process.exit(1);
  }
  const client = createClient({ url, authToken });
  try {
    await ensureTrackingTable(client);
    await recordMigration(client, folder);
    console.log(`Marked ${folder} as applied on Turso (no SQL run).`);
  } finally {
    client.close();
  }
  process.exit(0);
}

if (!url?.startsWith("libsql://") && !url?.startsWith("libsqls://")) {
  console.error("DATABASE_URL must be libsql:// or libsqls:// (Turso).");
  process.exit(1);
}
if (!authToken) {
  console.error("TURSO_AUTH_TOKEN is required.");
  process.exit(1);
}

const migrationsDir = join(root, "prisma", "migrations");
let dirs;
try {
  dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
} catch (e) {
  console.error("Cannot read prisma/migrations:", e.message);
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  await ensureTrackingTable(client);

  for (const dir of dirs) {
    const file = join(migrationsDir, dir, "migration.sql");
    let sql;
    try {
      sql = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const stmts = statementsFromMigration(sql);
    if (stmts.length === 0) continue;

    if (await isMigrationApplied(client, dir)) {
      console.log(`Skipping ${dir} (already applied).`);
      continue;
    }

    console.log(`Applying ${dir} (${stmts.length} statements)...`);
    try {
      await client.migrate(stmts);
      await recordMigration(client, dir);
      console.log(`  OK`);
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        console.warn(
          `  Warning: Turso reports objects already exist for ${dir}. Marking as applied. If schema is wrong, fix Turso manually.`,
        );
        await recordMigration(client, dir);
        continue;
      }
      throw err;
    }
  }
  console.log("All migrations applied to Turso.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  client.close();
}
