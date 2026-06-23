/**
 * workload.ts
 * ───────────
 * RevOps progress signals + rule-based next-month workload recommendation.
 *
 * Pure functions over the current period — no side effects, deterministic.
 * The recommendation engine is rule-based (same philosophy as aiReasoning.ts);
 * swap in an LLM later behind the same signature if desired.
 */

import type { PeriodData, TeamWorkforce, EVMInput, FpaModel } from "@/types/dashboard";
import { computeEVM } from "./evm";

/**
 * EVM inputs for a team, keyed to its type:
 *  - revenue team → Earned Value = GP actually earned, Planned Value = GP target
 *    to date (the minimum work to hit the revenue), Actual Cost = people cost.
 *    So SPI = GP earned / GP planned, CPI = GP earned / people cost (ROI-style).
 *  - support team → standard EVM from its stored inputs.
 */
export function effectiveTeamEVM(t: TeamWorkforce, fpa?: FpaModel): EVMInput {
  if (t.type === "revenue" && fpa) {
    const ft = fpa.teams.find((x) => x.team === t.team);
    if (ft) {
      const closed = ft.monthly.filter((m) => m.gpActual !== null);
      const ev = closed.reduce((a, m) => a + (m.gpActual ?? 0), 0);
      const pv = closed.reduce((a, m) => a + m.gpTarget, 0);
      return { bac: ft.q2Target, pv, ev, ac: t.totalCost };
    }
  }
  return t.evm;
}

export interface WorkloadRec {
  team: string;
  headcount: number;
  utilization: number;
  spi: number;
  status: "Quá tải" | "Cân bằng" | "Dư công suất";
  tone: "red" | "amber" | "emerald";
  /** Recommended action for next month. */
  recommendation: string;
  /** Suggested headcount delta for next month (rough rule-based estimate). */
  headcountDelta: number;
}

/**
 * Recommend next-month workload for a team from utilization, EVM and attrition.
 * @param attritionHigh  attrition % considered "high" (from settings.thresholds)
 */
export function recommendWorkload(t: TeamWorkforce, attritionHigh = 16, fpa?: FpaModel): WorkloadRec {
  const e = computeEVM(effectiveTeamEVM(t, fpa));
  const u = t.utilization;

  let status: WorkloadRec["status"];
  let tone: WorkloadRec["tone"];
  let recommendation: string;
  let headcountDelta = 0;

  if (u >= 90) {
    status = "Quá tải";
    tone = "red";
    // headcount needed to bring utilization back to ~85%
    headcountDelta = Math.max(1, Math.round(t.headcount * (u / 85 - 1)));
    recommendation = `Quá tải — bổ sung ~${headcountDelta} người hoặc giãn khối lượng tháng sau.`;
  } else if (u < 70) {
    status = "Dư công suất";
    tone = "amber";
    recommendation = "Dư công suất — phân bổ thêm pipeline/khối lượng cho team.";
  } else {
    status = "Cân bằng";
    tone = "emerald";
    recommendation = "Cân bằng — giữ mức phân bổ hiện tại.";
  }

  if (t.attrition >= attritionHigh) {
    headcountDelta += 1;
    recommendation += ` Ưu tiên backfill (attrition ${t.attrition}%).`;
  }
  if (e.spi < 0.9) {
    recommendation += ` Đang chậm tiến độ (SPI ${e.spi.toFixed(2)}) — cân nhắc tái phân bổ.`;
  }

  return { team: t.team, headcount: t.headcount, utilization: u, spi: e.spi, status, tone, recommendation, headcountDelta };
}

export interface RevOpsProgress {
  revenuePct: number;   // revenue vs budget target
  forecastPct: number;  // forecast base vs full-year target
  pipeline: number;     // pipeline coverage ratio (from customer scorecard)
}

/** RevOps headline progress for the period. */
export function revOpsProgress(d: PeriodData): RevOpsProgress {
  const revenuePct = d.revenueTarget > 0 ? (d.revenue / d.revenueTarget) * 100 : 0;
  const forecastPct = d.forecastTarget > 0 ? (d.forecastBase / d.forecastTarget) * 100 : 0;
  const pipeline = d.scorecard.customer.subs.find((s) => /pipeline/i.test(s.name))?.value ?? 0;
  return { revenuePct, forecastPct, pipeline };
}
