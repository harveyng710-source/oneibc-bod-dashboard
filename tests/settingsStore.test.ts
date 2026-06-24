import { describe, it, expect } from "vitest";
import { applyWeightOverrides, applyHrmsOverrides } from "@/lib/settingsStore";
import type { DashboardData, PeriodData } from "@/types/dashboard";

function periodWith(over: Partial<PeriodData>): PeriodData {
  return {
    period: "jun",
    label: "Jun",
    compareLabel: "",
    revenue: 0, revenueTarget: 0, revenueForecast: 0, revenueSpark: [],
    gp: 0, gpTarget: 0, gpForecast: 0, gpSpark: [],
    ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0, ebitdaSpark: [],
    forecastBase: 0, forecastTarget: 0,
    scorecard: {
      financial: { score: 0, trend: 0, subs: [] },
      customer: { score: 0, trend: 0, subs: [] },
      operational: { score: 0, trend: 0, subs: [] },
      technology: { score: 0, trend: 0, subs: [] },
    },
    risks: [], chart: [], initiatives: [], narrative: [], departments: [],
    ...over,
  };
}

const wrap = (p: PeriodData): DashboardData => ({
  periods: [p], stories: [], councils: [], structuralRisks: [], reports: [],
});

describe("applyWeightOverrides", () => {
  it("recomputes the pillar score from overridden sub-KPI weights (pure)", () => {
    const p = periodWith({
      scorecard: {
        financial: { score: 80, trend: 0, subs: [
          { name: "A", weight: 0.5, value: 90 },
          { name: "B", weight: 0.5, value: 70 },
        ] },
        customer: { score: 0, trend: 0, subs: [] },
        operational: { score: 0, trend: 0, subs: [] },
        technology: { score: 0, trend: 0, subs: [] },
      },
    });
    const data = wrap(p);
    const out = applyWeightOverrides(data, { "financial.A": 0.9, "financial.B": 0.1 });
    // (90*.9 + 70*.1)/1 = 88
    expect(out.periods[0].scorecard.financial.score).toBe(88);
    // input untouched
    expect(data.periods[0].scorecard.financial.score).toBe(80);
  });

  it("is a no-op when no overrides are given", () => {
    const data = wrap(periodWith({}));
    expect(applyWeightOverrides(data, {})).toBe(data);
  });
});

describe("applyHrmsOverrides", () => {
  it("overrides per-team fields and recomputes company aggregates + totalCost", () => {
    const p = periodWith({
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 0, utilization: 0, attrition: 0, costPerHead: 0,
          teams: [
            { team: "A", type: "revenue", headcount: 10, utilization: 80, attrition: 10, costPerHead: 100, totalCost: 1, revenueContribution: 5, evm: { bac: 1, pv: 1, ev: 1, ac: 1 } },
            { team: "B", type: "support", headcount: 30, utilization: 90, attrition: 15, costPerHead: 80, totalCost: 2.4, revenueContribution: 8, evm: { bac: 1, pv: 1, ev: 1, ac: 1 } },
          ],
        },
      },
    });
    const out = applyHrmsOverrides(wrap(p), { A: { headcount: 20, costPerHead: 100 } });
    const wf = out.periods[0].operations!.workforce!;
    const a = wf.teams!.find((t) => t.team === "A")!;
    expect(a.headcount).toBe(20);
    expect(a.totalCost).toBe(2); // 20 * 100 / 1000
    expect(wf.headcount).toBe(50); // 20 + 30
    // headcount-weighted utilization (80*20 + 90*30)/50 = 86
    expect(wf.utilization).toBe(86);
  });
});
