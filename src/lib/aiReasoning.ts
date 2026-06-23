/**
 * aiReasoning.ts
 * ──────────────
 * Rule-based executive reasoning engine.
 *
 * Synthesizes a short, board-ready brief from the current period's data —
 * variance, EVM portfolio health, top risks, margin and workforce signals.
 * This is what lets an Exec "drop in anytime" and get a synthesized read
 * without a team lead writing it.
 *
 * ADAPTER SEAM: `generateExecutiveBrief` is intentionally pure (data in →
 * strings out). To upgrade to a real LLM later, add an async sibling that
 * calls the Claude API with the same inputs and swap it in at the call site;
 * nothing else needs to change.
 */

import type { PeriodData } from "@/types/dashboard";
import { computeEVM, rollupEVM } from "@/lib/evm";

const pct = (v: number, t: number): number => (t > 0 ? ((v - t) / t) * 100 : 0);
const f1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/**
 * Returns 3–5 synthesized executive insights, ordered by salience.
 * Deterministic: same data always yields the same brief.
 */
export function generateExecutiveBrief(d: PeriodData): string[] {
  const out: string[] = [];

  // 1. Revenue vs budget headline
  const revVar = pct(d.revenue, d.revenueTarget);
  out.push(
    `Doanh thu ${d.label} đạt $${f1(d.revenue)}M, ${revVar >= 0 ? "vượt" : "thấp hơn"} target ` +
      `${Math.abs(revVar).toFixed(1)}% ($${f1(d.revenueTarget)}M). ` +
      `Biên gộp ${d.revenue > 0 ? ((d.gp / d.revenue) * 100).toFixed(1) : "0"}%.`
  );

  // 2. Portfolio EVM health
  const withEvm = d.initiatives.filter((i) => i.evm);
  if (withEvm.length) {
    const roll = rollupEVM(withEvm.map((i) => i.evm!));
    out.push(
      `Danh mục sáng kiến: SPI ${roll.spi.toFixed(2)} (${roll.spi >= 1 ? "đúng/nhanh tiến độ" : "chậm tiến độ"}), ` +
        `CPI ${roll.cpi.toFixed(2)} (${roll.cpi >= 1 ? "trong ngân sách" : "vượt chi"}). ` +
        `Dự báo VAC ${roll.vac >= 0 ? "+" : ""}$${f1(roll.vac)}M khi hoàn thành.`
    );
    // Flag the worst initiative
    const worst = withEvm
      .map((i) => ({ name: i.name, e: computeEVM(i.evm!) }))
      .sort((a, b) => Math.min(a.e.spi, a.e.cpi) - Math.min(b.e.spi, b.e.cpi))[0];
    if (worst && Math.min(worst.e.spi, worst.e.cpi) < 0.9) {
      out.push(
        `Cần chú ý: "${worst.name}" đang lệch (SPI ${worst.e.spi.toFixed(2)} / CPI ${worst.e.cpi.toFixed(2)}) — ` +
          `khuyến nghị đưa vào agenda Council.`
      );
    }
  }

  // 3. Top risk
  const high = d.risks.filter((r) => r.sev === "High");
  if (high.length) {
    out.push(`Rủi ro cao: ${high.map((r) => r.area).join(", ")} — ${high[0].desc} (owner: ${high[0].owner}).`);
  }

  // 4. Workforce pressure (highest attrition team)
  const teams = d.operations?.workforce?.teams ?? [];
  if (teams.length) {
    const hot = [...teams].sort((a, b) => b.attrition - a.attrition)[0];
    if (hot.attrition >= 16) {
      out.push(
        `Áp lực nhân sự: team ${hot.team} có attrition ${hot.attrition}% (cao nhất), utilization ${hot.utilization}% — rà soát kế hoạch tuyển/giữ người.`
      );
    }
  }

  return out;
}

/** Report cadences that require a team-lead written comment. */
export const COMMENT_REQUIRED = ["bi-weekly", "biweekly", "monthly"];

/** True if a report name implies bi-weekly / monthly cadence (needs human input). */
export function needsLeadComment(reportName: string): boolean {
  const n = reportName.toLowerCase();
  return COMMENT_REQUIRED.some((c) => n.includes(c));
}
