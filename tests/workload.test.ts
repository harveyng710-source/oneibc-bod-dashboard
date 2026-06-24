import { describe, it, expect } from "vitest";
import { recommendWorkload, effectiveTeamEVM } from "@/lib/workload";
import type { TeamWorkforce, FpaModel } from "@/types/dashboard";

const base: TeamWorkforce = {
  team: "RM + Bank",
  type: "support",
  headcount: 40,
  utilization: 80,
  attrition: 10,
  costPerHead: 90,
  totalCost: 3.6,
  revenueContribution: 16,
  evm: { bac: 5, pv: 2.5, ev: 2.6, ac: 2.4 },
};

describe("recommendWorkload", () => {
  it("flags overload above 90% utilization with a positive headcount delta", () => {
    const r = recommendWorkload({ ...base, utilization: 95 });
    expect(r.status).toBe("Quá tải");
    expect(r.tone).toBe("red");
    expect(r.headcountDelta).toBeGreaterThan(0);
  });

  it("flags spare capacity below 70%", () => {
    const r = recommendWorkload({ ...base, utilization: 60 });
    expect(r.status).toBe("Dư công suất");
    expect(r.tone).toBe("amber");
  });

  it("is balanced in the 70–90% band", () => {
    expect(recommendWorkload({ ...base, utilization: 80 }).status).toBe("Cân bằng");
  });

  it("adds a backfill when attrition is at/above the threshold", () => {
    const low = recommendWorkload({ ...base, utilization: 80, attrition: 5 }).headcountDelta;
    const high = recommendWorkload({ ...base, utilization: 80, attrition: 20 }, 16).headcountDelta;
    expect(high).toBe(low + 1);
  });
});

describe("effectiveTeamEVM", () => {
  it("keys a revenue team's EVM to its closed-month GP and people cost", () => {
    const fpa: FpaModel = {
      q2TargetGP: 1,
      teams: [
        {
          team: "RM + Bank",
          type: "revenue",
          q2Target: 1.2,
          posteriorRate: 0.5,
          bayesianForecast: 0.6,
          pipelineForecast: 0.5,
          confidence: "High",
          monthly: [
            { month: "M1", gpTarget: 0.3, gpActual: 0.25, revenue: 0.5 },
            { month: "M2", gpTarget: 0.3, gpActual: null, revenue: null }, // open → excluded
          ],
        },
      ],
      scenarios: [],
      ci: { p80Low: 0, p80High: 0, p95Low: 0, p95High: 0 },
    };
    const e = effectiveTeamEVM({ ...base, team: "RM + Bank", type: "revenue", totalCost: 0.4 }, fpa);
    expect(e.bac).toBe(1.2); // q2Target
    expect(e.ev).toBeCloseTo(0.25, 5); // only closed months
    expect(e.pv).toBeCloseTo(0.3, 5);
    expect(e.ac).toBe(0.4); // people cost
  });

  it("falls back to stored EVM for a support team", () => {
    expect(effectiveTeamEVM(base)).toEqual(base.evm);
  });
});
