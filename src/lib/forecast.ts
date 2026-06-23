/**
 * forecast.ts
 * ───────────
 * Combines the two forecast sources into a single confidence read:
 *   1. Bayesian (workbook posterior-rate model).
 *   2. Salesforce pipeline (median quote × stage %).
 *
 * Confidence is high when the two models agree and the team's own data
 * confidence is high. Pure functions, deterministic.
 */

import type { FpaModel } from "@/types/dashboard";

export interface TeamDualForecast {
  team: string;
  bayes: number;        // $M
  pipeline: number;     // $M
  blended: number;      // $M
  agreementPct: number; // how close the two models are
  confidencePct: number;
  confidence: string;   // team's stated data confidence
}

export interface DualForecast {
  teams: TeamDualForecast[];
  bayesTotal: number;
  pipelineTotal: number;
  blendedTotal: number;
  confidencePct: number; // overall blended confidence
}

const CONF_FACTOR: Record<string, number> = { High: 1, Medium: 0.85, Low: 0.6 };

export function dualForecast(fpa: FpaModel): DualForecast {
  const teams: TeamDualForecast[] = fpa.teams.map((t) => {
    const bayes = t.bayesianForecast;
    const pipeline = t.pipelineForecast;
    const mx = Math.max(bayes, pipeline, 0.0001);
    const agreementPct = Math.max(0, Math.round((1 - Math.abs(bayes - pipeline) / mx) * 100));
    const blended = (bayes + pipeline) / 2;
    const confidencePct = Math.round(agreementPct * (CONF_FACTOR[t.confidence] ?? 0.8));
    return { team: t.team, bayes, pipeline, blended, agreementPct, confidencePct, confidence: t.confidence };
  });

  const bayesTotal = teams.reduce((a, t) => a + t.bayes, 0);
  const pipelineTotal = teams.reduce((a, t) => a + t.pipeline, 0);
  const blendedTotal = teams.reduce((a, t) => a + t.blended, 0);
  const wsum = blendedTotal || 1;
  const confidencePct = Math.round(teams.reduce((a, t) => a + t.confidencePct * t.blended, 0) / wsum);

  return { teams, bayesTotal, pipelineTotal, blendedTotal, confidencePct };
}
