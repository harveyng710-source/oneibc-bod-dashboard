/**
 * db.ts
 * ─────
 * Thin Postgres access layer (node-postgres).
 *
 * - Lazily creates a single pool from DATABASE_URL.
 * - Bootstraps the schema once (CREATE TABLE IF NOT EXISTS) — no migration tool.
 * - Degrades gracefully: if DATABASE_URL is unset, `isDbEnabled()` is false and
 *   callers fall back to in-memory defaults so the app still runs (e.g. the
 *   current static deploy, or local dev without Postgres).
 *
 * Railway: add the Postgres plugin; it injects DATABASE_URL. Internal
 * connections don't need SSL. For an external/proxy URL set DATABASE_SSL=require.
 */

import { Pool } from "pg";
import type { QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function isDbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }
  return pool;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS access_logs (
    id      BIGSERIAL PRIMARY KEY,
    ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor   TEXT,
    action  TEXT NOT NULL,
    detail  TEXT
  );
  CREATE TABLE IF NOT EXISTS chat_history (
    id      BIGSERIAL PRIMARY KEY,
    ts      TIMESTAMPTZ NOT NULL DEFAULT now(),
    role    TEXT NOT NULL,
    content TEXT NOT NULL,
    period  TEXT
  );
`;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later call can retry after a transient failure.
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

/** Run a query against the pool, bootstrapping the schema on first use. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!isDbEnabled()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  await ensureSchema();
  const res = await getPool().query<T>(text, params);
  return res.rows;
}
