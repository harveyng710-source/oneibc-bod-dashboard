/**
 * settingsStore.ts
 * ────────────────
 * Typed access to persisted app settings, access logs and AI chat history.
 *
 * Backed by Postgres (lib/db). When DATABASE_URL is unset every read returns
 * the in-memory DEFAULT_SETTINGS and every write is a no-op, so the dashboard
 * keeps working without a database.
 */

import { isDbEnabled, query } from "@/lib/db";
import type { DashboardData } from "@/types/dashboard";

// ── Settings shape ────────────────────────────────────────────────────────────

export interface AppSettings {
  /** Sub-KPI weight overrides, keyed by `${pillar}.${subName}` → weight (0..1). */
  scorecardWeights: Record<string, number>;
  /** Weight of each pillar in the composite Company Health index. */
  pillarWeights: { financial: number; customer: number; operational: number; technology: number };
  /** Tunable thresholds used across the dashboard. */
  thresholds: { spiWarn: number; cpiWarn: number; attritionHigh: number };
  /** Google Sheet / CSV template configuration (display + guidance). */
  sheetTemplate: { sheetId: string; sheetTab: string; csvUrl: string; mappingNote: string };
  /** Claude API key (stored as-is; masked when returned to the client). */
  apiKey: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  scorecardWeights: {},
  pillarWeights: { financial: 0.35, customer: 0.25, operational: 0.25, technology: 0.15 },
  thresholds: { spiWarn: 0.9, cpiWarn: 0.9, attritionHigh: 16 },
  sheetTemplate: { sheetId: "", sheetTab: "Sheet1", csvUrl: "", mappingNote: "" },
  apiKey: "",
};

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];

// ── Read / write ──────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  if (!isDbEnabled()) return structuredClone(DEFAULT_SETTINGS);
  try {
    const rows = await query<{ key: string; value: unknown }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [KEYS]
    );
    const merged = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, unknown>;
    for (const r of rows) merged[r.key] = r.value;
    return merged as unknown as AppSettings;
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  if (!isDbEnabled()) return;
  for (const key of Object.keys(patch) as (keyof AppSettings)[]) {
    if (!KEYS.includes(key)) continue;
    await query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, JSON.stringify(patch[key])]
    );
  }
}

/** Mask an API key for display (keep last 4 chars). */
export function maskKey(key: string): string {
  if (!key) return "";
  return key.length <= 4 ? "••••" : `${"•".repeat(Math.min(key.length - 4, 24))}${key.slice(-4)}`;
}

// ── Access logs ───────────────────────────────────────────────────────────────

export type AccessLog = {
  id: string;
  ts: string;
  actor: string | null;
  action: string;
  detail: string | null;
};

export async function logAccess(action: string, detail?: string, actor?: string): Promise<void> {
  if (!isDbEnabled()) return;
  try {
    await query(`INSERT INTO access_logs (actor, action, detail) VALUES ($1, $2, $3)`, [
      actor ?? null,
      action,
      detail ?? null,
    ]);
  } catch {
    /* logging must never break a request */
  }
}

export async function getLogs(limit = 100): Promise<AccessLog[]> {
  if (!isDbEnabled()) return [];
  try {
    return await query<AccessLog>(
      `SELECT id::text, ts, actor, action, detail FROM access_logs ORDER BY id DESC LIMIT $1`,
      [limit]
    );
  } catch {
    return [];
  }
}

// ── AI chat history ───────────────────────────────────────────────────────────

export type ChatRow = {
  id: string;
  ts: string;
  role: string;
  content: string;
  period: string | null;
};

export async function addChat(role: string, content: string, period?: string): Promise<void> {
  if (!isDbEnabled()) return;
  try {
    await query(`INSERT INTO chat_history (role, content, period) VALUES ($1, $2, $3)`, [
      role,
      content,
      period ?? null,
    ]);
  } catch {
    /* ignore */
  }
}

export async function getChat(limit = 200): Promise<ChatRow[]> {
  if (!isDbEnabled()) return [];
  try {
    return await query<ChatRow>(
      `SELECT id::text, ts, role, content, period FROM chat_history ORDER BY id DESC LIMIT $1`,
      [limit]
    );
  } catch {
    return [];
  }
}

export async function clearChat(): Promise<void> {
  if (!isDbEnabled()) return;
  try {
    await query(`DELETE FROM chat_history`);
  } catch {
    /* ignore */
  }
}

// ── Apply weight overrides to dashboard data ──────────────────────────────────

/**
 * Recompute each scorecard pillar's score from any overridden sub-KPI weights.
 * Pure: returns a new DashboardData, leaving the input untouched.
 */
export function applyWeightOverrides(data: DashboardData, weights: Record<string, number>): DashboardData {
  if (!weights || Object.keys(weights).length === 0) return data;
  const next = structuredClone(data);
  for (const period of next.periods) {
    for (const pillar of Object.keys(period.scorecard) as (keyof typeof period.scorecard)[]) {
      const p = period.scorecard[pillar];
      let total = 0;
      let totalW = 0;
      for (const sub of p.subs) {
        const w = weights[`${pillar}.${sub.name}`] ?? sub.weight;
        sub.weight = w;
        total += sub.value * w;
        totalW += w;
      }
      if (totalW > 0) p.score = Math.round(total / totalW);
    }
  }
  return next;
}
