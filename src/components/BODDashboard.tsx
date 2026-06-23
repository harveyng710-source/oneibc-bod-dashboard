"use client";
/**
 * BODDashboard.tsx
 * ────────────────
 * OneIBC AI FP&A Dashboard — Real-time Financial Planning & Analysis Analyst.
 */

import { useState, useCallback, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import {
  Activity, Wallet, TrendingUp, Target,
  FileText, ArrowUp, ArrowDown, Minus, Building2, Sparkles, Bot, Download, Info, MessageSquarePlus, Settings, Eye, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, Area, Bar, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { DashboardData, PeriodData, ComparisonMode, EVMInput } from "@/types/dashboard";
import { colorMap, statusColor, sevColor, scoreTone, fmt1, SCORECARD_META, NAV } from "@/lib/helpers";
import { computeEVM, rollupEVM, fmtIndex } from "@/lib/evm";
import { getMetricDoc } from "@/lib/metricDocs";
import { generateExecutiveBrief, needsLeadComment } from "@/lib/aiReasoning";
import { recommendWorkload, revOpsProgress, effectiveTeamEVM } from "@/lib/workload";
import { dualForecast } from "@/lib/forecast";

const AIChatPanel = dynamicImport(() => import("./AIChatPanel"), { ssr: false });

// Sub-sections inside the Overview view
const OVERVIEW_TABS = [
  { id: "pulse",    label: "Executive Pulse" },
  { id: "variance", label: "Variance Intelligence" },
  { id: "driver",   label: "Revenue & Margin Driver" },
] as const;
type OverviewTab = (typeof OVERVIEW_TABS)[number]["id"];

// Sub-sections inside the Operations view
const OPERATIONS_TABS = [
  { id: "plants",    label: "Plants & Supplier" },
  { id: "workforce", label: "Workforce & Cost" },
] as const;
type OperationsTab = (typeof OPERATIONS_TABS)[number]["id"];

// ─── Micro-components ────────────────────────────────────────────────────────

/**
 * Hover tooltip (Vietnamese) describing a metric's meaning, logic and data flow.
 * Renders the tooltip in a body portal with fixed positioning so it is never
 * clipped by an ancestor's `overflow:hidden` / `truncate` (the previous bug).
 */
function InfoTip({ docKey, children, className = "" }: { docKey: string; children: React.ReactNode; className?: string }) {
  const doc = getMetricDoc(docKey);
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  if (!doc) return <>{children}</>;

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) {
      const x = Math.min(r.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 304);
      setPos({ x: Math.max(8, x), y: r.bottom + 6 });
    }
    setShow(true);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={open}
      onMouseLeave={() => setShow(false)}
      className={`relative inline-flex items-center gap-1 cursor-help ${className}`}
    >
      {children}
      <Info size={11} className="shrink-0 text-slate-300" />
      {show && typeof document !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9999, maxWidth: 288 }}
          className="pointer-events-none p-3 rounded-xl bg-slate-900 text-white text-[10px] leading-relaxed shadow-2xl normal-case text-left font-medium"
        >
          <div className="font-black text-indigo-300 mb-1.5">{doc.label}</div>
          <div className="mb-1"><b className="text-slate-300">Là gì:</b> {doc.what}</div>
          <div className="mb-1"><b className="text-slate-300">Logic:</b> {doc.logic}</div>
          <div><b className="text-slate-300">Data flow:</b> {doc.dataFlow}</div>
        </div>,
        document.body
      )}
    </span>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  const c = colorMap[tone] ?? colorMap.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1 h-1 rounded-full shrink-0 ${c.dot}`} />
      {label}
    </span>
  );
}

function TrendArrow({ trend, goodIsUp = true, size = 12 }: { trend: number | string; goodIsUp?: boolean; size?: number }) {
  const dir = typeof trend === "string" ? trend : trend > 0 ? "up" : trend < 0 ? "down" : "flat";
  const good = (dir === "up" && goodIsUp) || (dir === "down" && !goodIsUp);
  const bad  = (dir === "up" && !goodIsUp) || (dir === "down" && goodIsUp);
  const color = dir === "flat" ? "text-slate-400" : good ? "text-emerald-500" : bad ? "text-red-500" : "text-slate-400";
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  return <Icon size={size} className={`shrink-0 ${color}`} />;
}

function ProgressBar({ value, tone, thick = false }: { value: number; tone: string; thick?: boolean }) {
  const c = colorMap[tone] ?? colorMap.slate;
  return (
    <div className={`w-full bg-slate-100 rounded-full ${thick ? "h-2" : "h-1.5"} overflow-hidden`}>
      <div className={`${thick ? "h-2" : "h-1.5"} rounded-full transition-all duration-500`}
           style={{ width: `${Math.min(value, 100)}%`, backgroundColor: c.bar }} />
    </div>
  );
}

function Gauge({ score, size = "h-24", scoreSize = "text-3xl", scoreColor = "text-slate-800", track = "#f1f5f9" }: { score: number; size?: string; scoreSize?: string; scoreColor?: string; track?: string }) {
  const tone = scoreTone(score);
  const color = colorMap[tone].bar;
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke={track} strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${(score / 100) * 251} 251`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`${scoreSize} font-black ${scoreColor}`}>{score}</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className}`}>{children}</div>;
}

function CardHeader({ title, sub, right, docKey }: { title: string; sub?: string; right?: React.ReactNode; docKey?: string }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4 shrink-0">
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-slate-800 truncate">
          {docKey ? <InfoTip docKey={docKey}>{title}</InfoTip> : title}
        </h3>
        {sub && <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, target, spark, color, suffix = "M", isPct = false, docKey }: {
  icon: LucideIcon; label: string; value: number; target: number | { base: number; target: number };
  spark?: number[]; color: string; suffix?: string; isPct?: boolean; docKey?: string;
}) {
  const targetNum = isPct ? null : (target as number);
  const achievement = targetNum && targetNum > 0 ? (value / targetNum) * 100 : null;
  const achTone = achievement === null ? "text-slate-400" : achievement >= 100 ? "text-emerald-500" : achievement >= 90 ? "text-amber-500" : "text-red-500";
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {docKey ? <InfoTip docKey={docKey}>{label}</InfoTip> : label}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-black text-slate-800 leading-none">
            {isPct ? `${value}%` : `$${fmt1(value)}${suffix}`}
          </div>
          {!isPct && targetNum !== null && (
            <div className="mt-1.5 space-y-0.5">
              <div className="text-[10px] text-slate-400 font-medium">Target ${fmt1(targetNum)}{suffix}</div>
              {achievement !== null && (
                <div className={`text-[10px] font-black flex items-center gap-1 ${achTone}`}>
                  {achievement >= 100 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {achievement.toFixed(0)}% đạt target
                </div>
              )}
            </div>
          )}
          {isPct && <div className="text-[10px] text-slate-400 mt-1.5 font-medium">Progress to Target</div>}
        </div>
        {spark && (
           <div className="w-16 h-6 shrink-0 opacity-50">
             <div className="flex items-end gap-0.5 h-full">
               {spark.slice(-8).map((v, i) => (
                 <div key={i} className="flex-1 bg-slate-200 rounded-t-sm" style={{ height: `${(v / Math.max(...spark)) * 100}%` }} />
               ))}
             </div>
           </div>
        )}
      </div>
    </Card>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

interface Props {
  initialData: DashboardData;
}

export default function BODDashboard({ initialData }: Props) {
  const [dashData] = useState<DashboardData>(initialData);
  const [view, setView] = useState("overview");
  const [overviewTab, setOverviewTab] = useState<OverviewTab>("pulse");
  const [operationsTab, setOperationsTab] = useState<OperationsTab>("plants");
  const [varianceChart, setVarianceChart] = useState<"area" | "line" | "bar" | "combo">("area");
  const [periodIdx, setPeriodIdx] = useState(() => Math.max(0, dashData.periods.length - 1));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("budget");
  const [aiChatOpen, setAIChatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reportComments, setReportComments] = useState<Record<string, string>>({});
  const [previewReport, setPreviewReport] = useState<string | null>(null);
  const [hrmsEdit, setHrmsEdit] = useState(false);
  const [hrmsDraft, setHrmsDraft] = useState<Record<string, { headcount: number; utilization: number; attrition: number; costPerHead: number; revenueContribution: number }>>({});

  const d: PeriodData = dashData.periods[periodIdx] ?? dashData.periods[0];
  
  const currentTargetLabel = comparisonMode === "budget" ? "Target" : "Forecast";
  const revenueTarget = comparisonMode === "budget" ? d.revenueTarget : d.revenueForecast;
  const gpTarget = comparisonMode === "budget" ? d.gpTarget : d.gpForecast;
  const ebitdaTarget = comparisonMode === "budget" ? d.ebitdaTarget : d.ebitdaForecast;

  const forecastPct = d.forecastTarget > 0 ? Math.round((d.forecastBase / d.forecastTarget) * 100) : 0;
  const navLabel = NAV.find((n) => n.id === view)?.label || "AI Overview";

  // ── Data-source status (shown on every tab) ─────────────────────────────────
  const sourceLabel =
    dashData.source === "google_sheets" ? "Google Sheets" :
    dashData.source === "csv" ? "CSV Upload" : "Static seed data";
  const sourceLive = dashData.source === "google_sheets" || dashData.source === "csv";
  const refreshedAt = dashData.lastRefreshed
    ? new Date(dashData.lastRefreshed).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  // ── Executive Pulse derived indicators ──────────────────────────────────────
  const scorecardScores = Object.values(d.scorecard).map((s) => s.score);
  const overallHealth = Math.round(scorecardScores.reduce((a, b) => a + b, 0) / scorecardScores.length);
  const initiativesWithEvm = d.initiatives.filter((i) => i.evm);
  const portfolio = initiativesWithEvm.length
    ? rollupEVM(initiativesWithEvm.map((i) => i.evm as EVMInput))
    : null;
  const highRiskCount = d.risks.filter((r) => r.sev === "High").length;
  const grossMargin = d.revenue > 0 ? (d.gp / d.revenue) * 100 : 0;
  const ebitdaMargin = d.revenue > 0 ? (d.ebitda / d.revenue) * 100 : 0;
  const wf = d.operations?.workforce;
  const teams = wf?.teams ?? [];
  const fpa = dashData.fpa;
  const teamRollup = teams.length ? rollupEVM(teams.map((t) => effectiveTeamEVM(t, fpa))) : null;
  const execBrief = generateExecutiveBrief(d);
  const revops = revOpsProgress(d);
  const workloadRecs = teams.map((t) => recommendWorkload(t, 16, fpa));
  const forecast = fpa ? dualForecast(fpa) : null;
  const fpaMonths = fpa?.teams[0]?.monthly.map((m) => m.month) ?? [];
  // Latest closed month (max index with a GP actual across teams) for the dept pipeline combo.
  const fpaLastIdx = fpa ? Math.max(-1, ...fpa.teams.flatMap((t) => t.monthly.map((m, i) => (m.gpActual !== null ? i : -1)))) : -1;
  const fpaMonthLabel = fpaLastIdx >= 0 ? fpaMonths[fpaLastIdx] : "";
  const deptPipeline = fpa && fpaLastIdx >= 0
    ? fpa.teams.map((t) => {
        const m = t.monthly[fpaLastIdx];
        const actual = m?.gpActual ?? 0;
        const target = m?.gpTarget ?? 0;
        return { name: t.team, Actual: actual, Target: target, achieve: target > 0 ? Math.round((actual / target) * 100) : 0 };
      })
    : [];

  const router = useRouter();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  function startHrmsEdit() {
    const draft: typeof hrmsDraft = {};
    for (const t of teams) draft[t.team] = { headcount: t.headcount, utilization: t.utilization, attrition: t.attrition, costPerHead: t.costPerHead, revenueContribution: t.revenueContribution };
    setHrmsDraft(draft);
    setHrmsEdit(true);
  }

  async function saveHrms() {
    try {
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hrmsOverrides: hrmsDraft }) });
      if (r.ok) { showToast("Đã lưu HRMS — cập nhật dashboard."); setHrmsEdit(false); router.refresh(); }
      else if (r.status === 401) showToast("Cần đăng nhập Settings (mật khẩu) để lưu.");
      else { const j = await r.json().catch(() => ({})); showToast(j.error ?? "Lưu thất bại."); }
    } catch { showToast("Lỗi kết nối khi lưu."); }
  }

  const handlePrint = useCallback(() => {
    showToast("Preparing report for PDF export...");
    setTimeout(() => {
      window.print();
    }, 500);
  }, [showToast]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden relative font-sans">
      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col bg-[#0c1430] text-white h-full shadow-2xl z-30">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 size={18} />
          </div>
          <div>
            <div className="font-black text-sm tracking-tighter uppercase">OneIBC AI</div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest opacity-70">FP&A Analyst</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          {NAV.map((n) => {
             const active = view === n.id;
             return (
               <button
                 key={n.id}
                 onClick={() => setView(n.id)}
                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all ${
                   active ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1" : "text-slate-400 hover:bg-white/5 hover:text-indigo-200"
                 }`}
               >
                 <span className="truncate">{n.label}</span>
               </button>
             );
          })}
          <Link
            href="/settings"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold text-slate-400 hover:bg-white/5 hover:text-indigo-200 transition-all"
          >
            <Settings size={15} className="shrink-0" />
            <span className="truncate">Settings</span>
          </Link>
        </nav>

        <div className="p-4 bg-white/5 m-4 rounded-2xl border border-white/5 no-print">
           <div className="text-[10px] text-slate-400 font-black uppercase mb-3 text-center tracking-widest">Live Link Status</div>
           <div className="space-y-3">
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                 <div className="text-[10px] leading-tight text-slate-300">Salesforce synced.</div>
              </div>
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                 <div className="text-[10px] leading-tight text-slate-300">VN HQ Center connected.</div>
              </div>
           </div>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0 no-print">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{navLabel}</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide lowercase italic">oneibc board & executive intelligence layer</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:inline">So với</span>
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
               {(["budget", "forecast"] as const).map(m => (
                 <button
                  key={m}
                  onClick={() => setComparisonMode(m)}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${comparisonMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                 >
                   {m === "budget" ? "Target" : "Forecast"}
                 </button>
               ))}
              </div>
            </div>

            <select
              value={periodIdx}
              onChange={(e) => setPeriodIdx(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-[11px] font-bold text-slate-700 outline-none hover:bg-slate-100 transition-colors"
            >
              {dashData.periods.map((p, i) => (
                <option key={p.period} value={i}>{p.label}</option>
              ))}
            </select>

            <button 
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
               <Download size={14} />
               <span>EXPORT PDF</span>
            </button>
          </div>
        </header>

        {/* ── CONTENT AREA ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* ── Data-source status (all tabs) ── */}
          <div className="flex items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl px-5 py-3 no-print">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${sourceLive ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="text-[11px] font-black text-slate-700">Nguồn dữ liệu: {sourceLabel}</span>
              <span className="text-[10px] font-bold text-slate-300">•</span>
              <span className="text-[11px] font-medium text-slate-400 truncate">Fetch cuối: {refreshedAt}</span>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${sourceLive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {sourceLive ? "Live" : "Seed"}
            </span>
          </div>

          {view === "overview" ? (
             <div className="space-y-6">
                {/* ── Overview sub-section tabs ── */}
                <div className="flex items-center gap-1 border-b border-slate-200">
                  {OVERVIEW_TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOverviewTab(t.id)}
                      className={`px-5 py-3 text-[12px] font-black rounded-t-xl -mb-px border-b-2 transition-all ${
                        overviewTab === t.id
                          ? "border-indigo-600 text-indigo-600 bg-white"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {overviewTab === "pulse" ? (
                <div className="space-y-6">
                {/* ── Company Health hero (supreme snapshot) ── */}
                <div className="bg-[#0c1430] rounded-[28px] p-7 text-white shadow-2xl">
                   <div className="flex flex-col lg:flex-row gap-8 items-center">
                      <div className="flex items-center gap-6 shrink-0">
                         <Gauge score={overallHealth} size="h-28" scoreSize="text-4xl" scoreColor="text-white" track="rgba(255,255,255,0.12)" />
                         <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-1">Company Health Index</div>
                            <div className="text-2xl font-black">{overallHealth >= 80 ? "Strong" : overallHealth >= 60 ? "Stable" : "At Risk"}</div>
                            <div className="text-[11px] text-slate-400 font-medium mt-1">{d.label} • Composite Balanced Scorecard</div>
                         </div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                         {[
                            { label: "Financial Pillar", value: `${d.scorecard.financial.score}`, tone: scoreTone(d.scorecard.financial.score) },
                            { label: "Portfolio SPI", value: portfolio ? fmtIndex(portfolio.spi) : "—", tone: portfolio ? (portfolio.spi >= 1 ? "emerald" : "amber") : "slate" },
                            { label: "Portfolio CPI", value: portfolio ? fmtIndex(portfolio.cpi) : "—", tone: portfolio ? (portfolio.cpi >= 1 ? "emerald" : "red") : "slate" },
                            { label: "High Risks", value: `${highRiskCount}`, tone: highRiskCount > 0 ? "red" : "emerald" },
                         ].map((k) => (
                            <div key={k.label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                               <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">{k.label}</div>
                               <div className="text-2xl font-black" style={{ color: colorMap[k.tone].bar }}>{k.value}</div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard icon={Wallet} docKey="revenue" label={`Revenue (${currentTargetLabel})`} value={d.revenue} target={revenueTarget} spark={d.revenueSpark} color="#6366f1" />
                  <KpiCard icon={TrendingUp} docKey="gp" label={`Gross Profit (${currentTargetLabel})`} value={d.gp} target={gpTarget} spark={d.gpSpark} color="#10b981" />
                  <KpiCard icon={Target} docKey="forecastProgress" label="Forecast Progress" value={forecastPct} target={{ base: d.forecastBase, target: d.forecastTarget }} isPct color="#0ea5e9" />
                  <KpiCard icon={Activity} docKey="ebitda" label={`EBITDA (${currentTargetLabel})`} value={d.ebitda} target={ebitdaTarget} spark={d.ebitdaSpark} color="#f59e0b" />
                </div>

                {/* Scorecard + Risks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 flex flex-col min-h-0">
                    <CardHeader title="Strategic Health Scorecard" sub="Balanced Scorecard Pillar Performance" docKey="scorecard" />
                    <div className="grid grid-cols-4 gap-4 flex-1 items-center py-4">
                      {Object.keys(d.scorecard).map((k) => {
                        const s = d.scorecard[k as keyof typeof d.scorecard];
                        return (
                          <div key={k} className="text-center rounded-3xl py-4 hover:bg-slate-50 transition-all cursor-default">
                            <Gauge score={s.score} size="h-28" scoreSize="text-3xl" />
                            <div className="text-[12px] font-black text-slate-800 mt-4 truncate px-2">{SCORECARD_META[k].label}</div>
                            <div className="mt-2 text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1 uppercase">
                              <TrendArrow trend={s.trend} size={10} /> {Math.abs(s.trend)} pts vs prev
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <Card className="flex flex-col min-h-0">
                    <CardHeader title="Enterprise Risks" sub="Operational & Compliance Watchlist" docKey="risk" />
                    <div className="space-y-4 overflow-y-auto pr-1">
                      {d.risks.slice(0, 4).map((r) => (
                        <div key={r.area} className="flex items-center justify-between text-[11px] gap-2 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                          <div className="min-w-0">
                            <div className="font-black text-slate-700 truncate">{r.area}</div>
                            <div className="text-slate-400 truncate text-[10px] font-medium mt-0.5">{r.desc}</div>
                          </div>
                          <Badge label={r.sev} tone={sevColor(r.sev)} />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Department Pipeline Performance — combo chart */}
                {deptPipeline.length > 0 && (
                <Card>
                  <CardHeader title={`Department Pipeline Performance — ${fpaMonthLabel}`} sub="GP Actual vs Target theo department + % đạt (tháng gần nhất có số liệu)" />
                  <div className="h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={deptPipeline} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#475569" }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}M`} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 150]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "#0ea5e9" }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip contentStyle={{ borderRadius: "16px", border: "none", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                        <Bar yAxisId="left" name="Target GP" dataKey="Target" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={22} />
                        <Bar yAxisId="left" name="Actual GP" dataKey="Actual" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={22} />
                        <Line yAxisId="right" name="% đạt" type="monotone" dataKey="achieve" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                )}

                {/* Strategic Portfolio Execution (EVM) */}
                <Card>
                  <CardHeader
                    title="Strategic Portfolio Execution (EVM)"
                    sub="Earned Value across strategic initiatives"
                    right={portfolio ? <Badge label={portfolio.health === "ahead" ? "Ahead" : portfolio.health === "behind" ? "Behind" : "On Track"} tone={portfolio.health === "ahead" ? "emerald" : portfolio.health === "behind" ? "red" : "amber"} /> : undefined}
                  />
                  {portfolio ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                          { l: "SPI", k: "spi", v: fmtIndex(portfolio.spi) },
                          { l: "CPI", k: "cpi", v: fmtIndex(portfolio.cpi) },
                          { l: "% Complete", k: "percentComplete", v: `${Math.round(portfolio.percentComplete)}%` },
                          { l: "VAR %", k: "vac", v: `${portfolio.bac > 0 ? (portfolio.vac >= 0 ? "+" : "") + ((portfolio.vac / portfolio.bac) * 100).toFixed(0) : "0"}%` },
                        ].map((m) => (
                          <div key={m.l} className="bg-slate-50 rounded-2xl p-4 text-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 inline-flex justify-center"><InfoTip docKey={m.k}>{m.l}</InfoTip></div>
                            <div className="text-lg font-black text-slate-800">{m.v}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {initiativesWithEvm.map((it) => {
                          const e = computeEVM(it.evm as EVMInput);
                          return (
                            <div key={it.name} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1.5 gap-2">
                                  <span className="text-[12px] font-black text-slate-700 truncate">{it.name}</span>
                                  <span className="text-[11px] font-bold text-slate-400 shrink-0">{it.progress}%</span>
                                </div>
                                <ProgressBar value={it.progress} tone={statusColor(it.status)} thick />
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${e.spi >= 1 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>SPI {fmtIndex(e.spi)}</span>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${e.cpi >= 1 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>CPI {fmtIndex(e.cpi)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-[11px] text-slate-400 py-8 font-medium">EVM data not available for this period.</div>
                  )}
                </Card>

                {/* RevOps & Workload */}
                <Card>
                  <CardHeader title="RevOps & Workload" sub="Tiến trình RevOps tháng này + đề xuất workload tháng sau (rule-based)" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { l: "Revenue đạt target", k: "revenue", v: revops.revenuePct },
                      { l: "Forecast progress", k: "forecastProgress", v: revops.forecastPct },
                      { l: "Pipeline coverage", k: "pipelineCoverage", v: revops.pipeline },
                    ].map((m) => (
                      <div key={m.l} className="bg-slate-50 rounded-2xl p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 inline-flex"><InfoTip docKey={m.k}>{m.l}</InfoTip></div>
                        <div className="text-2xl font-black text-slate-800 mb-2">{Math.round(m.v)}%</div>
                        <ProgressBar value={Math.min(m.v, 100)} tone={m.v >= 90 ? "emerald" : m.v >= 70 ? "amber" : "red"} thick />
                      </div>
                    ))}
                  </div>
                  {workloadRecs.length ? (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Đề xuất workload tháng sau theo team</div>
                      {workloadRecs.map((r) => (
                        <div key={r.team} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="w-28 shrink-0">
                            <div className="text-[12px] font-black text-slate-700 truncate">{r.team}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{r.headcount} ppl · {r.utilization}% · SPI {fmtIndex(r.spi)}</div>
                          </div>
                          <div className="shrink-0"><Badge label={r.status} tone={r.tone} /></div>
                          <div className="flex-1 text-[11px] text-slate-500 font-medium leading-relaxed">{r.recommendation}</div>
                          {r.headcountDelta > 0 && (
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">+{r.headcountDelta} HC</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-[11px] text-slate-400 py-8 font-medium">Chưa có dữ liệu team cho {d.label}.</div>
                  )}
                </Card>

                {/* Workforce snapshot + Stories */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader title="Workforce Snapshot" sub="Company-wide capacity" />
                    {wf ? (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { l: "Headcount", v: `${wf.headcount}` },
                          { l: "Utilization", v: `${wf.utilization}%` },
                          { l: "Attrition", v: `${wf.attrition}%` },
                          { l: "Cost/Head", v: `$${wf.costPerHead}K` },
                        ].map((m) => (
                          <div key={m.l} className="bg-slate-50 rounded-2xl p-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{m.l}</div>
                            <div className="text-xl font-black text-slate-800">{m.v}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-[11px] text-slate-400 py-8 font-medium">No workforce data for this period.</div>
                    )}
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader title="Management Stories" sub="Latest Council Thread Updates" />
                    <div className="space-y-5">
                      {dashData.stories.slice(0, 3).map((s) => (
                        <div key={s.title} className="border-l-4 pl-5 py-1" style={{ borderColor: colorMap[s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"].bar }}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-slate-800">{s.title}</span>
                            <Badge label={s.sentiment} tone={s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"} />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">{s.summary}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* AI Bottom Panel */}
                <div className="bg-[#0c1430] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                      <Sparkles size={160} />
                   </div>
                   <div className="relative flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shrink-0">
                         <Bot size={40} />
                      </div>
                      <div className="flex-1">
                         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">OneIBC AI Executive Insight · Tự tổng hợp (rule-based)</div>
                         <div className="flex flex-col gap-2">
                            {execBrief.slice(0, 3).map((n, i) => (
                               <div key={i} className="text-[15px] font-bold text-slate-100 flex gap-3 leading-relaxed">
                                  <span className="text-indigo-500 font-black shrink-0">{i+1}.</span>
                                  <span>{n}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                      <button onClick={() => setAIChatOpen(true)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-500 transition-all shrink-0 border border-white/10 shadow-lg">
                         Start Agentic Chat
                      </button>
                   </div>
                </div>
                </div>
                ) : overviewTab === "variance" ? (
                <div className="space-y-6">
                   <Card className="flex flex-col h-[460px]">
                      <CardHeader
                        title="Variance Intelligence"
                        sub={`Actual vs ${currentTargetLabel} & Base — chọn loại biểu đồ`}
                        docKey="variance"
                        right={
                          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                            {([["area", "Area"], ["line", "Line"], ["bar", "Bar"], ["combo", "Combo"]] as const).map(([k, lbl]) => (
                              <button key={k} onClick={() => setVarianceChart(k)}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${varianceChart === k ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                {lbl}
                              </button>
                            ))}
                          </div>
                        }
                      />
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={d.chart}>
                            <defs>
                              <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="q" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                            {varianceChart === "area" && <Area type="monotone" name="Actual" dataKey="actual" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPulse)" />}
                            {varianceChart === "line" && <Line type="monotone" name="Actual" dataKey="actual" stroke="#6366f1" strokeWidth={4} dot={{ r: 4 }} />}
                            {(varianceChart === "bar" || varianceChart === "combo") && <Bar name="Actual" dataKey="actual" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />}
                            {varianceChart === "combo"
                              ? <Area type="monotone" name="Base" dataKey="base" stroke="#94a3b8" strokeWidth={2} fill="#94a3b8" fillOpacity={0.08} />
                              : <Line type="monotone" name="Base" dataKey="base" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />}
                            <Line type="monotone" name="Target" dataKey="target" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                   </Card>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {[
                        { label: "Revenue", actual: d.revenue, target: revenueTarget },
                        { label: "Gross Profit", actual: d.gp, target: gpTarget },
                        { label: "EBITDA", actual: d.ebitda, target: ebitdaTarget },
                     ].map((m) => {
                        const v = m.actual - m.target;
                        const vp = m.target > 0 ? (v / m.target) * 100 : 0;
                        return (
                          <Card key={m.label}>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{m.label} vs {currentTargetLabel}</div>
                            <div className="flex items-end justify-between gap-2">
                              <div className="text-2xl font-black text-slate-800">${fmt1(m.actual)}M</div>
                              <div className={`text-sm font-black ${v >= 0 ? "text-emerald-500" : "text-red-500"}`}>{v >= 0 ? "+" : ""}{fmt1(v)}M ({vp >= 0 ? "+" : ""}{vp.toFixed(1)}%)</div>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">{currentTargetLabel} ${fmt1(m.target)}M</div>
                          </Card>
                        );
                     })}
                   </div>

                   <Card>
                      <CardHeader title="Quarterly Variance Breakdown" sub="Actual vs Base vs Target ($M)" />
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                            <th className="text-left py-3">Quarter</th>
                            <th className="text-right">Actual</th>
                            <th className="text-right">Base</th>
                            <th className="text-right">Target</th>
                            <th className="text-right">Variance vs Base</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {d.chart.map((c) => {
                            const has = c.actual !== null;
                            const v = has ? (c.actual as number) - c.base : null;
                            const vp = v !== null && c.base > 0 ? (v / c.base) * 100 : null;
                            return (
                              <tr key={c.q} className="hover:bg-slate-50/50">
                                <td className="py-3 font-black text-slate-700">{c.q}</td>
                                <td className="text-right font-bold">{has ? `$${fmt1(c.actual as number)}M` : "—"}</td>
                                <td className="text-right text-slate-400">${fmt1(c.base)}M</td>
                                <td className="text-right text-slate-400">${fmt1(c.target)}M</td>
                                <td className={`text-right font-black ${v === null ? "text-slate-300" : v >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                  {v === null ? "—" : `${v >= 0 ? "+" : ""}${fmt1(v)}M${vp !== null ? ` (${vp >= 0 ? "+" : ""}${vp.toFixed(0)}%)` : ""}`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                   </Card>

                   {fpa && (
                   <Card>
                      <CardHeader title="Department Revenue & Gross Profit by Month" sub="Chi tiết Rev/GP từng department theo tháng (M1–M6, $M) — nguồn FP&A workbook" />
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] min-w-[760px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <th className="text-left py-3 pr-2">Department</th>
                              <th className="text-left px-2">Metric</th>
                              {fpaMonths.map((m) => <th key={m} className="text-right px-2">{m}</th>)}
                              <th className="text-right pl-2">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {fpa.teams.map((t) => {
                              const gpTotal = t.monthly.reduce((a, m) => a + (m.gpActual ?? 0), 0);
                              const revTotal = t.monthly.reduce((a, m) => a + (m.revenue ?? 0), 0);
                              return (
                                <Fragment key={t.team}>
                                  <tr className="hover:bg-slate-50/50">
                                    <td rowSpan={2} className="py-3 pr-2 font-black text-slate-700 align-top whitespace-nowrap">{t.team}</td>
                                    <td className="px-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">Revenue</td>
                                    {t.monthly.map((m) => <td key={m.month} className="text-right px-2 text-slate-600">{m.revenue !== null ? `$${fmt1(m.revenue)}` : "—"}</td>)}
                                    <td className="text-right pl-2 font-black text-slate-800">${fmt1(revTotal)}</td>
                                  </tr>
                                  <tr className="hover:bg-slate-50/50 border-b border-slate-100">
                                    <td className="px-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">Gross Profit</td>
                                    {t.monthly.map((m) => {
                                      const under = m.gpActual !== null && m.gpActual < m.gpTarget;
                                      return <td key={m.month} className={`text-right px-2 font-bold ${m.gpActual === null ? "text-slate-300" : under ? "text-amber-600" : "text-emerald-600"}`}>{m.gpActual !== null ? `$${fmt1(m.gpActual)}` : "—"}</td>;
                                    })}
                                    <td className="text-right pl-2 font-black text-emerald-600">${fmt1(gpTotal)}</td>
                                  </tr>
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400 font-medium">GP tô vàng = dưới target tháng đó · Số liệu $M.</div>
                   </Card>
                   )}
                </div>
                ) : (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {[
                        { l: "Total Revenue", v: `$${fmt1(d.revenue)}M`, s: `vs ${currentTargetLabel} $${fmt1(revenueTarget)}M` },
                        { l: "Gross Margin", v: `${grossMargin.toFixed(1)}%`, s: `GP $${fmt1(d.gp)}M` },
                        { l: "EBITDA Margin", v: `${ebitdaMargin.toFixed(1)}%`, s: `EBITDA $${fmt1(d.ebitda)}M` },
                     ].map((m) => (
                        <Card key={m.l}>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{m.l}</div>
                          <div className="text-2xl font-black text-slate-800">{m.v}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-medium">{m.s}</div>
                        </Card>
                     ))}
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="flex flex-col">
                         <CardHeader title="Revenue & Margin Drivers" sub="Performance by Sales Pricebook" docKey="department" />
                         <div className="space-y-6">
                           {d.departments.map((dep) => (
                             <div key={dep.name}>
                               <div className="flex justify-between items-center mb-2">
                                 <span className="text-[12px] font-black text-slate-700">{dep.name}</span>
                                 <span className="text-[12px] font-black text-indigo-600">${fmt1(dep.value)}M · {dep.pct}%</span>
                               </div>
                               <ProgressBar value={dep.pct} tone="emerald" thick />
                             </div>
                           ))}
                         </div>
                         <div className="mt-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 italic text-[10px] text-indigo-600 font-bold">
                            *Salesforce Pricebook Integration • Automated Refresh
                         </div>
                      </Card>

                      <Card className="flex flex-col">
                         <CardHeader title="Team Productivity" sub="Revenue contribution vs people cost" />
                         {wf?.teams?.length ? (
                           <div className="space-y-3">
                             {wf.teams.map((t) => {
                               const ratio = t.totalCost > 0 ? t.revenueContribution / t.totalCost : 0;
                               return (
                                 <div key={t.team} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                                   <div className="min-w-0">
                                     <div className="text-[12px] font-black text-slate-700">{t.team}</div>
                                     <div className="text-[10px] text-slate-400 font-medium">{t.headcount} ppl · ${fmt1(t.totalCost)}M cost</div>
                                   </div>
                                   <div className="text-right shrink-0">
                                     <div className="text-[13px] font-black text-slate-800">${fmt1(t.revenueContribution)}M</div>
                                     <div className={`text-[10px] font-bold ${ratio >= 2 ? "text-emerald-500" : ratio > 0 ? "text-amber-500" : "text-slate-400"}`}>{ratio > 0 ? `${ratio.toFixed(1)}× ROI` : "support"}</div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <div className="text-center text-[11px] text-slate-400 py-8 font-medium">No team data for this period.</div>
                         )}
                      </Card>
                   </div>

                   {wf?.teams?.length ? (
                   <Card>
                      <CardHeader title="Individuals Productivity" sub="Năng suất bình quân đầu người theo team — Rev/head, GP đạt, utilization" />
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] min-w-[680px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <th className="text-left py-3 pr-2">Team</th>
                              <th className="text-left px-2">Loại</th>
                              <th className="text-right px-2"><InfoTip docKey="headcount">HC</InfoTip></th>
                              <th className="text-right px-2">Rev/Head</th>
                              <th className="text-right px-2">GP đạt</th>
                              <th className="text-right px-2"><InfoTip docKey="utilization">Util</InfoTip></th>
                              <th className="text-left pl-2 w-32">Năng suất</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(() => {
                              const maxRPH = Math.max(...wf.teams.map((t) => (t.headcount > 0 ? t.revenueContribution / t.headcount : 0)), 0.0001);
                              return wf.teams.map((t) => {
                                const rph = t.headcount > 0 ? (t.revenueContribution / t.headcount) : 0; // $M/head
                                const ft = fpa?.teams.find((x) => x.team === t.team);
                                let achieve: number | null = null;
                                if (ft) {
                                  const ta = ft.monthly.reduce((a, m) => a + (m.gpActual ?? 0), 0);
                                  const tt = ft.monthly.filter((m) => m.gpActual !== null).reduce((a, m) => a + m.gpTarget, 0);
                                  achieve = tt > 0 ? (ta / tt) * 100 : null;
                                }
                                return (
                                  <tr key={t.team} className="hover:bg-slate-50/50">
                                    <td className="py-3 pr-2 font-black text-slate-700 whitespace-nowrap">{t.team}</td>
                                    <td className="px-2"><Badge label={t.type === "revenue" ? "Revenue" : "Support"} tone={t.type === "revenue" ? "indigo" : "slate"} /></td>
                                    <td className="text-right px-2 font-bold">{t.headcount}</td>
                                    <td className="text-right px-2 font-black text-indigo-600">${Math.round(rph * 1000)}K</td>
                                    <td className={`text-right px-2 font-black ${achieve === null ? "text-slate-300" : achieve >= 100 ? "text-emerald-500" : achieve >= 80 ? "text-amber-500" : "text-red-500"}`}>{achieve === null ? "—" : `${achieve.toFixed(0)}%`}</td>
                                    <td className="text-right px-2 text-slate-500">{t.utilization}%</td>
                                    <td className="pl-2"><ProgressBar value={(rph / maxRPH) * 100} tone={t.type === "revenue" ? "emerald" : "slate"} thick /></td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-400 font-medium">Rev/Head = doanh thu đóng góp / headcount. Support team không gắn doanh thu trực tiếp.</div>
                   </Card>
                   ) : null}
                </div>
                )}
             </div>
          ) : view === "operations" ? (
             <div className="space-y-6">
                {/* ── Operations sub-section tabs ── */}
                <div className="flex items-center gap-1 border-b border-slate-200">
                  {OPERATIONS_TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setOperationsTab(t.id)}
                      className={`px-5 py-3 text-[12px] font-black rounded-t-xl -mb-px border-b-2 transition-all ${
                        operationsTab === t.id
                          ? "border-indigo-600 text-indigo-600 bg-white"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {operationsTab === "plants" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <Card>
                      <CardHeader title="Fulfillment Plants (Centers)" sub="Operational performance by Location" docKey="serviceCenter" />
                      {d.operations?.serviceCenters?.length ? (
                      <div className="space-y-4">
                         {d.operations.serviceCenters.map(sc => (
                           <div key={sc.name} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                              <div>
                                 <div className="text-base font-black text-slate-800">{sc.name}</div>
                                 <Badge label={sc.type} tone={sc.type === 'HQ' ? 'indigo' : 'slate'} />
                              </div>
                              <div className="text-right">
                                 <div className="text-xl font-black text-slate-800">${fmt1(sc.actual)}M</div>
                                 <div className={`text-[10px] font-bold ${sc.actual > sc.target ? 'text-red-500' : 'text-emerald-500'}`}>
                                   Var: {sc.actual > sc.target ? '+' : '-'}${Math.abs(sc.actual - sc.target).toFixed(2)}M vs target
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                      ) : (
                      <div className="text-center text-[11px] text-slate-400 py-12 font-medium">No plant/center data for {d.label}.</div>
                      )}
                   </Card>
                   <Card>
                      <CardHeader title="Supplier & Bank Ecosystem" sub="Financial Integrity & Spend" docKey="supplier" />
                      {d.operations?.suppliers?.length ? (
                      <div className="space-y-8">
                         {d.operations.suppliers.map(sup => (
                           <div key={sup.name} className="p-5 rounded-3xl border border-slate-50 shadow-sm">
                              <div className="flex justify-between items-center mb-4">
                                 <div className="text-sm font-black text-slate-800 flex items-center gap-3">
                                    {sup.name} <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">{sup.category}</span>
                                 </div>
                                 <div className="text-sm font-black text-indigo-600">{sup.performance}% Efficiency</div>
                              </div>
                              <ProgressBar value={sup.performance} tone={sup.performance > 90 ? "emerald" : "amber"} thick />
                           </div>
                         ))}
                      </div>
                      ) : (
                      <div className="text-center text-[11px] text-slate-400 py-12 font-medium">No supplier data for {d.label}.</div>
                      )}
                   </Card>
                </div>
                ) : (
                <div className="space-y-6">
                {wf ? (
                <>
                   {/* HRMS edit toolbar */}
                   <div className="flex items-center justify-between">
                      <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Workforce & Cost</div>
                      {!hrmsEdit ? (
                        <button onClick={startHrmsEdit} className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-[11px] font-black hover:bg-slate-900 transition-all">
                          <Settings size={14} /> Sửa HRMS
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => setHrmsEdit(false)} className="px-4 py-2 text-[11px] font-black text-slate-500 hover:text-slate-700">Hủy</button>
                          <button onClick={saveHrms} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 transition-all">Lưu thay đổi</button>
                        </div>
                      )}
                   </div>

                   {hrmsEdit && (
                   <Card>
                      <CardHeader title="HRMS — Adjust workforce by team" sub="Sửa headcount, utilization, attrition, cost/head, revenue đóng góp. Lưu vào Postgres (cần đăng nhập Settings)." />
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] min-w-[720px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <th className="text-left py-2 pr-2">Team</th>
                              <th className="px-2">HC</th><th className="px-2">Util %</th><th className="px-2">Attr %</th><th className="px-2">Cost/Head $K</th><th className="px-2">Revenue $M</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {teams.map((t) => {
                              const dr = hrmsDraft[t.team] ?? { headcount: t.headcount, utilization: t.utilization, attrition: t.attrition, costPerHead: t.costPerHead, revenueContribution: t.revenueContribution };
                              const setField = (k: keyof typeof dr, v: number) => setHrmsDraft((p) => ({ ...p, [t.team]: { ...dr, [k]: v } }));
                              const numCell = (k: keyof typeof dr, step = 1) => (
                                <td className="px-2 py-2"><input type="number" step={step} value={dr[k]} onChange={(e) => setField(k, parseFloat(e.target.value) || 0)} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" /></td>
                              );
                              return (
                                <tr key={t.team}>
                                  <td className="py-2 pr-2 font-black text-slate-700 whitespace-nowrap">{t.team} <Badge label={t.type === "revenue" ? "Rev" : "Sup"} tone={t.type === "revenue" ? "indigo" : "slate"} /></td>
                                  {numCell("headcount")}{numCell("utilization")}{numCell("attrition")}{numCell("costPerHead")}{numCell("revenueContribution", 0.1)}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                   </Card>
                   )}

                   {/* Company-wide aggregates */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card><div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Total Headcount</div><div className="text-3xl font-black text-slate-800">{wf.headcount}</div></Card>
                      <Card><div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Capacity Utilization</div><div className="text-3xl font-black text-indigo-600">{wf.utilization}%</div></Card>
                      <Card><div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Attrition Rate</div><div className="text-3xl font-black text-amber-500">{wf.attrition}%</div></Card>
                      <Card><div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Cost per Head</div><div className="text-3xl font-black text-slate-800">${wf.costPerHead}K</div></Card>
                   </div>

                   {/* Team-level EVM rollup */}
                   {teamRollup && (
                   <Card>
                      <CardHeader
                        title="Workforce Earned Value (EVM rollup)"
                        sub="People cost vs delivered value across all teams"
                        right={<Badge label={teamRollup.health === "ahead" ? "Ahead" : teamRollup.health === "behind" ? "Behind" : "On Track"} tone={teamRollup.health === "ahead" ? "emerald" : teamRollup.health === "behind" ? "red" : "amber"} />}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { l: "SPI", k: "spi", v: fmtIndex(teamRollup.spi) },
                          { l: "CPI", k: "cpi", v: fmtIndex(teamRollup.cpi) },
                          { l: "% Complete", k: "percentComplete", v: `${Math.round(teamRollup.percentComplete)}%` },
                          { l: "VAR %", k: "vac", v: `${teamRollup.bac > 0 ? (teamRollup.vac >= 0 ? "+" : "") + ((teamRollup.vac / teamRollup.bac) * 100).toFixed(0) : "0"}%` },
                        ].map((m) => (
                          <div key={m.l} className="bg-slate-50 rounded-2xl p-4 text-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 inline-flex justify-center"><InfoTip docKey={m.k}>{m.l}</InfoTip></div>
                            <div className="text-lg font-black text-slate-800">{m.v}</div>
                          </div>
                        ))}
                      </div>
                   </Card>
                   )}

                   {/* Per-team headcount + cost + EVM */}
                   <Card>
                      <CardHeader title="Workforce & Cost by Team" sub="EVM team revenue (SPI=GP đạt/target, CPI=GP/chi phí người) · team support EVM chuẩn" />
                      {teams.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-[12px] min-w-[840px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <th className="text-left py-3 pr-2">Team</th>
                              <th className="text-right px-2"><InfoTip docKey="headcount">HC</InfoTip></th>
                              <th className="text-right px-2"><InfoTip docKey="utilization">Util</InfoTip></th>
                              <th className="text-right px-2"><InfoTip docKey="attrition">Attr</InfoTip></th>
                              <th className="text-right px-2"><InfoTip docKey="costPerHead">Cost/Head</InfoTip></th>
                              <th className="text-right px-2">Total Cost</th>
                              <th className="text-right px-2"><InfoTip docKey="revenueContribution">Rev Contrib</InfoTip></th>
                              <th className="text-right px-2"><InfoTip docKey="spi">SPI</InfoTip></th>
                              <th className="text-right px-2"><InfoTip docKey="cpi">CPI</InfoTip></th>
                              <th className="text-right pl-2"><InfoTip docKey="vac">VAR %</InfoTip></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {teams.map((t) => {
                              const ev = effectiveTeamEVM(t, fpa);
                              const e = computeEVM(ev);
                              return (
                                <tr key={t.team} className="hover:bg-slate-50/50">
                                  <td className="py-3 pr-2 font-black text-slate-700 whitespace-nowrap">{t.team} <Badge label={t.type === "revenue" ? "Rev" : "Sup"} tone={t.type === "revenue" ? "indigo" : "slate"} /></td>
                                  <td className="text-right px-2 font-bold">{t.headcount}</td>
                                  <td className="text-right px-2">{t.utilization}%</td>
                                  <td className={`text-right px-2 font-bold ${t.attrition >= 16 ? "text-red-500" : t.attrition >= 13 ? "text-amber-500" : "text-slate-500"}`}>{t.attrition}%</td>
                                  <td className="text-right px-2 text-slate-500">${t.costPerHead}K</td>
                                  <td className="text-right px-2 text-slate-500">${fmt1(t.totalCost)}M</td>
                                  <td className="text-right px-2 font-bold text-indigo-600">${fmt1(t.revenueContribution)}M</td>
                                  <td className={`text-right px-2 font-black ${e.spi >= 1 ? "text-emerald-500" : "text-amber-500"}`}>{fmtIndex(e.spi)}</td>
                                  <td className={`text-right px-2 font-black ${e.cpi >= 1 ? "text-emerald-500" : "text-red-500"}`}>{fmtIndex(e.cpi)}</td>
                                  <td className={`text-right pl-2 font-black ${e.vac >= 0 ? "text-emerald-500" : "text-red-500"}`}>{ev.bac > 0 ? (e.vac >= 0 ? "+" : "") + ((e.vac / ev.bac) * 100).toFixed(0) : "0"}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      ) : (
                      <div className="text-center text-[11px] text-slate-400 py-12 font-medium">No per-team workforce data for {d.label}.</div>
                      )}
                   </Card>
                </>
                ) : (
                <Card><div className="text-center text-[11px] text-slate-400 py-16 font-medium">No workforce data available for {d.label}.</div></Card>
                )}
                </div>
                )}
             </div>
          ) : view === "capital" ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="flex flex-col">
                   <CardHeader title="CEO Executive P&L" sub="Standard P&L Breakdown (Board View)" />
                   <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                      <div className="grid grid-cols-4 px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-3">
                         <div>Account</div>
                         <div className="text-right">Actual</div>
                         <div className="text-right">Target</div>
                         <div className="text-right">Var</div>
                      </div>
                      {d.capital?.pl.map((line, i) => (
                        <div key={i} className={`grid grid-cols-4 px-5 py-5 text-[13px] font-bold rounded-2xl ${i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                           <div className="text-slate-800">{line.item}</div>
                           <div className="text-right">${line.actual}M</div>
                           <div className="text-right text-slate-400 font-medium">${line.budget}M</div>
                           <div className={`text-right font-black ${line.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {line.variance > 0 ? '+' : ''}{line.variance}M
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card>
                   <CardHeader title="Cash Flow Dynamics" sub="Inflow vs Outflow theo nhóm hoạt động, đường Net" />
                   <div className="h-72 mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={d.capital?.cashFlow} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#475569'}} tickFormatter={(v: string) => v.replace(" Activities", "")} />
                           <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(v) => `$${v}M`} />
                           <Tooltip contentStyle={{borderRadius: '16px', border: 'none', fontSize: 12}} />
                           <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                           <Bar name="Inflow" dataKey="inflow" fill="#10b981" radius={[6, 6, 0, 0]} barSize={26} />
                           <Bar name="Outflow" dataKey="outflow" fill="#f87171" radius={[6, 6, 0, 0]} barSize={26} />
                           <Line name="Net" type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                      {d.capital?.cashFlow.map(cf => (
                        <div key={cf.category} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest truncate">{cf.category.replace(" Activities", "")}</div>
                           <div className={`text-lg font-black ${cf.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {cf.net >= 0 ? "+" : ""}${fmt1(cf.net)}M
                           </div>
                           <div className="text-[9px] text-slate-400 font-medium mt-1">In ${fmt1(cf.inflow)}M · Out ${fmt1(cf.outflow)}M</div>
                        </div>
                      ))}
                   </div>
                </Card>
              </div>

              {d.capital?.payables?.length ? (
              <Card>
                 <CardHeader
                   title="Supplier & Bank Payments Tracking"
                   sub="Khoản phải trả + hạn thanh toán ($M)"
                   right={(() => {
                     const overdue = d.capital.payables.filter((p) => p.status === "Overdue").length;
                     const pendingAmt = d.capital.payables.filter((p) => p.status !== "Paid").reduce((a, p) => a + p.amount, 0);
                     return <div className="flex items-center gap-2">
                       {overdue > 0 && <Badge label={`${overdue} quá hạn`} tone="red" />}
                       <span className="text-[11px] font-black text-slate-500">Chưa trả: ${fmt1(pendingAmt)}M</span>
                     </div>;
                   })()}
                 />
                 <div className="overflow-x-auto">
                   <table className="w-full text-[12px] min-w-[640px]">
                     <thead>
                       <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                         <th className="text-left py-3 pr-2">Nhà cung cấp</th>
                         <th className="text-left px-2">Loại</th>
                         <th className="text-right px-2">Số tiền</th>
                         <th className="text-left px-2">Hạn</th>
                         <th className="text-right px-2">Còn lại</th>
                         <th className="text-right pl-2">Trạng thái</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                       {[...d.capital.payables]
                         .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
                         .map((p) => {
                           const days = Math.ceil((new Date(p.due).getTime() - Date.now()) / 86400000);
                           const tone = p.status === "Paid" ? "emerald" : p.status === "Overdue" ? "red" : "amber";
                           return (
                             <tr key={p.supplier} className="hover:bg-slate-50/50">
                               <td className="py-3 pr-2 font-black text-slate-700 whitespace-nowrap">{p.supplier}</td>
                               <td className="px-2 text-slate-500">{p.category}</td>
                               <td className="text-right px-2 font-bold text-slate-800">${fmt1(p.amount)}M</td>
                               <td className="px-2 text-slate-500 whitespace-nowrap">{p.due}</td>
                               <td className={`text-right px-2 font-bold ${p.status === "Paid" ? "text-slate-300" : days < 0 ? "text-red-500" : days <= 5 ? "text-amber-500" : "text-slate-500"}`}>
                                 {p.status === "Paid" ? "—" : days < 0 ? `${Math.abs(days)}d trễ` : `${days}d`}
                               </td>
                               <td className="text-right pl-2"><div className="inline-flex"><Badge label={p.status} tone={tone} /></div></td>
                             </tr>
                           );
                         })}
                     </tbody>
                   </table>
                 </div>
              </Card>
              ) : null}
             </div>
          ) : view === "insight" ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {d.insights?.map((ins, i) => (
                      <Card key={i} className="flex flex-col justify-between hover:border-indigo-400 border-2 border-transparent transition-all p-6">
                         <div>
                            <div className="flex justify-between items-start mb-5">
                               <Badge label={ins.category} tone={ins.category === "Risk" ? "red" : "indigo"} />
                               <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-wider">
                                  {Math.round(ins.confidence * 100)}% Match
                               </div>
                            </div>
                            <h3 className="text-base font-black text-slate-800 mb-4">{ins.signal}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">{ins.description}</p>
                         </div>
                         <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Impact Score</span>
                            <span className={`text-[11px] font-black px-4 py-1.5 rounded-xl uppercase ${ins.impact === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                               {ins.impact}
                            </span>
                         </div>
                      </Card>
                   ))}
                </div>
                
                {forecast && fpa && (
                <Card>
                   <CardHeader title="Dual Forecast & Confidence" sub="Kết hợp Bayesian (workbook) + Salesforce pipeline (median báo giá × % stage) → độ tin cậy" />
                   <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-[#0c1430] text-white rounded-2xl p-5 lg:col-span-1 flex flex-col justify-center">
                         <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Blended GP Q2</div>
                         <div className="text-3xl font-black">${fmt1(forecast.blendedTotal)}M</div>
                         <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1">Confidence</div>
                         <div className={`text-2xl font-black ${forecast.confidencePct >= 80 ? "text-emerald-400" : forecast.confidencePct >= 60 ? "text-amber-400" : "text-red-400"}`}>{forecast.confidencePct}%</div>
                      </div>
                      <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                         <div className="bg-slate-50 rounded-2xl p-4 text-center"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Bayesian</div><div className="text-xl font-black text-slate-800">${fmt1(forecast.bayesTotal)}M</div></div>
                         <div className="bg-slate-50 rounded-2xl p-4 text-center"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Pipeline</div><div className="text-xl font-black text-slate-800">${fmt1(forecast.pipelineTotal)}M</div></div>
                         <div className="bg-slate-50 rounded-2xl p-4 text-center"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Target Q2</div><div className="text-xl font-black text-slate-800">${fmt1(fpa.q2TargetGP)}M</div></div>
                      </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-[12px] min-w-[620px]">
                       <thead>
                         <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                           <th className="text-left py-3 pr-2">Team</th>
                           <th className="text-right px-2">Bayesian</th>
                           <th className="text-right px-2">Pipeline</th>
                           <th className="text-right px-2">Blended</th>
                           <th className="text-right px-2">Đồng thuận</th>
                           <th className="text-right pl-2">Confidence</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {forecast.teams.map((t) => (
                           <tr key={t.team} className="hover:bg-slate-50/50">
                             <td className="py-3 pr-2 font-black text-slate-700 whitespace-nowrap">{t.team}</td>
                             <td className="text-right px-2 text-slate-600">${fmt1(t.bayes)}M</td>
                             <td className="text-right px-2 text-slate-600">${fmt1(t.pipeline)}M</td>
                             <td className="text-right px-2 font-black text-indigo-600">${fmt1(t.blended)}M</td>
                             <td className="text-right px-2 text-slate-500">{t.agreementPct}%</td>
                             <td className={`text-right pl-2 font-black ${t.confidencePct >= 80 ? "text-emerald-500" : t.confidencePct >= 60 ? "text-amber-500" : "text-red-500"}`}>{t.confidencePct}%</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                   <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {fpa.scenarios.map((s) => (
                        <div key={s.name} className="border border-slate-100 rounded-2xl p-4">
                           <div className="text-[11px] font-black text-slate-700">{s.name}</div>
                           <div className="text-[10px] text-slate-400 font-bold mb-2">Prob {Math.round(s.prob * 100)}%</div>
                           <div className="text-lg font-black text-slate-800">${fmt1(s.gpForecast)}M <span className="text-[11px] font-bold text-slate-400">GP</span></div>
                           <div className="text-[10px] text-slate-500 font-medium mt-1">{Math.round(s.achievement * 100)}% đạt · Rev ${fmt1(s.revenueEst)}M</div>
                        </div>
                      ))}
                   </div>
                   <div className="mt-3 text-[10px] text-slate-400 font-medium">CI 80%: ${fmt1(fpa.ci.p80Low)}M–${fmt1(fpa.ci.p80High)}M · CI 95%: ${fmt1(fpa.ci.p95Low)}M–${fmt1(fpa.ci.p95High)}M. Confidence cao khi 2 mô hình đồng thuận và data coverage tốt.</div>
                </Card>
                )}
             </div>
          ) : view === "briefing" ? (
             <div className="max-w-4xl mx-auto py-12 px-10 bg-white shadow-2xl min-h-[1000px] animate-in fade-in zoom-in duration-700 font-serif text-slate-900 border border-slate-100 rounded-lg print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none">
                <div className="text-center mb-16 border-b-2 border-indigo-600 pb-8">
                   <div className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mb-4 px-4 py-1.5 bg-indigo-50 inline-block rounded-full">OneIBC Group · Confidential</div>
                   <h1 className="text-4xl font-black mb-4 text-slate-900 tracking-tight">Executive Performance Briefing</h1>
                   <div className="text-lg font-bold text-slate-500 italic">Reporting Period: {d.label} • Bi-Weekly Management Cycle</div>
                </div>

                {/* KPI tiles (Salesforce-style) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                   {[
                      { l: "Revenue", a: d.revenue, t: d.revenueTarget },
                      { l: "Gross Profit", a: d.gp, t: d.gpTarget },
                      { l: "EBITDA", a: d.ebitda, t: d.ebitdaTarget },
                      { l: "Forecast", a: d.forecastBase, t: d.forecastTarget },
                   ].map((m) => {
                      const ach = m.t > 0 ? (m.a / m.t) * 100 : 0;
                      return (
                        <div key={m.l} className="border border-slate-200 rounded-xl p-4 text-center">
                           <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.l}</div>
                           <div className="text-2xl font-black text-slate-900">${fmt1(m.a)}M</div>
                           <div className={`text-[11px] font-black mt-1 ${ach >= 100 ? "text-emerald-600" : ach >= 90 ? "text-amber-600" : "text-red-600"}`}>{ach.toFixed(0)}% đạt target</div>
                        </div>
                      );
                   })}
                </div>

                <div className="space-y-12">
                   <section>
                      <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 mb-6 border-l-4 border-indigo-600 pl-4">1. Executive Summary</h2>
                      <p className="text-base text-slate-500 italic mb-5 font-medium">Tự tổng hợp từ dữ liệu kỳ {d.label} (AI reasoning rule-based):</p>
                      <div className="space-y-4">
                         {execBrief.map((n, i) => (
                            <p key={i} className="text-lg leading-relaxed text-slate-700 font-medium">
                               <span className="text-indigo-600 font-black mr-2">1.{i+1}</span> {n}
                            </p>
                         ))}
                      </div>
                   </section>

                   <section>
                      <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 mb-6 border-l-4 border-indigo-600 pl-4">2. Financial Performance Matrix</h2>
                      <table className="w-full border-collapse">
                         <thead>
                            <tr className="bg-slate-50">
                               <th className="p-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Metric</th>
                               <th className="p-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actual</th>
                               <th className="p-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Target</th>
                               <th className="p-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">Variance</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {[
                               { label: 'Total Revenue', actual: d.revenue, budget: d.revenueTarget },
                               { label: 'Gross Profit', actual: d.gp, budget: d.gpTarget },
                               { label: 'EBITDA', actual: d.ebitda, budget: d.ebitdaTarget },
                            ].map((m) => (
                               <tr key={m.label} className="hover:bg-slate-50/50">
                                  <td className="p-4 font-black">{m.label}</td>
                                  <td className="p-4 text-right font-bold">${m.actual}M</td>
                                  <td className="p-4 text-right text-slate-400">${m.budget}M</td>
                                  <td className={`p-4 text-right font-black ${m.actual >= m.budget ? 'text-emerald-600' : 'text-red-500'}`}>
                                     {m.actual >= m.budget ? '+' : ''}{((m.actual - m.budget) / m.budget * 100).toFixed(1)}%
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </section>

                   {fpa && (
                   <section>
                      <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 mb-6 border-l-4 border-indigo-600 pl-4">3. Division Performance</h2>
                      {(() => {
                        const rows = fpa.teams.map((t) => {
                          const actual = t.monthly.reduce((a, m) => a + (m.gpActual ?? 0), 0);
                          const target = t.monthly.filter((m) => m.gpActual !== null).reduce((a, m) => a + m.gpTarget, 0);
                          const ach = target > 0 ? (actual / target) * 100 : 0;
                          return { team: t.team, actual, target, ach, bayes: t.bayesianForecast, conf: t.confidence };
                        });
                        const best = [...rows].sort((a, b) => b.ach - a.ach)[0];
                        const worst = [...rows].sort((a, b) => a.ach - b.ach)[0];
                        return (
                          <>
                            <p className="text-lg leading-relaxed text-slate-700 font-medium mb-6">
                               <b>{best.team}</b> dẫn đầu với <b>{best.ach.toFixed(0)}%</b> GP đạt target YTD, trong khi <b>{worst.team}</b> thấp nhất ở <b>{worst.ach.toFixed(0)}%</b> — cần ưu tiên hỗ trợ. Dự báo Bayesian Q2 toàn nhóm ${fmt1(rows.reduce((a, r) => a + r.bayes, 0))}M.
                            </p>
                            <table className="w-full border-collapse">
                               <thead>
                                  <tr className="bg-slate-50">
                                     <th className="p-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">Division</th>
                                     <th className="p-3 text-right text-xs font-black uppercase tracking-widest text-slate-400">GP Actual</th>
                                     <th className="p-3 text-right text-xs font-black uppercase tracking-widest text-slate-400">GP Target</th>
                                     <th className="p-3 text-right text-xs font-black uppercase tracking-widest text-slate-400">% đạt</th>
                                     <th className="p-3 text-right text-xs font-black uppercase tracking-widest text-slate-400">Forecast Q2</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100">
                                  {rows.map((r) => (
                                     <tr key={r.team}>
                                        <td className="p-3 font-black text-slate-800">{r.team}</td>
                                        <td className="p-3 text-right font-bold">${fmt1(r.actual)}M</td>
                                        <td className="p-3 text-right text-slate-400">${fmt1(r.target)}M</td>
                                        <td className={`p-3 text-right font-black ${r.ach >= 100 ? "text-emerald-600" : r.ach >= 80 ? "text-amber-600" : "text-red-500"}`}>{r.ach.toFixed(0)}%</td>
                                        <td className="p-3 text-right font-bold text-indigo-600">${fmt1(r.bayes)}M <span className="text-[10px] text-slate-400 font-medium">({r.conf})</span></td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                          </>
                        );
                      })()}
                   </section>
                   )}

                   <section>
                      <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 mb-6 border-l-4 border-indigo-600 pl-4">4. Operational Stability & Workforce</h2>
                      <div className="grid grid-cols-2 gap-8 mb-8">
                         {d.operations?.serviceCenters.map(sc => (
                            <div key={sc.name} className="p-6 bg-slate-50 rounded-3xl">
                               <div className="flex justify-between items-center mb-2">
                                  <span className="font-black text-slate-800">{sc.name}</span>
                               </div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">{sc.type} Index: {Math.round(sc.actual/sc.target*100)}%</p>
                            </div>
                         ))}
                      </div>
                      <div className="p-8 border border-slate-100 rounded-3xl">
                         <div className="text-sm font-black text-slate-800 mb-4 uppercase tracking-widest">Workforce Metrics</div>
                         <div className="grid grid-cols-4 gap-4">
                            <div><div className="text-[10px] text-slate-400 font-bold">HEADCOUNT</div><div className="text-xl font-bold">{d.operations?.workforce?.headcount}</div></div>
                            <div><div className="text-[10px] text-slate-400 font-bold">UTILIZATION</div><div className="text-xl font-bold">{d.operations?.workforce?.utilization}%</div></div>
                            <div><div className="text-[10px] text-slate-400 font-bold">ATTRITION</div><div className="text-xl font-bold text-amber-600">{d.operations?.workforce?.attrition}%</div></div>
                            <div><div className="text-[10px] text-slate-400 font-bold">COST/HEAD</div><div className="text-xl font-bold">${d.operations?.workforce?.costPerHead}K</div></div>
                         </div>
                      </div>
                   </section>

                   <section>
                      <h2 className="text-xl font-black uppercase tracking-widest text-indigo-600 mb-6 border-l-4 border-indigo-600 pl-4">5. Risk Watchlist</h2>
                      <div className="space-y-4">
                         {d.risks.filter(r => r.sev === "High" || r.sev === "Medium").map((r) => (
                            <div key={r.area} className="flex gap-6 p-6 border border-slate-100 rounded-3xl">
                               <Badge label={r.sev} tone={sevColor(r.sev)} />
                               <div>
                                  <div className="font-black text-slate-900 mb-1">{r.area}</div>
                                  <p className="text-sm text-slate-500 font-medium">{r.desc}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </section>
                </div>
             </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="max-w-4xl mx-auto p-8">
                   <CardHeader title="Reports Library" sub="Bi-weekly & monthly → team-lead comment • Others → AI-synthesized" />
                   <div className="divide-y divide-slate-100 mt-6">
                      {dashData.reports.map((r) => {
                        const needsComment = needsLeadComment(r.name);
                        return (
                        <div key={r.name} className="py-6">
                           <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-5 min-w-0">
                                 <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                                    <FileText size={24} className="text-slate-400" />
                                 </div>
                                 <div className="min-w-0">
                                    <div className="text-[15px] font-black text-slate-800 truncate">{r.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                       <span>Automated MIS • {r.updated}</span>
                                       {needsComment ? (
                                         <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full normal-case tracking-normal">Cần comment của Team Lead</span>
                                       ) : (
                                         <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full normal-case tracking-normal inline-flex items-center gap-1"><Sparkles size={9} /> AI-synthesized</span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                 <button onClick={() => setPreviewReport(r.name)} title="Preview" className="px-3 h-10 rounded-xl flex items-center gap-1.5 text-[11px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all">
                                    <Eye size={16} /> Preview
                                 </button>
                                 <button title="Download" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                    <Download size={20} />
                                 </button>
                              </div>
                           </div>

                           {needsComment ? (
                             <div className="mt-4 ml-[76px]">
                                <div className="flex items-start gap-2">
                                   <MessageSquarePlus size={16} className="text-slate-400 mt-2 shrink-0" />
                                   <textarea
                                      value={reportComments[r.name] ?? ""}
                                      onChange={(e) => setReportComments((p) => ({ ...p, [r.name]: e.target.value }))}
                                      placeholder="Team Lead bổ sung nhận định cho báo cáo này…"
                                      rows={2}
                                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                                   />
                                   <button
                                      onClick={() => showToast(reportComments[r.name]?.trim() ? "Đã lưu comment (phiên làm việc)." : "Chưa có nội dung để lưu.")}
                                      className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 transition-all shrink-0"
                                   >
                                      Lưu
                                   </button>
                                </div>
                             </div>
                           ) : (
                             <div className="mt-3 ml-[76px] text-[11px] text-slate-500 font-medium bg-slate-50/60 rounded-xl px-4 py-3 leading-relaxed">
                                <span className="font-black text-indigo-600">AI: </span>{execBrief[0]}
                             </div>
                           )}
                        </div>
                        );
                      })}
                   </div>
                </Card>
             </div>
          )}
        </div>
      </div>

      <AIChatPanel currentData={d} isOpen={aiChatOpen} onClose={() => setAIChatOpen(false)} />

      {/* Report preview modal */}
      {previewReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm no-print" onClick={() => setPreviewReport(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><FileText size={18} className="text-indigo-600" /></div>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-800 truncate">{previewReport}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bản xem trước tự động · {d.label}</div>
                </div>
              </div>
              <button onClick={() => setPreviewReport(null)} className="p-1.5 hover:bg-slate-100 rounded-lg shrink-0"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-5">
              {(() => {
                const n = previewReport.toLowerCase();
                if ((n.includes("gross profit") || n.includes("gp")) && fpa) {
                  return (
                    <div>
                      <p className="text-[12px] text-slate-500 font-medium mb-4">GP theo division (YTD, $M) — nguồn FP&A workbook.</p>
                      <table className="w-full text-[12px]">
                        <thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100"><th className="text-left py-2">Division</th><th className="text-right">GP Actual</th><th className="text-right">% đạt</th><th className="text-right">Forecast</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                          {fpa.teams.map((t) => {
                            const a = t.monthly.reduce((s, m) => s + (m.gpActual ?? 0), 0);
                            const tg = t.monthly.filter((m) => m.gpActual !== null).reduce((s, m) => s + m.gpTarget, 0);
                            const ach = tg > 0 ? (a / tg) * 100 : 0;
                            return <tr key={t.team}><td className="py-2 font-black text-slate-700">{t.team}</td><td className="text-right font-bold">${fmt1(a)}M</td><td className={`text-right font-black ${ach >= 100 ? "text-emerald-600" : ach >= 80 ? "text-amber-600" : "text-red-500"}`}>{ach.toFixed(0)}%</td><td className="text-right text-indigo-600 font-bold">${fmt1(t.bayesianForecast)}M</td></tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                // Default: executive narrative + KPI snapshot
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[{ l: "Revenue", a: d.revenue, t: revenueTarget }, { l: "Gross Profit", a: d.gp, t: gpTarget }, { l: "EBITDA", a: d.ebitda, t: ebitdaTarget }].map((m) => (
                        <div key={m.l} className="bg-slate-50 rounded-2xl p-4 text-center">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.l}</div>
                          <div className="text-lg font-black text-slate-800">${fmt1(m.a)}M</div>
                          <div className="text-[10px] text-slate-400 font-medium">{m.t > 0 ? ((m.a / m.t) * 100).toFixed(0) : 0}% đạt</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Tóm tắt điều hành</div>
                      <div className="space-y-2">
                        {execBrief.map((b, i) => <p key={i} className="text-[13px] text-slate-600 leading-relaxed font-medium flex gap-2"><span className="text-indigo-500 font-black">{i + 1}.</span><span>{b}</span></p>)}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">Bản xem trước được sinh tự động từ dữ liệu dashboard. Bản chính thức export PDF từ tab Executive Briefing.</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-black px-8 py-4 rounded-[2rem] shadow-2xl z-50 animate-in fade-in zoom-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
}
