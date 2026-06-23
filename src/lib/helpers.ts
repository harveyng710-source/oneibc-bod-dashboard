/**
 * helpers.ts
 * ──────────
 * Shared utility functions for the dashboard UI.
 */

/** Percentage delta between actual value and its target */
export const delta = (v: number, t: number): number => ((v - t) / t) * 100;

/** Format a number to 1 decimal place */
export const fmt1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

/** Map a status string to a colour tone key */
export const statusColor = (s: string): string =>
  s === "On Track" || s === "Good"
    ? "emerald"
    : s === "At Risk"
    ? "amber"
    : s === "Delayed" || s === "Critical"
    ? "red"
    : "slate";

/** Map a severity to a colour tone key */
export const sevColor = (s: string): string =>
  s === "Low" ? "emerald" : s === "Medium" ? "amber" : "red";

/** Map a score to a colour tone key */
export const scoreTone = (v: number): string =>
  v >= 80 ? "emerald" : v >= 60 ? "amber" : "red";

/** Colour palette lookup */
export const colorMap: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", bar: "#10b981" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   bar: "#f59e0b" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     bar: "#ef4444" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-500",  bar: "#6366f1" },
  slate:   { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400",   bar: "#94a3b8" },
};

/** Nav items */
export const NAV = [
  { id: "overview",    label: "Overview (Pulse)",     icon: "LayoutDashboard" },
  { id: "operations",  label: "Operations (Centers)", icon: "Activity" },
  { id: "capital",     label: "Capital (Financials)", icon: "Wallet" },
  { id: "insight",     label: "Insight Signals",      icon: "Sparkles" },
  { id: "briefing",    label: "Executive Briefing",   icon: "Briefcase" },
  { id: "reports",     label: "Reports Library",      icon: "FileText" },
] as const;

/** Scorecard metadata */
export const SCORECARD_META: Record<string, { label: string; perspective: string; owner: string }> = {
  financial:   { label: "Financial Health",       perspective: "Balanced Scorecard: Finance",           owner: "Revenue & Growth Council" },
  customer:    { label: "Customer & Market",      perspective: "Balanced Scorecard: Customer",          owner: "Revenue & Growth Council" },
  operational: { label: "Operational Excellence",  perspective: "Balanced Scorecard: Internal Process",  owner: "Operational Excellence Council" },
  technology:  { label: "Tech & Innovation",       perspective: "Balanced Scorecard: Learning & Growth", owner: "Technology & Intelligence Council" },
};
