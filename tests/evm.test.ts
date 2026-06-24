import { describe, it, expect } from "vitest";
import { computeEVM, rollupEVM } from "@/lib/evm";

describe("computeEVM", () => {
  it("derives the standard PMI metrics from BAC/PV/EV/AC", () => {
    const r = computeEVM({ bac: 100, pv: 50, ev: 45, ac: 50 });
    expect(r.sv).toBe(-5); // EV - PV
    expect(r.cv).toBe(-5); // EV - AC
    expect(r.spi).toBeCloseTo(0.9, 5); // 45/50
    expect(r.cpi).toBeCloseTo(0.9, 5); // 45/50
    expect(r.eac).toBeCloseTo(100 / 0.9, 4); // BAC / CPI
    expect(r.etc).toBeCloseTo(100 / 0.9 - 50, 4); // EAC - AC
    expect(r.vac).toBeCloseTo(100 - 100 / 0.9, 4); // BAC - EAC
    expect(r.percentComplete).toBeCloseTo(45, 5); // EV/BAC*100
  });

  it("classifies health from the worst of SPI/CPI", () => {
    expect(computeEVM({ bac: 10, pv: 5, ev: 6, ac: 5 }).health).toBe("ahead"); // both >= 1
    expect(computeEVM({ bac: 10, pv: 5, ev: 4, ac: 5 }).health).toBe("behind"); // spi 0.8 < 0.9
    expect(computeEVM({ bac: 10, pv: 5, ev: 4.75, ac: 5 }).health).toBe("on-track"); // 0.95
  });

  it("guards division by zero (PV/AC ~ 0 → index falls back to 1)", () => {
    const r = computeEVM({ bac: 10, pv: 0, ev: 0, ac: 0 });
    expect(r.spi).toBe(1);
    expect(r.cpi).toBe(1);
    expect(Number.isFinite(r.eac)).toBe(true);
    expect(Number.isNaN(r.percentComplete)).toBe(false);
  });
});

describe("rollupEVM", () => {
  it("sums inputs before computing (portfolio roll-up)", () => {
    const r = rollupEVM([
      { bac: 50, pv: 25, ev: 20, ac: 22 },
      { bac: 50, pv: 25, ev: 30, ac: 28 },
    ]);
    expect(r.bac).toBe(100);
    expect(r.ev).toBe(50);
    expect(r.ac).toBe(50);
    expect(r.cpi).toBeCloseTo(1, 5); // 50/50
  });
});
