import { describe, it, expect } from "vitest";
import { parseRows, parseCsvString } from "@/lib/csvParser";
import type { RawRow } from "@/lib/csvParser";

const row = (r: RawRow): RawRow => r;

describe("parseRows — KPI + scorecard", () => {
  it("maps KPI metrics and parses sparkline arrays", () => {
    const d = parseRows([
      row({ section: "kpi", period: "jun", metric: "revenue", value: "138.7", target: "128" }),
      row({ section: "kpi", period: "jun", metric: "gross_profit", value: "45.9", target: "43" }),
      row({ section: "kpi", period: "jun", metric: "revenue_spark", spark: "1,2,3,4" }),
    ]);
    const p = d.periods.find((x) => x.period === "jun")!;
    expect(p.revenue).toBe(138.7);
    expect(p.revenueTarget).toBe(128);
    expect(p.gp).toBe(45.9);
    expect(p.revenueSpark).toEqual([1, 2, 3, 4]);
  });

  it("keeps the pillar score equal to the weighted average of its sub-KPIs", () => {
    // The parser starts from the static scaffold (which seeds some subs), so we
    // assert the invariant rather than an absolute number: score == Σ(v·w)/Σw.
    const d = parseRows([
      row({ section: "scorecard", period: "jun", pillar: "financial", name: "QA-Test-A", value: "90", weight: "0.5" }),
      row({ section: "scorecard", period: "jun", pillar: "financial", name: "QA-Test-B", value: "70", weight: "0.5" }),
    ]);
    const fin = d.periods.find((x) => x.period === "jun")!.scorecard.financial;
    const totalW = fin.subs.reduce((a, s) => a + s.weight, 0);
    const expected = Math.round(fin.subs.reduce((a, s) => a + s.value * s.weight, 0) / totalW);
    expect(fin.score).toBe(expected);
    // Our two sub-KPIs were actually recorded.
    expect(fin.subs.find((s) => s.name === "QA-Test-A")!.value).toBe(90);
  });
});

describe("parseRows — robustness rules", () => {
  it("strips $ , % and treats empty chart actual as null", () => {
    const d = parseRows([
      row({ section: "kpi", period: "jun", metric: "revenue", value: "$1,250", target: "1000" }),
      row({ section: "chart", period: "jun", q: "Q3", base: "10", target: "12", actual: "" }),
    ]);
    const p = d.periods.find((x) => x.period === "jun")!;
    expect(p.revenue).toBe(1250);
    expect(p.chart.find((c) => c.q === "Q3")!.actual).toBeNull();
  });

  it("normalizes insight confidence whether given as 0.92 or 92", () => {
    const d = parseRows([
      row({ section: "insight_signal", period: "jun", name: "S1", confidence: "0.92" }),
      row({ section: "insight_signal", period: "jun", name: "S2", confidence: "80" }),
    ]);
    const p = d.periods.find((x) => x.period === "jun")!;
    expect(p.insights!.find((i) => i.signal === "S1")!.confidence).toBeCloseTo(0.92, 5);
    expect(p.insights!.find((i) => i.signal === "S2")!.confidence).toBeCloseTo(0.8, 5);
  });

  it("resets seed payables the first time the sheet provides them (no leak)", () => {
    const d = parseRows([
      row({ section: "payable", period: "jun", name: "HSBC", category: "Bank", value: "0.2", status: "Pending" }),
    ]);
    const p = d.periods.find((x) => x.period === "jun")!;
    expect(p.capital!.payables).toHaveLength(1);
    expect(p.capital!.payables![0].supplier).toBe("HSBC");
    expect(p.capital!.payables![0].status).toBe("Pending");
  });

  it("recomputes company workforce aggregates from team rows", () => {
    // Seed-independent invariants: company headcount = Σ team headcount, and
    // utilization = headcount-weighted mean of the teams.
    const d = parseRows([
      row({ section: "team_workforce", period: "jun", team: "QA-A", headcount: "10", utilization: "80", total_cost: "1" }),
      row({ section: "team_workforce", period: "jun", team: "QA-B", headcount: "30", utilization: "90", total_cost: "3" }),
    ]);
    const wf = d.periods.find((x) => x.period === "jun")!.operations!.workforce!;
    const teams = wf.teams!;
    const totalHead = teams.reduce((a, t) => a + t.headcount, 0);
    expect(wf.headcount).toBe(totalHead);
    expect(wf.utilization).toBe(
      Math.round(teams.reduce((a, t) => a + t.utilization * t.headcount, 0) / totalHead)
    );
    // Our two teams were recorded.
    expect(teams.find((t) => t.team === "QA-A")!.headcount).toBe(10);
  });
});

describe("parseRows — FP&A", () => {
  it("derives q2TargetGP from the sum of team targets when not given", () => {
    const d = parseRows([
      row({ section: "fpa_forecast", team: "A", q2_target: "0.5", bayesian: "0.4", pipeline: "0.3", confidence: "High" }),
      row({ section: "fpa_forecast", team: "B", q2_target: "0.5", bayesian: "0.4", pipeline: "0.3", confidence: "Low" }),
    ]);
    expect(d.fpa!.q2TargetGP).toBeCloseTo(1.0, 5);
    expect(d.fpa!.teams).toHaveLength(2);
  });

  it("treats an empty monthly actual as not-yet-closed (null)", () => {
    const d = parseRows([
      row({ section: "fpa_monthly", team: "A", month: "M1", gp_target: "0.1", gp_actual: "0.05" }),
      row({ section: "fpa_monthly", team: "A", month: "M2", gp_target: "0.1", gp_actual: "" }),
    ]);
    const t = d.fpa!.teams.find((x) => x.team === "A")!;
    expect(t.monthly.find((m) => m.month === "M1")!.gpActual).toBe(0.05);
    expect(t.monthly.find((m) => m.month === "M2")!.gpActual).toBeNull();
  });
});

describe("parseCsvString", () => {
  it("parses a flat CSV with normalized headers", () => {
    const csv = "section,period,metric,value,target\nkpi,jun,revenue,100,90\n";
    const d = parseCsvString(csv);
    const p = d.periods.find((x) => x.period === "jun")!;
    expect(p.revenue).toBe(100);
    expect(p.revenueTarget).toBe(90);
    expect(d.source).toBe("csv");
  });
});
