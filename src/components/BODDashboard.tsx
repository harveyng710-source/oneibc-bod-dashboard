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
  const [loading, setLoading] = useState(false);

  const d: PeriodData = dashData.periods[periodIdx] ?? dashData.periods[0];
  
  const currentTargetLabel = comparisonMode === "budget" ? "Budget" : "Forecast";
  const revenueTarget = comparisonMode === "budget" ? d.revenueTarget : d.revenueForecast;
  const gpTarget = comparisonMode === "budget" ? d.gpTarget : d.gpForecast;
  const ebitdaTarget = comparisonMode === "budget" ? d.ebitdaTarget : d.ebitdaForecast;

  const forecastPct = Math.round((d.forecastBase / d.forecastTarget) * 100);
  const navLabel = NAV.find((n) => n.id === view)?.label || "AI Overview";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

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
                 <div className="text-[10px] leading-tight text-slate-300">Salesforce Pricebook linked successfully.</div>
              </div>
              <div className="flex gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                 <div className="text-[10px] leading-tight text-slate-300">VN Service Center synced 5m ago.</div>
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
            <p className="text-[11px] text-slate-400 font-medium">FP&A Pulse Intelligence • Global Management Tier-1</p>
          </div>
          
          <div className="flex items-center gap-4 group">
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   <Card className="lg:col-span-2 flex flex-col h-[400px]">
                      <CardHeader title="Variance Intelligence" sub="Real-time Revenue vs Budget/Forecast Deviation" />
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={d.chart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="q" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPulse)" />
                            <defs>
                              <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
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
                      <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] text-slate-400">
                         *Data pulled from Salesforce Pricebook • Refresh in 14m
                      </div>
                   </Card>
                </div>

                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20 flex flex-col md:flex-row items-center gap-6">
                   <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-md">
                      <Sparkles size={32} />
                   </div>
                   <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Analyst Signal</div>
                      <div className="text-sm font-bold leading-relaxed">
                        The {d.label} revenue is trending {d.revenue > d.revenueTarget ? 'up' : 'down'} vs budget. 
                        AI detects a high performance in the {d.departments[0]?.name} segment. 
                        Confidence: {((d.insights?.[0]?.confidence || 0.88) * 100).toFixed(0)}%.
                      </div>
                   </div>
                   <button onClick={() => setAIChatOpen(true)} className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs hover:bg-slate-50 transition-colors shrink-0">
                      Deep Dive Analysis
                   </button>
                </div>
             </div>
          ) : view === "operations" ? (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                   <CardHeader title="Fulfillment Plants (Centers)" sub="Operational performance by Location" />
                   <div className="space-y-4">
                      {d.operations?.serviceCenters.map(sc => (
                        <div key={sc.name} className="flex items-center justify-between p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                           <div>
                              <div className="text-sm font-black text-slate-800">{sc.name}</div>
                              <Badge label={sc.type} tone={sc.type === 'HQ' ? 'indigo' : 'slate'} />
                           </div>
                           <div className="text-right">
                              <div className="text-base font-black text-slate-800">${sc.actual}M</div>
                              <div className={`text-[10px] font-bold ${sc.actual > sc.target ? 'text-red-500' : 'text-emerald-500'}`}>
                                Var vs Target: {sc.actual > sc.target ? '+' : '-'}${Math.abs(sc.actual - sc.target).toFixed(2)}M
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card>
                   <CardHeader title="Supplier & Bank Ecosystem" sub="Financial Integrity & Spend Management" />
                   <div className="space-y-6">
                      {d.operations?.suppliers.map(sup => (
                        <div key={sup.name} className="p-4 rounded-3xl border border-slate-50 shadow-sm">
                           <div className="flex justify-between items-center mb-3">
                              <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                                 {sup.name} <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md uppercase">{sup.category}</span>
                              </div>
                              <div className="text-xs font-black text-indigo-600">{sup.performance}% Performance</div>
                           </div>
                           <ProgressBar value={sup.performance} tone={sup.performance > 90 ? "emerald" : "amber"} />
                           <div className="mt-2 flex justify-between text-[10px] text-slate-400 font-bold">
                              <span>Monthly Volume: ${sup.spend}M</span>
                              <span>SLA Status: Optimal</span>
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
                   <div className="flex-1 overflow-y-auto space-y-1">
                      <div className="grid grid-cols-4 px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-2">
                         <div>Account</div>
                         <div className="text-right">Actual</div>
                         <div className="text-right">Budget</div>
                         <div className="text-right">Var</div>
                      </div>
                      {d.capital?.pl.map((line, i) => (
                        <div key={i} className={`grid grid-cols-4 px-4 py-4 text-xs font-bold rounded-2xl ${i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}`}>
                           <div className="text-slate-800">{line.item}</div>
                           <div className="text-right">${line.actual}M</div>
                           <div className="text-right text-slate-400">${line.budget}M</div>
                           <div className={`text-right font-black ${line.variance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {line.variance > 0 ? '+' : ''}{line.variance}M
                           </div>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card>
                   <CardHeader title="Cash Flow Dynamics" sub="Operational Liquidity Health" />
                   <div className="h-64 mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={d.capital?.cashFlow}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                           <Tooltip contentStyle={{borderRadius: '16px'}} />
                           <Line type="stepAfter" dataKey="net" stroke="#6366f1" strokeWidth={5} dot={{ r: 8, fill: '#6366f1', strokeWidth: 4, stroke: '#fff' }} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-3 gap-3">
                      {d.capital?.cashFlow.map(cf => (
                        <div key={cf.category} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 transition-transform hover:scale-105">
                           <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 truncate">{cf.category}</div>
                           <div className={`text-sm font-black ${cf.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
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
                      <Card key={i} className="flex flex-col justify-between hover:border-indigo-400 border-2 border-transparent transition-all">
                         <div>
                            <div className="flex justify-between items-start mb-4">
                               <Badge label={ins.category} tone={ins.category === "Risk" ? "red" : "indigo"} />
                               <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                                  {Math.round(ins.confidence * 100)}% Match
                               </div>
                            </div>
                            <h3 className="text-sm font-black text-slate-800 mb-3">{ins.signal}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">{ins.description}</p>
                         </div>
                         <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Impact Factor</span>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-xl uppercase ${ins.impact === "High" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                               {ins.impact} Risk
                            </span>
                         </div>
                      </Card>
                   ))}
                </div>
                
                <Card className="bg-[#1e293b] text-white overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Sparkles size={120} />
                   </div>
                   <div className="relative p-2">
                      <CardHeader title="AI Forecast Intelligence" sub="Predicted variance based on Salesforce Pipeline" />
                      <div className="flex flex-col md:flex-row gap-8 items-center mt-4">
                         <div className="text-4xl font-black text-emerald-400">+12%</div>
                         <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            Based on high-confidence leads in the HK & SG pricebooks, OneIBC is projected to exceed the {d.label} Revenue target by $1.2M.
                            Wait-time for KYC Fulfillment at Vietnam HQ has improved by 8% this period.
                         </p>
                         <button className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500 transition-all whitespace-nowrap">
                            Run Sensitivity Analysis
                         </button>
                      </div>
                   </div>
                </Card>
             </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="max-w-4xl mx-auto">
                   <CardHeader 
                    title="Management Reports Library" 
                    sub="MIS Governance Tier-1 Document Stack" 
                    right={<div className="p-2 bg-slate-100 rounded-xl"><Search size={16} className="text-slate-400" /></div>}
                   />
                   <div className="divide-y divide-slate-50">
                      {dashData.reports.map((r) => (
                        <div key={r.name} className="flex items-center justify-between py-5 group cursor-pointer hover:px-2 transition-all">
                           <div className="flex items-center gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                 <FileText size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                              </div>
                              <div className="min-w-0">
                                 <div className="text-sm font-black text-slate-800 truncate">{r.name}</div>
                                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Generated {r.updated} • OneIBC MIS</div>
                              </div>
                           </div>
                           <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                              <Download size={20} />
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
