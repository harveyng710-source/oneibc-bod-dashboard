/**
 * csvParser.ts
 * ─────────────
 * Parses a flat CSV (exported from Google Sheets or uploaded manually)
 * into the DashboardData shape.
 *
 * Expected CSV schema (one row = one KPI reading):
 * ┌──────────┬────────┬──────────────┬────────┬─────────┬──────┬───────┬──────────┬───────────┐
 * │ section  │ period │ metric       │ value  │ target  │ pct  │ trend │ severity │  owner    │
 * └──────────┴────────┴──────────────┴────────┴─────────┴──────┴───────┴──────────┴───────────┘
 *
 * Sections (case-insensitive):
 *   kpi          → period-level KPIs (revenue, gp, ebitda, forecastBase, forecastTarget)
 *   scorecard    → scorecard pillar sub-KPIs
 *   risk         → enterprise risks
 *   initiative   → strategic initiatives
 *   department   → department breakdown
 *   narrative    → executive narrative bullets
 *   chart        → quarterly chart points
 *   story        → management stories
 *   report       → report library items
 *
 * This is intentionally permissive — unknown rows are silently ignored,
 * and missing fields fall back to sensible defaults.
 */

import Papa from "papaparse";
import { STATIC_DASHBOARD_DATA } from "./staticData";
import type { DashboardData, PeriodData } from "@/types/dashboard";

// ── helpers ──────────────────────────────────────────────────────────────────

function num(v: string | undefined): number {
  const n = parseFloat((v ?? "0").replace(/[,$%]/g, ""));
  return isNaN(n) ? 0 : n;
}

function str(v: string | undefined): string {
  return (v ?? "").trim();
}

function trendVal(v: string | undefined): "up" | "down" | "flat" {
  const s = str(v).toLowerCase();
  if (s === "up" || s === "increase" || s === "rising") return "up";
  if (s === "down" || s === "decrease" || s === "falling") return "down";
  return "flat";
}

// ── types for raw CSV rows ────────────────────────────────────────────────────

interface RawRow {
  section?: string;
  period?: string;
  metric?: string;
  value?: string;
  target?: string;
  pct?: string;
  trend?: string;
  severity?: string;
  owner?: string;
  label?: string;
  status?: string;
  progress?: string;
  sentiment?: string;
  summary?: string;
  thread?: string;
  time?: string;
  updated?: string;
  framework?: string;
  desc?: string;
  q?: string;
  actual?: string;
  base?: string;
  weight?: string;
  spark?: string;         // comma-separated numbers
  pillar?: string;
  name?: string;
  council?: string;
  accountable?: string;
  [key: string]: string | undefined;
}

// ── main parser ──────────────────────────────────────────────────────────────

export async function parseCsvUrl(csvUrl: string): Promise<DashboardData> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        try {
          const data = buildFromRows(results.data as RawRow[]);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      },
      error: (err: Error) => reject(err),
    });
  });
}

export function parseCsvString(csvText: string): DashboardData {
  const results = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return buildFromRows(results.data);
}

// ── row aggregator ────────────────────────────────────────────────────────────

function buildFromRows(rows: RawRow[]): DashboardData {
  // We start from the static scaffold and only overwrite what the CSV provides.
  const base: DashboardData = JSON.parse(JSON.stringify(STATIC_DASHBOARD_DATA));
  base.source = "csv";
  base.lastRefreshed = new Date().toISOString();

  const periodMap = new Map<string, PeriodData>();
  for (const p of base.periods) periodMap.set(p.period, p);

  for (const row of rows) {
    const section = str(row.section).toLowerCase();
    const period  = str(row.period).toLowerCase();

    if (!period && !["story", "report", "structural_risk"].includes(section)) continue;

    // Ensure period entry exists
    if (period && !periodMap.has(period)) {
      const label = str(row.label) || period.toUpperCase();
      periodMap.set(period, JSON.parse(JSON.stringify(base.periods[0])) as PeriodData);
      periodMap.get(period)!.period = period;
      periodMap.get(period)!.label = label;
    }

    const pd = periodMap.get(period);

    switch (section) {
      // ── KPI row ──────────────────────────────────────────────────────────
      case "kpi": {
        if (!pd) break;
        const metric = str(row.metric).toLowerCase().replace(/\s+/g, "_");
        if (metric === "revenue")        { pd.revenue        = num(row.value); pd.revenueTarget  = num(row.target); }
        if (metric === "gross_profit" || metric === "gp") { pd.gp = num(row.value); pd.gpTarget = num(row.target); }
        if (metric === "ebitda")         { pd.ebitda         = num(row.value); pd.ebitdaTarget   = num(row.target); }
        if (metric === "forecast_base")  pd.forecastBase   = num(row.value);
        if (metric === "forecast_target") pd.forecastTarget= num(row.value);
        if (metric === "revenue_spark" && row.spark)   pd.revenueSpark = row.spark.split(",").map(Number);
        if (metric === "gp_spark"     && row.spark)    pd.gpSpark      = row.spark.split(",").map(Number);
        if (metric === "ebitda_spark"  && row.spark)   pd.ebitdaSpark  = row.spark.split(",").map(Number);
        break;
      }
      // ── Scorecard sub-KPI ────────────────────────────────────────────────
      case "scorecard": {
        if (!pd) break;
        const pillar = str(row.pillar).toLowerCase() as keyof typeof pd.scorecard;
        const pillarObj = pd.scorecard[pillar];
        if (!pillarObj) break;

        const metricName = str(row.metric || row.name);
        const existing = pillarObj.subs.find((s) => s.name === metricName);
        if (existing) {
          existing.value  = num(row.value);
          if (row.weight) existing.weight = num(row.weight);
        } else {
          pillarObj.subs.push({ name: metricName, weight: num(row.weight), value: num(row.value) });
        }
        if (row.value) {
          // Recompute pillar score as weighted average
          const total = pillarObj.subs.reduce((acc, s) => acc + s.value * s.weight, 0);
          const totalWeight = pillarObj.subs.reduce((acc, s) => acc + s.weight, 0);
          pillarObj.score = Math.round(totalWeight > 0 ? total / totalWeight : total);
        }
        if (row.trend && !isNaN(Number(row.trend))) pillarObj.trend = num(row.trend);
        break;
      }
      // ── Risk ─────────────────────────────────────────────────────────────
      case "risk": {
        if (!pd) break;
        const area  = str(row.area || row.metric || row.name);
        const existing = pd.risks.find((r) => r.area === area);
        const entry = {
          area,
          desc:  str(row.desc),
          sev:   (str(row.severity) as "Low" | "Medium" | "High") || "Low",
          trend: trendVal(row.trend),
          owner: str(row.owner),
        };
        if (existing) Object.assign(existing, entry);
        else pd.risks.push(entry);
        break;
      }
      // ── Initiative ───────────────────────────────────────────────────────
      case "initiative": {
        if (!pd) break;
        const name = str(row.name || row.metric);
        const existing = pd.initiatives.find((i) => i.name === name);
        if (existing) {
          if (row.status)   existing.status   = str(row.status) as typeof existing.status;
          if (row.progress) existing.progress = num(row.progress);
        } else {
          pd.initiatives.push({
            name,
            status:   str(row.status) as "On Track" | "At Risk" | "Delayed" || "On Track",
            progress: num(row.progress),
          });
        }
        break;
      }
      // ── Department ───────────────────────────────────────────────────────
      case "department": {
        if (!pd) break;
        const dName = str(row.name || row.metric);
        const existing = pd.departments.find((d) => d.name === dName);
        if (existing) {
          if (row.value) existing.value = num(row.value);
          if (row.pct)   existing.pct   = num(row.pct);
        } else {
          pd.departments.push({ name: dName, value: num(row.value), pct: num(row.pct) });
        }
        break;
      }
      // ── Narrative ────────────────────────────────────────────────────────
      case "narrative": {
        if (!pd) break;
        const text = str(row.value || row.metric || row.label);
        if (text) pd.narrative = [...pd.narrative.filter((n) => n !== text), text];
        break;
      }
      // ── Chart ────────────────────────────────────────────────────────────
      case "chart": {
        if (!pd) break;
        const q = str(row.q || row.metric);
        const point = pd.chart.find((c) => c.q === q);
        if (point) {
          if (row.actual !== undefined) point.actual = row.actual === "" || row.actual === "null" ? null : num(row.actual);
          if (row.base)   point.base   = num(row.base);
          if (row.target) point.target = num(row.target);
        } else {
          pd.chart.push({
            q,
            actual: row.actual === "" || row.actual === "null" ? null : num(row.actual),
            base:   num(row.base),
            target: num(row.target),
          });
        }
        break;
      }
      // ── Story ────────────────────────────────────────────────────────────
      case "story": {
        const title = str(row.title || row.name || row.metric);
        if (!title) break;
        const existing = base.stories.find((s) => s.title === title);
        const entry = {
          title,
          sentiment: str(row.sentiment) as "Positive" | "Watch" | "Action" || "Watch",
          summary: str(row.summary),
          thread: str(row.thread),
          time: str(row.time),
        };
        if (existing) Object.assign(existing, entry);
        else base.stories.push(entry);
        break;
      }
      // ── Report ───────────────────────────────────────────────────────────
      case "report": {
        const name = str(row.name || row.metric);
        if (!name) break;
        const existing = base.reports.find((r) => r.name === name);
        if (existing) existing.updated = str(row.updated);
        else base.reports.push({ name, updated: str(row.updated) });
        break;
      }
    }
  }

  // Rebuild periods array from the map (preserve insertion order of keys)
  base.periods = Array.from(periodMap.values());
  return base;
}
