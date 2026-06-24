import { describe, it, expect } from "vitest";
import { dualForecast } from "@/lib/forecast";
import type { FpaModel } from "@/types/dashboard";

const team = (over: Partial<FpaModel["teams"][number]>): FpaModel["teams"][number] => ({
  team: "T",
  type: "revenue",
  q2Target: 1,
  posteriorRate: 0.5,
  bayesianForecast: 1,
  pipelineForecast: 1,
  confidence: "High",
  monthly: [],
  ...over,
});

describe("dualForecast", () => {
  it("blends Bayesian + pipeline and reports 100% agreement when equal", () => {
    const fpa: FpaModel = {
      q2TargetGP: 1,
      teams: [team({ bayesianForecast: 2, pipelineForecast: 2, confidence: "High" })],
      scenarios: [],
      ci: { p80Low: 0, p80High: 0, p95Low: 0, p95High: 0 },
    };
    const r = dualForecast(fpa);
    expect(r.teams[0].blended).toBe(2);
    expect(r.teams[0].agreementPct).toBe(100);
    expect(r.teams[0].confidencePct).toBe(100); // 100 * High(1)
    expect(r.blendedTotal).toBe(2);
  });

  it("lowers agreement when models diverge and scales confidence by data quality", () => {
    const fpa: FpaModel = {
      q2TargetGP: 1,
      teams: [team({ bayesianForecast: 2, pipelineForecast: 1, confidence: "Low" })],
      scenarios: [],
      ci: { p80Low: 0, p80High: 0, p95Low: 0, p95High: 0 },
    };
    const r = dualForecast(fpa);
    expect(r.teams[0].agreementPct).toBe(50); // 1 - |2-1|/2
    expect(r.teams[0].blended).toBe(1.5);
    expect(r.teams[0].confidencePct).toBe(30); // 50 * Low(0.6)
  });
});
