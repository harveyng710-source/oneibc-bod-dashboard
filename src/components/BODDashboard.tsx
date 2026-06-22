"use client";
/**
 * BODDashboard.tsx
 * ────────────────
 * OneIBC AI FP&A Dashboard — Real-time Financial Planning & Analysis Analyst.
 * 
 * Integrated with Salesforce Pricebook (Drivers) and Service Centers (Plants).
 * Features 4 Core Modules: Overview, Operations, Capital, and Insight Signals.
 */

import { useState, useCallback, useRef, type DragEvent } from "react";
import {
  LayoutDashboard, Activity, Wallet, TrendingUp, Target,
  MessageSquare, FileText, Info, Bell, MoreVertical, ChevronDown,
  ArrowUp, ArrowDown, Minus, Building2, Clock, X, RefreshCw, ArrowRight,
  Upload, Sparkles, Bot, Search, Download
} from "lucide-react";
import dynamicImport from "next/dynamic";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import type { DashboardData, PeriodData, ComparisonMode } from "@/types/dashboard";
import { colorMap, statusColor, sevColor, scoreTone, fmt1, SCORECARD_META, NAV } from "@/lib/helpers";

const AIChatPanel = dynamicImport(() => import("./AIChatPanel"), { ssr: false });

// ─── Micro-components ────────────────────────────────────────────────────────

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
  let dir = typeof trend === "string" ? trend : trend > 0 ? "up" : trend < 0 ? "down" : "flat";
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

function Gauge({ score, size = "h-24", scoreSize = "text-3xl" }: { score: number; size?: string; scoreSize?: string }) {
  const tone = scoreTone(score);
  const color = colorMap[tone].bar;
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${(score / 100) * 251} 251`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`${scoreSize} font-black text-slate-800`}>{score}</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 ${className}`}>{children}</div>;
}

function CardHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-4 shrink-0">
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold text-slate-800 truncate">{title}</h3>
        {sub && <p className="text-[10px] text-slate-400 truncate mt-0.5">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, target, spark, color, suffix = "M", isPct = false }: {
  icon: any; label: string; value: number; target: number | { base: number; target: number };
  spark?: number[]; color: string; suffix?: string; isPct?: boolean;
}) {
  const deltaVal = isPct ? null : (((value - (target as number)) / (target as number)) * 100);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "20" }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-black text-slate-800 leading-none">
            {isPct ? `${value}%` : `$${fmt1(value)}${suffix}`}
          </div>
          {!isPct && deltaVal !== null && (
            <div className={`text-[10px] font-bold flex items-center gap-1 mt-1.5 ${deltaVal >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {deltaVal >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {Math.abs(deltaVal).toFixed(1)}% vs Var
            </div>
          )}
          {isPct && <div className="text-[10px] text-slate-400 mt-1.5 font-medium">Progress to Target</div>}
        </div>
        {spark && (
           <div className="w-16 h-6 shrink-0 opacity-50">
             {/* Simple Sparkline Mock */}
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
  const [dashData, setDashData] = useState<DashboardData>(initialData);
  const [view, setView] = useState("overview");
  const [periodIdx, setPeriodIdx] = useState(() => Math.max(0, dashData.periods.length - 1));
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("budget");
  const [aiChatOpen, setAIChatOpen] = useState(false);
  const [refreshed, setRefreshed] = useState("just now");
  const [toast, setToast] = useState<string | null>(null);

  const d: PeriodData = dashData.periods[periodIdx] ?? dashData.periods[0];
  
  const currentTargetLabel = comparisonMode === "budget" ? "Budget" : "Forecast";
  const revenueTarget = comparisonMode === "budget" ? d.revenueTarget : d.revenueForecast;
  const gpTarget = comparisonMode === "budget" ? d.gpTarget : d.gpForecast;
  const ebitdaTarget = comparisonMode === "budget" ? d.ebitdaTarget : d.ebitdaForecast;

  const forecastPct = Math.round((d.forecastBase / d.forecastTarget) * 100);
  const navLabel = NAV.find((n) => n.id === view)?.label || "AI Overview";

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
        </nav>

        <div className="p-4 bg-white/5 m-4 rounded-2xl border border-white/5">
           <div className="text-[10px] text-slate-400 font-black uppercase mb-3">Live Feed</div>
           <div className="space-y-3">
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                 <div className="text-[10px] leading-tight text-slate-300">Salesforce Pricebook Integration.</div>
              </div>
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                 <div className="text-[10px] leading-tight text-slate-300">VN HQ synced 5m ago.</div>
              </div>
           </div>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{navLabel}</h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide lowercase italic">oneibc board & executive intelligence layer</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
               {(["budget", "forecast"] as const).map(m => (
                 <button 
                  key={m} 
                  onClick={() => setComparisonMode(m)}
                  className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${comparisonMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                 >
                   VS {m.toUpperCase()}
                 </button>
               ))}
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

            <button className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 relative">
               <Bell size={18} />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {view === "overview" ? (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard icon={Wallet} label={`Revenue (${currentTargetLabel})`} value={d.revenue} target={revenueTarget} spark={d.revenueSpark} color="#6366f1" />
                  <KpiCard icon={TrendingUp} label={`Gross Profit (${currentTargetLabel})`} value={d.gp} target={gpTarget} spark={d.gpSpark} color="#10b981" />
                  <KpiCard icon={Target} label="Forecast Progress" value={forecastPct} target={{ base: d.forecastBase, target: d.forecastTarget }} isPct color="#0ea5e9" />
                  <KpiCard icon={Activity} label={`EBITDA (${currentTargetLabel})`} value={d.ebitda} target={ebitdaTarget} spark={d.ebitdaSpark} color="#f59e0b" />
                </div>

                {/* Scorecard + Risks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 flex flex-col min-h-0">
                    <CardHeader 
                      title="Strategic Health Scorecard" 
                      sub="Balanced Scorecard Pillar Performance — click to drill-down" 
                      right={<button onClick={() => setView("operations")} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">Detail View</button>}
                    />
                    <div className="grid grid-cols-4 gap-4 flex-1 items-center py-4">
                      {Object.keys(d.scorecard).map((k) => {
                        const s = d.scorecard[k as keyof typeof d.scorecard];
                        const tone = scoreTone(s.score);
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
                    <CardHeader title="Enterprise Risks" sub="Operational & Compliance Watchlist" />
                    <div className="space-y-4 overflow-y-auto pr-1">
                      {d.risks.map((r) => (
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

                {/* Variance Intelligence */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <Card className="lg:col-span-2 flex flex-col h-[400px]">
                      <CardHeader title="Variance Intelligence" sub="Real-time Revenue vs Budget/Forecast Deviation" />
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={d.chart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="q" axisLine={false} tickLine={false} tick={{fontSize: 10, fontStyle: 'bold', fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontStyle: 'bold', fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'}} />
                            <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorPulse)" />
                            <defs>
                              <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                   </Card>
                   
                   <Card className="flex flex-col h-[400px]">
                      <CardHeader title="Revenue Drivers" sub="Performance by Sales Pricebook" />
                      <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        {d.departments.map(dep => (
                          <div key={dep.name}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-black text-slate-700">{dep.name}</span>
                              <span className="text-[11px] font-black text-indigo-600">${dep.value}M</span>
                            </div>
                            <ProgressBar value={dep.pct} tone="emerald" thick />
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 italic text-[10px] text-indigo-600 font-bold">
                         *Salesforce Pricebook Integration • Automated Refresh
                      </div>
                   </Card>
                </div>

                {/* Initiatives + Stories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader title="Strategic Initiatives" sub="Global Council Execution Tracking" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 mt-2">
                      {d.initiatives.map((it) => (
                        <div key={it.name}>
                          <div className="flex items-center justify-between mb-2.5 gap-2">
                            <span className="text-[11px] font-black text-slate-700 truncate">{it.name}</span>
                            <span className="text-[11px] font-black text-slate-400">{it.progress}%</span>
                          </div>
                          <ProgressBar value={it.progress} tone={statusColor(it.status)} thick />
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <CardHeader title="Management Stories" sub="Latest Council Thread Updates" />
                    <div className="space-y-6">
                      {dashData.stories.slice(0, 3).map((s) => (
                        <div key={s.title} className="border-l-4 pl-5 py-1" style={{ borderColor: colorMap[s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"].bar }}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black text-slate-800">{s.title}</span>
                            <Badge label={s.sentiment} tone={s.sentiment === "Positive" ? "emerald" : s.sentiment === "Watch" ? "amber" : "red"} />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed font-medium">{s.summary}</p>
                          <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">{s.thread} • {s.time}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Bot Insight */}
                <div className="bg-[#0c1430] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-175 group-hover:rotate-0">
                      <Sparkles size={160} />
                   </div>
                   <div className="relative flex flex-col md:flex-row items-center gap-8">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-600/40">
                         <Bot size={40} />
                      </div>
                      <div className="flex-1">
                         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">OneIBC AI Executive Insight</div>
                         <div className="flex flex-col gap-2">
                            {d.narrative.map((n, i) => (
                               <div key={i} className="text-base font-bold text-slate-100 flex gap-3">
                                  <span className="text-indigo-500 font-black shrink-0">{i+1}.</span>
                                  <span>{n}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                      <button onClick={() => setAIChatOpen(true)} className="px-8 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-500 transition-all shrink-0 border border-white/10 shadow-lg hover:shadow-indigo-600/20 active:scale-95">
                         Start Agentic Chat
                      </button>
                   </div>
                </div>
             </div>
          ) : view === "operations" ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                   <CardHeader title="Fulfillment Plants (Centers)" sub="Operational performance by Location" />
                   <div className="space-y-4">
                      {d.operations?.serviceCenters.map(sc => (
                        <div key={sc.name} className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all">
                           <div>
                              <div className="text-base font-black text-slate-800">{sc.name}</div>
                              <Badge label={sc.type} tone={sc.type === 'HQ' ? 'indigo' : 'slate'} />
                           </div>
                           <div className="text-right">
                              <div className="text-xl font-black text-slate-800">${sc.actual}M</div>
                              <div className={`text-[10px] font-bold ${sc.actual > sc.target ? 'text-red-500' : 'text-emerald-500'}`}>
                                Var: {sc.actual > sc.target ? '+' : '-'}${Math.abs(sc.actual - sc.target).toFixed(2)}M
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card>
                   <CardHeader title="Supplier & Bank Ecosystem" sub="Financial Integrity & Spend Management" />
                   <div className="space-y-8">
                      {d.operations?.suppliers.map(sup => (
                        <div key={sup.name} className="p-5 rounded-3xl border border-slate-50 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-center mb-4">
                              <div className="text-sm font-black text-slate-800 flex items-center gap-3">
                                 {sup.name} <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">{sup.category}</span>
                              </div>
                              <div className="text-sm font-black text-indigo-600">{sup.performance}% Efficiency</div>
                           </div>
                           <ProgressBar value={sup.performance} tone={sup.performance > 90 ? "emerald" : "amber"} thick />
                           <div className="mt-3 flex justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wide">
                              <span>Monthly Volume: ${sup.spend}M</span>
                              <span>SLA Status: On Track</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
             </div>
          ) : view === "capital" ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="flex flex-col">
                   <CardHeader title="CEO Executive P&L" sub="Standard P&L Breakdown (Board View)" />
                   <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                      <div className="grid grid-cols-4 px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 mb-3">
                         <div>Account</div>
                         <div className="text-right">Actual</div>
                         <div className="text-right">Budget</div>
                         <div className="text-right">Var</div>
                      </div>
                      {d.capital?.pl.map((line, i) => (
                        <div key={i} className={`grid grid-cols-4 px-5 py-5 text-[13px] font-bold rounded-2xl transition-colors ${i % 2 === 0 ? 'bg-slate-50/50 hover:bg-slate-100/50' : 'bg-white hover:bg-slate-50'}`}>
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
                   <CardHeader title="Cash Flow Dynamics" sub="Operational Liquidity Health" />
                   <div className="h-72 mb-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={d.capital?.cashFlow}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                           <Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} />
                           <Line type="stepAfter" dataKey="net" stroke="#6366f1" strokeWidth={6} dot={{ r: 10, fill: '#6366f1', strokeWidth: 5, stroke: '#fff' }} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                      {d.capital?.cashFlow.map(cf => (
                        <div key={cf.category} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:scale-105 hover:bg-white hover:border-indigo-100">
                           <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 tracking-widest truncate">{cf.category}</div>
                           <div className={`text-lg font-black ${cf.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ${cf.net}M
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
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
                                  {Math.round(ins.confidence * 100)}% Confidence
                               </div>
                            </div>
                            <h3 className="text-base font-black text-slate-800 mb-4">{ins.signal}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">{ins.description}</p>
                         </div>
                         <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Impact Score</span>
                            <span className={`text-[11px] font-black px-4 py-1.5 rounded-xl uppercase ${ins.impact === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                               {ins.impact} IMPACT
                            </span>
                         </div>
                      </Card>
                   ))}
                </div>
                
                <Card className="bg-[#1e293b] text-white overflow-hidden relative p-8">
                   <div className="absolute top-0 right-0 p-12 opacity-15 scale-150 rotate-12">
                      <Sparkles size={160} />
                   </div>
                   <div className="relative">
                      <CardHeader title="AI Forecast Intelligence" sub="Sensitivity analysis based on current Salesforce pipeline strength" />
                      <div className="flex flex-col md:flex-row gap-12 items-center mt-6">
                         <div className="text-5xl font-black text-emerald-400 drop-shadow-lg">+12.4%</div>
                         <p className="text-base font-bold text-slate-300 leading-relaxed max-w-2xl">
                            Pipeline analysis confirms a potential 12.4% upside to the {d.label} revenue targets. This is primarily driven by 
                            the Service Bundle pricebook performance in Vietnam and Singapore fulfillment centers.
                         </p>
                         <button className="px-10 py-5 rounded-3xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 whitespace-nowrap active:scale-95">
                            Simulate Best Case
                         </button>
                      </div>
                   </div>
                </Card>
             </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="max-w-4xl mx-auto p-8">
                   <CardHeader 
                    title="Management Reports Library" 
                    sub="MIS Governance Tier-1 Document Stack" 
                    right={<div className="p-3 bg-slate-100 rounded-2xl"><Search size={20} className="text-slate-400" /></div>}
                   />
                   <div className="divide-y divide-slate-100 mt-6">
                      {dashData.reports.map((r) => (
                        <div key={r.name} className="flex items-center justify-between py-6 group cursor-pointer hover:px-4 transition-all rounded-2xl">
                           <div className="flex items-center gap-5 min-w-0">
                              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                 <FileText size={24} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                              </div>
                              <div className="min-w-0">
                                 <div className="text-[15px] font-black text-slate-800 truncate">{r.name}</div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Automated MIS • {r.updated}</div>
                              </div>
                           </div>
                           <button className="w-12 h-12 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                              <Download size={22} />
                           </button>
                        </div>
                      ))}
                   </div>
                </Card>
             </div>
          )}
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel 
        currentData={d} 
        isOpen={aiChatOpen} 
        onClose={() => setAIChatOpen(false)} 
      />

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-black px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-5 z-50 animate-in fade-in zoom-in slide-in-from-bottom-5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          {toast}
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white transition-colors ml-2"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
