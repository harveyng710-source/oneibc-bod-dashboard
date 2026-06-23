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
  // EVM + team-workforce columns
  team?: string;
  headcount?: string;
  total_cost?: string;
  revenue_contribution?: string;
  bac?: string;
  pv?: string;
  ev?: string;
  ac?: string;
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
        const hasEvm = row.bac || row.pv || row.ev || row.ac;
        const evm = hasEvm
          ? { bac: num(row.bac), pv: num(row.pv), ev: num(row.ev), ac: num(row.ac) }
          : undefined;
        if (existing) {
          if (row.status)   existing.status   = str(row.status) as typeof existing.status;
          if (row.progress) existing.progress = num(row.progress);
          if (evm)          existing.evm      = evm;
        } else {
          pd.initiatives.push({
            name,
            status:   str(row.status) as "On Track" | "At Risk" | "Delayed" || "On Track",
            progress: num(row.progress),
            ...(evm ? { evm } : {}),
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
      // ── Operations Centers ────────────────────────────────────────────────
      case "operations_center": {
        if (!pd) break;
        if (!pd.operations) pd.operations = { serviceCenters: [], suppliers: [] };
        const name = str(row.name || row.metric);
        const existing = pd.operations.serviceCenters.find(sc => sc.name === name);
        const entry = {
          name,
          actual: num(row.actual || row.value),
          target: num(row.target),
          cost: num(row.cost),
          type: (str(row.type) as "HQ" | "Fulfillment" | "Procurement") || "Fulfillment",
        };
        if (existing) Object.assign(existing, entry);
        else pd.operations.serviceCenters.push(entry);
        break;
      }
      // ── Supply Partners ───────────────────────────────────────────────────
      case "supply_partner": {
        if (!pd) break;
        if (!pd.operations) pd.operations = { serviceCenters: [], suppliers: [] };
        const name = str(row.name || row.metric);
        const existing = pd.operations.suppliers.find(s => s.name === name);
        const entry = {
          name,
          category: (str(row.category) as "Bank" | "Agent") || "Bank",
          performance: num(row.performance || row.pct),
          spend: num(row.spend || row.value),
        };
        if (existing) Object.assign(existing, entry);
        else pd.operations.suppliers.push(entry);
        break;
      }
      // ── Workforce ─────────────────────────────────────────────────────────
      case "workforce": {
        if (!pd) break;
        if (!pd.operations) pd.operations = { serviceCenters: [], suppliers: [] };
        if (!pd.operations.workforce) {
          pd.operations.workforce = { headcount: 0, utilization: 0, attrition: 0, costPerHead: 0 };
        }
        const metric = str(row.metric).toLowerCase().replace(/\s+/g, "_");
        if (metric === "headcount")      pd.operations.workforce.headcount = num(row.value);
        if (metric === "utilization")    pd.operations.workforce.utilization = num(row.value || row.pct);
        if (metric === "attrition")      pd.operations.workforce.attrition = num(row.value || row.pct);
        if (metric === "cost_per_head")  pd.operations.workforce.costPerHead = num(row.value);
        break;
      }
      // ── Per-team Workforce + EVM (RM+Bank, S&F, Renew, ATA, Marketing, Ops) ──
      case "team_workforce": {
        if (!pd) break;
        if (!pd.operations) pd.operations = { serviceCenters: [], suppliers: [] };
        if (!pd.operations.workforce) {
          pd.operations.workforce = { headcount: 0, utilization: 0, attrition: 0, costPerHead: 0, teams: [] };
        }
        const wf = pd.operations.workforce;
        if (!wf.teams) wf.teams = [];

        const teamName = str(row.team || row.name || row.metric);
        if (!teamName) break;
        const entry = {
          team: teamName,
          type: (str(row.type).toLowerCase() === "support" ? "support" : "revenue") as "revenue" | "support",
          headcount: num(row.headcount ?? row.value),
          utilization: num(row.utilization ?? row.pct),
          attrition: num(row.attrition),
          costPerHead: num(row.cost_per_head),
          totalCost: num(row.total_cost),
          revenueContribution: num(row.revenue_contribution),
          evm: { bac: num(row.bac), pv: num(row.pv), ev: num(row.ev), ac: num(row.ac) },
        };
        const existing = wf.teams.find((t) => t.team === teamName);
        if (existing) Object.assign(existing, entry);
        else wf.teams.push(entry);

        // Recompute company aggregates from the team rows.
        const totalHead = wf.teams.reduce((a, t) => a + t.headcount, 0);
        const totalCost = wf.teams.reduce((a, t) => a + t.totalCost, 0);
        wf.headcount = totalHead;
        wf.utilization = totalHead > 0 ? Math.round(wf.teams.reduce((a, t) => a + t.utilization * t.headcount, 0) / totalHead) : 0;
        wf.attrition = totalHead > 0 ? Math.round(wf.teams.reduce((a, t) => a + t.attrition * t.headcount, 0) / totalHead) : 0;
        wf.costPerHead = totalHead > 0 ? Math.round((totalCost * 1000) / totalHead) : 0;
        break;
      }
      // ── Capital P&L ────────────────────────────────────────────────────────
      case "capital_pl": {
        if (!pd) break;
        if (!pd.capital) pd.capital = { pl: [], cashFlow: [] };
        const item = str(row.item || row.name || row.metric);
        const existing = pd.capital.pl.find(p => p.item === item);
        const entry = {
          item,
          actual: num(row.actual || row.value),
          budget: num(row.budget || row.target),
          variance: num(row.variance),
        };
        if (existing) Object.assign(existing, entry);
        else pd.capital.pl.push(entry);
        break;
      }
      // ── Capital Cash Flow ──────────────────────────────────────────────────
      case "capital_cf": {
        if (!pd) break;
        if (!pd.capital) pd.capital = { pl: [], cashFlow: [] };
        const category = str(row.category || row.name || row.metric);
        const existing = pd.capital.cashFlow.find(c => c.category === category);
        const entry = {
          category,
          inflow: num(row.inflow),
          outflow: num(row.outflow),
          net: num(row.net || row.value),
        };
        if (existing) Object.assign(existing, entry);
        else pd.capital.cashFlow.push(entry);
        break;
      }
      // ── Insight Signals ────────────────────────────────────────────────────
      case "insight_signal": {
        if (!pd) break;
        if (!pd.insights) pd.insights = [];
        const signal = str(row.signal || row.name || row.metric);
        const existing = pd.insights.find(i => i.signal === signal);
        const entry = {
          signal,
          category: (str(row.category) as "Operational" | "Risk" | "Financial") || "Operational",
          description: str(row.description || row.desc),
          confidence: num(row.confidence || row.pct) / (num(row.confidence) > 1 ? 100 : 1), // handle 90 vs 0.9
          impact: (str(row.impact) as "High" | "Medium" | "Low") || "Medium",
        };
        if (existing) Object.assign(existing, entry);
        else pd.insights.push(entry);
        break;
      }
      // ── Revenue Targets (Budget vs Forecast) ──────────────────────────────
      case "revenue_targets": {
        if (!pd) break;
        const metric = str(row.metric).toLowerCase().replace(/\s+/g, "_");
        if (metric === "revenue_forecast") pd.revenueForecast = num(row.value);
        if (metric === "gp_forecast")      pd.gpForecast      = num(row.value);
        if (metric === "ebitda_forecast")  pd.ebitdaForecast  = num(row.value);
        break;
      }
    }
  }

  // Rebuild periods array from the map (preserve insertion order of keys)
  base.periods = Array.from(periodMap.values());
  return base;
}
