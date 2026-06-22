"use client";
/**
 * BODDashboard.tsx
 * ────────────────
 * Full BOD Executive Dashboard — client component.
 *
 * Receives DashboardData as props (loaded server-side or via API).
 * Includes CSV drag-and-drop overlay and data-source indicator.
 */

import { useState, useCallback, useRef, type DragEvent } from "react";
import {
  LayoutDashboard, Activity, AlertTriangle, Wallet, TrendingUp, Target,
  MessageSquare, FileText, Info, Bell, MoreVertical, ChevronDown,
  ArrowUp, ArrowDown, Minus, Building2, Clock, X, RefreshCw, ArrowRight,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import type { DashboardData, PeriodData, ScorecardPillar } from "@/types/dashboard";
import { colorMap, statusColor, sevColor, scoreTone, delta, fmt1, SCORECARD_META, NAV } from "@/lib/helpers";

// ─── Icon lookup ─────────────────────────────────────────────────────────────
const ICONS: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard, Activity, AlertTriangle, Wallet, TrendingUp, Target,
  MessageSquare, FileText,
};

// ─── Micro-components ────────────────────────────────────────────────────────

function Badge({ label, tone }: { label: string; tone: string }) {
  const c = colorMap[tone] ?? colorMap.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {label}
    </span>
  );
}

function TrendArrow({ trend, goodIsUp = true, size = 12 }: { trend: number | string; goodIsUp?: boolean; size?: number }) {
  let dir = typeof trend === "string" ? trend : trend > 0 ? "up" : trend < 0 ? "down" : "flat";
  const good = (dir === "up" && goodIsUp) || (dir === "down" && !goodIsUp);
  const bad  = (dir === "up" && !goodIsUp) || (dir === "down" && goodIsUp);
  const color = dir === "flat" ? "text-slate-400" : good ? "text-emerald-600" : bad ? "text-red-600" : "text-slate-400";
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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className}`}>{children}</div>;
}

function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-3 shrink-0 gap-2">
      <div className="min-w-0">
        <h3 className="text-[13px] font-bold text-slate-800 truncate">{title}</h3>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Gauge({ score, size = "h-16", scoreSize = "text-lg" }: { score: number; size?: string; scoreSize?: string }) {
  const tone = scoreTone(score);
  const color = colorMap[tone].bar;
  const data = [{ value: score, fill: color }];
  return (
    <div className={`relative w-full ${size}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} startAngle={180} endAngle={0} innerRadius="75%" outerRadius="100%" barSize={10} cx="50%" cy="92%">
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#eef0f6" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className={`${scoreSize} font-extrabold leading-none`} style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  const gid = `g-${color.replace("#", "")}`;
  return (
    <div className="w-20 h-8 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, target, spark, color, suffix = "M", isPct = false }: {
  icon: typeof Wallet; label: string; value: number; target: number | { base: number; target: number };
  spark?: number[]; color: string; suffix?: string; isPct?: boolean;
}) {
  const d = isPct ? null : delta(value, target as number);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-slate-800 truncate">
            {isPct ? `${value}%` : `$${fmt1(value)}${suffix}`}
          </div>
          {!isPct && d !== null && (
            <div className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${d >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {d >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />} {Math.abs(d).toFixed(1)}% vs Target
            </div>
          )}
          {isPct && <div className="text-[11px] text-slate-400 mt-0.5">of Target</div>}
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      <div className="text-[10px] text-slate-400 mt-1.5 truncate">
        {isPct
          ? `Forecast: $${(target as { base: number; target: number }).base}M  |  Target: $${(target as { base: number; target: number }).target}M`
          : `Target: $${fmt1(target as number)}${suffix}`}
      </div>
    </Card>
  );
}

function PillarDetailCard({ pillarKey, s, prevLabel }: { pillarKey: string; s: ScorecardPillar; prevLabel: string }) {
  const meta = SCORECARD_META[pillarKey];
  const tone = scoreTone(s.score);
  return (
    <div className="border border-slate-100 rounded-2xl p-5">
      <div className="flex items-center gap-5 mb-4">
        <div className="w-28 shrink-0"><Gauge score={s.score} size="h-24" scoreSize="text-3xl" /></div>
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-800">{meta.label}</div>
          <div className="text-[11px] text-slate-400 mb-2">{meta.perspective}</div>
          <div className="flex items-center flex-wrap gap-2">
            <Badge label={s.score >= 80 ? "Good" : s.score >= 60 ? "At Risk" : "Critical"} tone={tone} />
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <TrendArrow trend={s.trend} /> {Math.abs(s.trend)} pts vs {prevLabel}
            </span>
          </div>
        </div>
      </div>
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contributing Indicators</span>
          <span className="text-[10px] text-slate-300">Owner: {meta.owner}</span>
        </div>
        <div className="space-y-3">
          {s.subs.map((sub) => (
            <div key={sub.name}>
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs text-slate-600 truncate" title={sub.name}>{sub.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{Math.round(sub.weight * 100)}% wt</span>
                  <span className="text-xs font-bold text-slate-700 w-7 text-right">{sub.value}</span>
                </div>
              </div>
              <ProgressBar value={sub.value} tone={scoreTone(sub.value)} thick />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

interface Props {
  initialData: DashboardData;
}

export default function BODDashboard({ initialData }: Props) {
  const [dashData, setDashData] = useState<DashboardData>(initialData);
  const [view, setView] = useState("overview");
  const [periodIdx, setPeriodIdx] = useState(() => {
    // Default to latest period (last in array)
    return Math.max(0, dashData.periods.length - 1);
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState<number | null>(null);
  const [storyFilter, setStoryFilter] = useState("All");
  const [refreshed, setRefreshed] = useState(dashData.lastRefreshed ? timeAgo(dashData.lastRefreshed) : "just now");
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const d: PeriodData = dashData.periods[periodIdx] ?? dashData.periods[0];
  const forecastPct = Math.round((d.forecastBase / d.forecastTarget) * 100);
  const prevLabel = d.compareLabel?.split(" ")[0] ?? "prev";

  const navLabel = NAV.find((n) => n.id === view)?.label || "BOD Overview";
  const filteredRisks = riskFilter === "All" ? d.risks : d.risks.filter((r) => r.sev === riskFilter);
  const filteredStories = storyFilter === "All" ? dashData.stories : dashData.stories.filter((s) => s.sentiment === storyFilter);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function refreshData() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Fetch failed");
      const data: DashboardData = await res.json();
      setDashData(data);
      setPeriodIdx(Math.max(0, data.periods.length - 1));
      setRefreshed("just now");
      showToast(`Dashboard refreshed from ${data.source ?? "server"}`);
    } catch {
      showToast("Refresh failed — using cached data");
    } finally {
      setLoading(false);
    }
  }

  const handleCsvUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      showToast("Only .csv files are supported");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload-csv", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data: DashboardData = await res.json();
      setDashData(data);
      setPeriodIdx(Math.max(0, data.periods.length - 1));
      setRefreshed("just now");
      showToast(`Loaded data from ${file.name}`);
    } catch {
      showToast("CSV upload failed — check file format");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvUpload(file);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden relative"
      style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* CSV Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-50 bg-indigo-600/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center">
            <Upload size={48} className="mx-auto text-indigo-500 mb-4" />
            <div className="text-lg font-bold text-slate-800">Drop CSV file here</div>
            <div className="text-sm text-slate-400 mt-1">The dashboard will reload with your data</div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-sm flex items-center justify-center">
          <RefreshCw size={32} className="text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ""; }} />

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col text-white h-full" style={{ background: "linear-gradient(180deg,#0c1430,#161f45)" }}>
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm leading-tight truncate">ONEIBC</div>
            <div className="text-[10px] text-indigo-200/70 leading-tight truncate">Board Dashboard</div>
          </div>
        </div>

        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto min-h-0">
          {NAV.map((n) => {
            const Icon = ICONS[n.icon] ?? LayoutDashboard;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                  active ? "bg-indigo-500/90 text-white shadow" : "text-indigo-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{n.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Data source + Refresh */}
        <div className="px-3.5 py-3.5 border-t border-white/10 text-[10px] text-indigo-200/70 shrink-0">
          <div className="font-semibold text-white/80 text-[11px] mb-2">Data Source</div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              dashData.source === "google_sheets" ? "bg-green-400" : dashData.source === "csv" ? "bg-amber-400" : "bg-sky-400"
            }`} />
            <span className="truncate capitalize">{dashData.source?.replace("_", " ") ?? "Static"}</span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-1.5 text-indigo-200/60 hover:text-white transition-colors mb-2"
          >
            <Upload size={10} className="shrink-0" />
            <span>Upload CSV</span>
          </button>

          <div className="font-semibold text-white/80 text-[11px] mt-3 mb-2">How to read this dashboard</div>
          <ul className="space-y-1 mb-2.5">
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">●</span><span><b className="text-white/80">Outcome Focused</b> — results vs targets</span></li>
            <li className="flex items-start gap-1.5"><span className="text-sky-400 mt-0.5">●</span><span><b className="text-white/80">Forward Looking</b> — forecast &amp; trend</span></li>
            <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">●</span><span><b className="text-white/80">Risk Aware</b> — early warning</span></li>
            <li className="flex items-start gap-1.5"><span className="text-rose-400 mt-0.5">●</span><span><b className="text-white/80">Action Oriented</b> — stories drive decisions</span></li>
          </ul>
          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 text-indigo-200/60 hover:text-white transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">Refreshed: {refreshed}</span>
            <RefreshCw size={10} className="shrink-0" />
          </button>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-100 px-6 py-3.5 flex items-center justify-between relative z-20 shrink-0">
          <div className="min-w-0">
            <h1 className="text-base font-extrabold text-slate-800 truncate">{view === "overview" ? "BOD Executive Overview" : navLabel}</h1>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Strategic Oversight • Enterprise Performance • Risk &amp; Outlook</p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Period selector */}
            <div className="relative">
              <select
                value={periodIdx}
                onChange={(e) => setPeriodIdx(Number(e.target.value))}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
              >
                {dashData.periods.map((p, i) => (
                  <option key={p.period} value={i}>{p.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="hidden lg:block bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400">
              vs {d.compareLabel}
            </div>

            {/* Info */}
            <div className="relative">
              <button onClick={() => { setInfoOpen(!infoOpen); setNotifOpen(false); setMenuOpen(false); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <Info size={15} />
              </button>
              {infoOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-lg p-4 text-xs text-slate-600 leading-relaxed z-30">
                  <div className="font-bold text-slate-800 mb-1">About this dashboard</div>
                  One source of truth across Salesforce, Client Portal, Accounting and HRMS, sliced into Board / ExCo / Council views per the MIS tiered-reporting model.
                  <div className="mt-2 text-[10px] text-slate-400">
                    Data source: <span className="font-semibold capitalize">{dashData.source?.replace("_", " ") ?? "static"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setInfoOpen(false); setMenuOpen(false); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 relative">
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-xl shadow-lg p-2 z-30">
                  {[
                    "Operational Excellence score dropped — review at next OpEx Council",
                    "Compliance change requires CoSec process update",
                    "AI Automation delivered 120+ hours saved this period",
                  ].map((m, i) => (
                    <div key={i} className="px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg flex gap-2">
                      <Clock size={12} className="mt-0.5 shrink-0 text-slate-300" /> {m}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Menu */}
            <div className="relative">
              <button onClick={() => { setMenuOpen(!menuOpen); setInfoOpen(false); setNotifOpen(false); }} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <MoreVertical size={15} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 z-30">
                  {["Export as PDF", "Share with ExCo", "Dashboard settings"].map((m) => (
                    <button key={m} onClick={() => { showToast(`${m} — coming soon`); setMenuOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg">
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        {view === "overview" ? (
          <main
            className="flex-1 min-h-0 overflow-hidden p-4 flex flex-col gap-3"
            onClick={() => { setInfoOpen(false); setNotifOpen(false); setMenuOpen(false); }}
          >
            {/* Row 1 — KPIs */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              <KpiCard icon={Wallet} label="Revenue (YTD)" value={d.revenue} target={d.revenueTarget} spark={d.revenueSpark} color="#6366f1" />
              <KpiCard icon={TrendingUp} label="Gross Profit (YTD)" value={d.gp} target={d.gpTarget} spark={d.gpSpark} color="#10b981" />
              <KpiCard icon={Target} label="Forecast (FY2026)" value={forecastPct} target={{ base: d.forecastBase, target: d.forecastTarget }} isPct color="#0ea5e9" />
              <KpiCard icon={Activity} label="EBITDA (YTD)" value={d.ebitda} target={d.ebitdaTarget} spark={d.ebitdaSpark} color="#f59e0b" />
            </div>

            {/* Row 2 — Scorecard + Risk */}
            <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
              <Card className="col-span-2 flex flex-col min-h-0">
                <CardHeader
                  title="Strategic Health Scorecard"
                  sub="Balanced Scorecard — click a pillar for the weighted breakdown"
                  right={<button onClick={() => setView("health")} className="text-[10px] font-semibold text-indigo-600 shrink-0">Full detail</button>}
                />
                <div className="flex-1 min-h-0 grid grid-cols-4 gap-2 items-center">
                  {Object.keys(d.scorecard).map((k) => {
                    const s = d.scorecard[k as keyof typeof d.scorecard];
                    const tone = scoreTone(s.score);
                    return (
                      <button key={k} onClick={() => setView("health")} className="text-center min-w-0 rounded-xl py-1.5 hover:bg-slate-50 transition-colors cursor-pointer">
                        <Gauge score={s.score} size="h-20" scoreSize="text-2xl" />
                        <div className="text-xs font-semibold text-slate-700 mt-1 truncate" title={SCORECARD_META[k].label}>{SCORECARD_META[k].label}</div>
                        <div className="mt-1"><Badge label={s.score >= 80 ? "Good" : "At Risk"} tone={tone} /></div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                          <TrendArrow trend={s.trend} size={10} /> {Math.abs(s.trend)} pts
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="flex flex-col min-h-0">
                <CardHeader title="Enterprise Risk Overview" sub={`Trend vs ${prevLabel}`} />
                <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                  {d.risks.map((r) => (
                    <div key={r.area} className="flex items-center justify-between text-[11px] gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-700 truncate">{r.area}</div>
                        <div className="text-slate-400 truncate">{r.desc}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge label={r.sev} tone={sevColor(r.sev)} />
                        <TrendArrow trend={r.trend} goodIsUp={false} size={11} />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setView("risk")} className="mt-2 text-[11px] font-semibold text-indigo-600 flex items-center gap-1 hover:gap-1.5 transition-all shrink-0">
                  View all risks <ArrowRight size={11} />
                </button>
              </Card>
            </div>

            {/* Row 3 — Forecast + Initiatives + Stories */}
            <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
              <Card className="flex flex-col min-h-0">
                <CardHeader title="Forecast Outlook (FY2026)" sub={`${forecastPct}% of $${d.forecastTarget}M target`} />
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={d.chart} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="q" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                      <Line type="monotone" dataKey="base" stroke="#10b981" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                      <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-2.5 text-[9px] text-slate-400 mt-1 shrink-0">
                  <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-indigo-500" />Actual</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500" />Forecast</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-slate-400" />Target</span>
                </div>
              </Card>

              <Card className="flex flex-col min-h-0">
                <CardHeader title="Strategic Initiatives" right={<button onClick={() => setView("initiatives")} className="text-[10px] font-semibold text-indigo-600 shrink-0">View all</button>} />
                <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                  {d.initiatives.map((it) => (
                    <div key={it.name}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-[11px] font-medium text-slate-600 truncate" title={it.name}>{it.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0">{it.progress}%</span>
                      </div>
                      <ProgressBar value={it.progress} tone={statusColor(it.status)} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col min-h-0">
                <CardHeader title="Management Stories" right={<button onClick={() => setView("stories")} className="text-[10px] font-semibold text-indigo-600 shrink-0">See all</button>} />
                <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
                  {dashData.stories.slice(0, 3).map((s) => (
                    <div key={s.title} className="border-l-2 pl-2.5 min-w-0" style={{ borderColor: colorMap[s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"].bar }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-700 truncate">{s.title}</span>
                        <Badge label={s.sentiment} tone={s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={s.summary}>{s.summary}</p>
                      <p className="text-[9px] text-slate-300 mt-0.5 truncate">{s.thread} · {s.time}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Row 4 — Narrative */}
            <Card className="shrink-0 py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                    <MessageSquare size={13} className="text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">Executive Narrative (Key Takeaways)</div>
                    <div className="flex flex-col sm:flex-row gap-x-5 gap-y-0.5">
                      {d.narrative.map((n, i) => (
                        <span key={i} className="text-[11px] text-slate-500"><b className="text-slate-700">{i + 1}.</b> {n}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={() => showToast("Full Executive Report export started…")} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                  View Full Executive Report <ArrowRight size={12} />
                </button>
              </div>
            </Card>
          </main>
        ) : (
          <main className="flex-1 min-h-0 overflow-y-auto p-6" onClick={() => { setInfoOpen(false); setNotifOpen(false); setMenuOpen(false); }}>
            {/* ── Strategic Health ─────────────────────────────────────────── */}
            {view === "health" && (
              <div className="space-y-5 max-w-6xl">
                <Card>
                  <CardHeader title="Strategic Health Scorecard — Detail" sub={`${d.label} · each pillar score is a weighted blend of the KPIs each Council already tracks`} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {Object.keys(d.scorecard).map((k) => (
                      <PillarDetailCard key={k} pillarKey={k} s={d.scorecard[k as keyof typeof d.scorecard]} prevLabel={prevLabel} />
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="How scores are read" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Each pillar score is the weighted average of 4 underlying KPIs already reported to the relevant Council (weights shown above
                    each indicator). Financial Health and Customer &amp; Market roll up from the Revenue &amp; Growth Council; Operational Excellence from
                    the OpEx Council; Tech &amp; Innovation from the Technology &amp; Intelligence Council. Indicator score ≥ 80 = Good, 60–79 = At Risk,
                    &lt; 60 = Critical — the same thresholds used for the headline pillar score.
                  </p>
                </Card>
              </div>
            )}

            {/* ── Enterprise Risk ──────────────────────────────────────────── */}
            {view === "risk" && (
              <div className="space-y-5 max-w-5xl">
                <Card>
                  <CardHeader
                    title="Enterprise Risk Overview"
                    sub={`${d.label} · trend vs ${d.compareLabel}`}
                    right={
                      <div className="flex gap-1.5">
                        {["All", "Low", "Medium", "High"].map((f) => (
                          <button key={f} onClick={() => setRiskFilter(f)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${riskFilter === f ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    }
                  />
                  <div className="space-y-1">
                    {filteredRisks.map((r, i) => (
                      <div key={r.area}>
                        <button onClick={() => setSelectedRisk(selectedRisk === i ? null : i)} className="w-full flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 text-left transition-colors">
                          <div>
                            <div className="text-sm font-semibold text-slate-700">{r.area}</div>
                            <div className="text-xs text-slate-400">{r.desc}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge label={r.sev} tone={sevColor(r.sev)} />
                            <div className="flex items-center gap-1 text-xs text-slate-400 w-16 justify-end">
                              <TrendArrow trend={r.trend} goodIsUp={false} /> {r.trend}
                            </div>
                            <ChevronDown size={14} className={`text-slate-300 transition-transform ${selectedRisk === i ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        {selectedRisk === i && (
                          <div className="px-3 pb-3 -mt-1 text-xs text-slate-500">
                            Owning council: <span className="font-semibold text-slate-700">{r.owner}</span> · escalation path follows the RACI + RAPID® decision matrix (Council → ExCo → BOD).
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Structural Governance Risks" sub="Baseline bottlenecks identified in the EOM framework — addressed by the new operating model, not period-specific" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dashData.structuralRisks.map((s) => (
                      <div key={s.name} className="border border-slate-100 rounded-xl p-3.5">
                        <div className="text-sm font-semibold text-slate-700 mb-1">{s.name}</div>
                        <div className="text-xs text-slate-500 mb-2">{s.desc}</div>
                        <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{s.framework}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Financials ───────────────────────────────────────────────── */}
            {view === "financials" && (
              <div className="space-y-5 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard icon={Wallet} label="Revenue (YTD)" value={d.revenue} target={d.revenueTarget} spark={d.revenueSpark} color="#6366f1" />
                  <KpiCard icon={TrendingUp} label="Gross Profit (YTD)" value={d.gp} target={d.gpTarget} spark={d.gpSpark} color="#10b981" />
                  <KpiCard icon={Activity} label="EBITDA (YTD)" value={d.ebitda} target={d.ebitdaTarget} spark={d.ebitdaSpark} color="#f59e0b" />
                </div>
                <Card>
                  <CardHeader title="Gross Profit by Department" sub={`${d.label} · matches monthly GP report structure`} />
                  <div className="space-y-4">
                    {d.departments.map((dep) => (
                      <div key={dep.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-600">{dep.name}</span>
                          <span className="text-sm font-bold text-slate-700">${fmt1(dep.value)}M <span className="text-xs text-slate-400 font-normal">({dep.pct}%)</span></span>
                        </div>
                        <ProgressBar value={dep.pct} tone="emerald" thick />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Margins" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center border border-slate-100 rounded-xl py-4">
                      <div className="text-2xl font-extrabold text-slate-800">{fmt1((d.gp / d.revenue) * 100)}%</div>
                      <div className="text-xs text-slate-400 mt-1">Gross Profit Margin</div>
                    </div>
                    <div className="text-center border border-slate-100 rounded-xl py-4">
                      <div className="text-2xl font-extrabold text-slate-800">{fmt1((d.ebitda / d.revenue) * 100)}%</div>
                      <div className="text-xs text-slate-400 mt-1">EBITDA Margin</div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* ── Forecast ─────────────────────────────────────────────────── */}
            {view === "forecast" && (
              <div className="space-y-5 max-w-5xl">
                <Card>
                  <CardHeader title="Forecast Outlook — FY2026" sub={`Base $${d.forecastBase}M (${forecastPct}% of $${d.forecastTarget}M target)`} />
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={d.chart} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="q" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} />
                        <Line type="monotone" dataKey="base" name="Forecast (Base)" stroke="#10b981" strokeWidth={2.5} strokeDasharray="6 4" dot={false} />
                        <Line type="monotone" dataKey="target" name="Target" stroke="#94a3b8" strokeWidth={2} strokeDasharray="2 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500" />Actual</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500" />Forecast (Base)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400" />Target</span>
                  </div>
                </Card>
                <Card>
                  <div className="text-xs text-slate-500 leading-relaxed">
                    <b className="text-slate-700">Outlook:</b> on track to reach {forecastPct}% of the annual ${d.forecastTarget}M target under the
                    base scenario for {d.label}. Quarterly figures shown for Revenue Council review; forecast accuracy and pipeline
                    coverage are tracked weekly per the council charter.
                  </div>
                </Card>
              </div>
            )}

            {/* ── Initiatives ──────────────────────────────────────────────── */}
            {view === "initiatives" && (
              <div className="space-y-5 max-w-5xl">
                {dashData.councils.map((c) => (
                  <Card key={c.council}>
                    <CardHeader title={c.council} sub={`Accountable for: ${c.accountable}`} />
                    <div className="space-y-3.5">
                      {c.items.map((it) => (
                        <div key={it.name}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-sm font-medium text-slate-600 truncate" title={it.name}>{it.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge label={it.status} tone={statusColor(it.status)} />
                              <span className="text-xs font-bold text-slate-400 w-9 text-right">{it.progress}%</span>
                            </div>
                          </div>
                          <ProgressBar value={it.progress} tone={statusColor(it.status)} />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ── Stories ──────────────────────────────────────────────────── */}
            {view === "stories" && (
              <div className="space-y-4 max-w-5xl">
                <div className="flex gap-2">
                  {["All", "Positive", "Watch", "Action"].map((f) => (
                    <button key={f} onClick={() => setStoryFilter(f)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${storyFilter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStories.map((s) => (
                    <Card key={s.title}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700">{s.title}</span>
                        <Badge label={s.sentiment} tone={s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"} />
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-3">{s.summary}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span className="font-mono">{s.thread}</span>
                        <span className="flex items-center gap-1"><Clock size={10} />{s.time}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ── Reports ──────────────────────────────────────────────────── */}
            {view === "reports" && (
              <Card className="max-w-5xl">
                <CardHeader title="Reports Library" sub="Generated from the EOM governance & MIS workflow" />
                <div className="divide-y divide-slate-100">
                  {dashData.reports.map((r) => (
                    <div key={r.name} className="flex items-center justify-between py-3.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FileText size={15} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-700 truncate">{r.name}</div>
                          <div className="text-xs text-slate-400">Updated {r.updated}</div>
                        </div>
                      </div>
                      <button onClick={() => showToast(`Opening "${r.name}"…`)} className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </main>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
          {toast}
          <button onClick={() => setToast(null)}><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ── Utility ─────────────────────────────────────────────────────────────────

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
