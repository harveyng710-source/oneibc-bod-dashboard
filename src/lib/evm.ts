/**
 * evm.ts
 * ──────
 * Earned Value Management (PMI standard) math.
 *
 * Inputs are the four primitives: BAC, PV, EV, AC.
 * Everything else is derived — we never store derived values so the
 * dashboard can't drift into internally-inconsistent numbers.
 *
 * Money figures are in $M; ratios are unitless; percentages are 0–100.
 */

import type { EVMInput } from "@/types/dashboard";

export interface EVMResult extends EVMInput {
  sv: number;          // Schedule Variance = EV − PV   (>0 ahead)
  cv: number;          // Cost Variance     = EV − AC   (>0 under budget)
  spi: number;         // Schedule Perf Index = EV / PV (>1 ahead)
  cpi: number;         // Cost Perf Index     = EV / AC (>1 efficient)
  eac: number;         // Estimate At Completion = BAC / CPI
  etc: number;         // Estimate To Complete   = EAC − AC
  vac: number;         // Variance At Completion = BAC − EAC (>0 under budget)
  percentComplete: number; // EV / BAC × 100
  health: "ahead" | "on-track" | "behind"; // composite of SPI & CPI
}

/** Safe division — returns `fallback` when the denominator is ~0. */
function div(n: number, d: number, fallback = 0): number {
  return Math.abs(d) < 1e-9 ? fallback : n / d;
}

export function computeEVM(input: EVMInput): EVMResult {
  const { bac, pv, ev, ac } = input;

  const sv = ev - pv;
  const cv = ev - ac;
  const spi = div(ev, pv, 1);
  const cpi = div(ev, ac, 1);
  const eac = cpi > 1e-9 ? bac / cpi : bac;
  const etc = eac - ac;
  const vac = bac - eac;
  const percentComplete = div(ev, bac, 0) * 100;

  // Composite health: both indices ≥ 1 → ahead; either < 0.9 → behind.
  const worst = Math.min(spi, cpi);
  const health: EVMResult["health"] =
    worst >= 1 ? "ahead" : worst < 0.9 ? "behind" : "on-track";

  return { bac, pv, ev, ac, sv, cv, spi, cpi, eac, etc, vac, percentComplete, health };
}

/** Aggregate several EVM inputs (e.g. all teams) into one roll-up. */
export function rollupEVM(inputs: EVMInput[]): EVMResult {
  const sum = inputs.reduce(
    (a, e) => ({ bac: a.bac + e.bac, pv: a.pv + e.pv, ev: a.ev + e.ev, ac: a.ac + e.ac }),
    { bac: 0, pv: 0, ev: 0, ac: 0 }
  );
  return computeEVM(sum);
}

/** One-line formatter for an index (e.g. "1.04" or "0.92"). */
export const fmtIndex = (n: number): string => n.toFixed(2);
