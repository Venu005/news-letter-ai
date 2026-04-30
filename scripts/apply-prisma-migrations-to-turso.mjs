#!/usr/bin/env node
/**
 * Applies each prisma/migrations/<folder>/migration.sql to Turso using DATABASE_URL + TURSO_AUTH_TOKEN.
 *
 * Prisma Migrate / db push CLI cannot target libsql:// URLs; they use file:./dev.db locally (see prisma.config.ts).
 * Run this after migrate dev to sync DDL to Turso.
 *
 * Usage:
 *   pnpm db:apply-turso
 *
 * Requires Node 20.6+ (--env-file) or export vars manually before running.
 */

import { createClient } from "@libsql/client";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

const url = process.env.DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

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

    console.log(`Applying ${dir} (${stmts.length} statements)...`);
    await client.migrate(stmts);
    console.log(`  OK`);
  }
  console.log("All migrations applied to Turso.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  client.close();
}
