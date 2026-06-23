"use client";
/**
 * Settings — admin console for the BOD dashboard.
 * Password-gated. Manages scorecard weights & inputs, sheet templates,
 * access logs, AI chat history and the (stored) Claude API key.
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon, SlidersHorizontal, Table2, ScrollText,
  MessagesSquare, KeyRound, LogOut, ArrowLeft, Save, Trash2, AlertTriangle, Lock,
} from "lucide-react";

interface SheetTemplate { sheetId: string; sheetTab: string; csvUrl: string; mappingNote: string }
interface Settings {
  scorecardWeights: Record<string, number>;
  pillarWeights: { financial: number; customer: number; operational: number; technology: number };
  thresholds: { spiWarn: number; cpiWarn: number; attritionHigh: number };
  sheetTemplate: SheetTemplate;
  apiKey: string;
  apiKeySet: boolean;
}
interface AccessLog { id: string; ts: string; actor: string | null; action: string; detail: string | null }
interface ChatRow { id: string; ts: string; role: string; content: string; period: string | null }

const TABS = [
  { id: "weights",  label: "Weights & Inputs", icon: SlidersHorizontal },
  { id: "sheets",   label: "Sheet Templates",  icon: Table2 },
  { id: "logs",     label: "Access Logs",      icon: ScrollText },
  { id: "history",  label: "AI Chat History",  icon: MessagesSquare },
  { id: "apikey",   label: "API Key",          icon: KeyRound },
] as const;
type TabId = (typeof TABS)[number]["id"];

const fmtTs = (ts: string) => new Date(ts).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

export default function SettingsPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [dbEnabled, setDbEnabled] = useState(true);
  const [tab, setTab] = useState<TabId>("weights");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [scWeightsText, setScWeightsText] = useState("{}");
  const [newApiKey, setNewApiKey] = useState("");
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [history, setHistory] = useState<ChatRow[]>([]);
  const [toast, setToast] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (r.status === 401) { setAuthed(false); return; }
    const j = await r.json();
    setSettings(j.settings);
    setScWeightsText(JSON.stringify(j.settings.scorecardWeights ?? {}, null, 2));
    setDbEnabled(j.dbEnabled);
    setAuthed(true);
  }, []);

  useEffect(() => { void (async () => { await load(); })(); }, [load]);

  useEffect(() => {
    if (!authed) return;
    if (tab === "logs") fetch("/api/settings/logs").then(r => r.json()).then(j => setLogs(j.logs ?? [])).catch(() => {});
    if (tab === "history") fetch("/api/settings/chat-history").then(r => r.json()).then(j => setHistory(j.history ?? [])).catch(() => {});
  }, [tab, authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const r = await fetch("/api/settings/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (r.ok) { setPassword(""); await load(); }
    else { const j = await r.json().catch(() => ({})); setLoginErr(j.error ?? "Đăng nhập thất bại."); }
  }

  async function logout() {
    await fetch("/api/settings/auth", { method: "DELETE" });
    setAuthed(false); setSettings(null);
  }

  async function save(patch: Record<string, unknown>) {
    const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.ok) { flash("Đã lưu."); await load(); }
    else { const j = await r.json().catch(() => ({})); flash(j.error ?? "Lưu thất bại."); }
  }

  async function clearHistory() {
    await fetch("/api/settings/chat-history", { method: "DELETE" });
    setHistory([]); flash("Đã xóa lịch sử chat.");
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (authed === null) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Đang tải…</div>;
  }
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <form onSubmit={login} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 w-full max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mb-5"><Lock size={22} className="text-white" /></div>
          <h1 className="text-lg font-black text-slate-800">OneIBC Settings</h1>
          <p className="text-[11px] text-slate-400 font-medium mt-1 mb-6">Khu vực quản trị — nhập mật khẩu để tiếp tục.</p>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
            placeholder="Mật khẩu" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {loginErr && <div className="text-[11px] text-red-500 font-bold mt-3">{loginErr}</div>}
          <button type="submit" className="w-full mt-5 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all">Đăng nhập</button>
          <Link href="/" className="block text-center text-[11px] text-slate-400 font-bold mt-4 hover:text-indigo-600">← Về Dashboard</Link>
        </form>
      </div>
    );
  }

  // ── Authed console ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <SettingsIcon size={20} className="text-indigo-600" />
          <div>
            <h1 className="text-base font-black">OneIBC Settings Console</h1>
            <p className="text-[10px] text-slate-400 font-medium">Quản trị cấu hình, logs, lịch sử & API key</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-[11px] font-black text-slate-500 hover:text-indigo-600"><ArrowLeft size={14} /> Dashboard</Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-[11px] font-black text-red-500 hover:text-red-600"><LogOut size={14} /> Đăng xuất</button>
        </div>
      </header>

      {!dbEnabled && (
        <div className="bg-amber-50 border-b border-amber-100 px-8 py-3 flex items-center gap-2 text-[11px] font-bold text-amber-700">
          <AlertTriangle size={14} /> Chưa cấu hình DATABASE_URL — thay đổi sẽ KHÔNG được lưu. Thêm Postgres trên Railway để bật persistence.
        </div>
      )}

      <div className="max-w-5xl mx-auto p-8 flex gap-8">
        {/* Side nav */}
        <nav className="w-56 shrink-0 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-black transition-all ${tab === t.id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-white"}`}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0">
          {settings && tab === "weights" && (
            <div className="space-y-6">
              <Section title="Pillar weights (Company Health composite)" desc="Trọng số mỗi trụ cột khi tính chỉ số sức khỏe tổng hợp. Tổng nên = 1.0.">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(["financial", "customer", "operational", "technology"] as const).map((k) => (
                    <NumField key={k} label={k} value={settings.pillarWeights[k]} step={0.05}
                      onChange={(v) => setSettings({ ...settings, pillarWeights: { ...settings.pillarWeights, [k]: v } })} />
                  ))}
                </div>
                <SaveBtn onClick={() => save({ pillarWeights: settings.pillarWeights })} />
              </Section>

              <Section title="Thresholds" desc="Ngưỡng cảnh báo dùng xuyên suốt dashboard.">
                <div className="grid grid-cols-3 gap-4">
                  <NumField label="SPI warn" value={settings.thresholds.spiWarn} step={0.05} onChange={(v) => setSettings({ ...settings, thresholds: { ...settings.thresholds, spiWarn: v } })} />
                  <NumField label="CPI warn" value={settings.thresholds.cpiWarn} step={0.05} onChange={(v) => setSettings({ ...settings, thresholds: { ...settings.thresholds, cpiWarn: v } })} />
                  <NumField label="Attrition high %" value={settings.thresholds.attritionHigh} step={1} onChange={(v) => setSettings({ ...settings, thresholds: { ...settings.thresholds, attritionHigh: v } })} />
                </div>
                <SaveBtn onClick={() => save({ thresholds: settings.thresholds })} />
              </Section>

              <Section title="Scorecard sub-KPI weight overrides (advanced)" desc='JSON map theo key "pillar.Tên sub-KPI" → trọng số. Áp dụng lại điểm pillar trên dashboard. Để {} nếu dùng mặc định.'>
                <textarea value={scWeightsText} onChange={(e) => setScWeightsText(e.target.value)} rows={8}
                  className="w-full font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                <SaveBtn label="Lưu overrides" onClick={() => {
                  try { const parsed = JSON.parse(scWeightsText); save({ scorecardWeights: parsed }); }
                  catch { flash("JSON không hợp lệ."); }
                }} />
              </Section>
            </div>
          )}

          {settings && tab === "sheets" && (
            <Section title="Google Sheet / CSV template" desc="Cấu hình nguồn dữ liệu. Lưu ý: nguồn thực tế đọc từ biến môi trường GOOGLE_SHEET_ID / DASHBOARD_CSV_URL; phần này lưu tham chiếu & ghi chú mapping cho team.">
              <div className="space-y-4">
                <TextField label="Google Sheet ID" value={settings.sheetTemplate.sheetId} onChange={(v) => setSettings({ ...settings, sheetTemplate: { ...settings.sheetTemplate, sheetId: v } })} />
                <TextField label="Sheet tab" value={settings.sheetTemplate.sheetTab} onChange={(v) => setSettings({ ...settings, sheetTemplate: { ...settings.sheetTemplate, sheetTab: v } })} />
                <TextField label="CSV URL" value={settings.sheetTemplate.csvUrl} onChange={(v) => setSettings({ ...settings, sheetTemplate: { ...settings.sheetTemplate, csvUrl: v } })} />
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Mapping note</label>
                  <textarea value={settings.sheetTemplate.mappingNote} onChange={(e) => setSettings({ ...settings, sheetTemplate: { ...settings.sheetTemplate, mappingNote: e.target.value } })} rows={4}
                    className="w-full mt-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <SaveBtn onClick={() => save({ sheetTemplate: settings.sheetTemplate })} />
            </Section>
          )}

          {tab === "logs" && (
            <Section title="Access logs" desc="200 sự kiện gần nhất.">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead><tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2">Thời gian</th><th className="text-left">Action</th><th className="text-left">Detail</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-400">Chưa có log (hoặc chưa bật DB).</td></tr>}
                    {logs.map((l) => (
                      <tr key={l.id}><td className="py-2 text-slate-500 whitespace-nowrap pr-4">{fmtTs(l.ts)}</td><td className="font-bold text-slate-700">{l.action}</td><td className="text-slate-400">{l.detail}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {tab === "history" && (
            <Section title="AI chat history" desc="Lịch sử hội thoại với AI Analyst." right={<button onClick={clearHistory} className="flex items-center gap-1.5 text-[11px] font-black text-red-500 hover:text-red-600"><Trash2 size={13} /> Xóa hết</button>}>
              <div className="space-y-3">
                {history.length === 0 && <div className="py-8 text-center text-slate-400 text-[12px]">Chưa có lịch sử (hoặc chưa bật DB).</div>}
                {history.map((m) => (
                  <div key={m.id} className={`p-3 rounded-xl text-[12px] ${m.role === "user" ? "bg-indigo-50 text-indigo-900" : "bg-slate-50 text-slate-700"}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{m.role} · {fmtTs(m.ts)}{m.period ? ` · ${m.period}` : ""}</div>
                    {m.content}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {settings && tab === "apikey" && (
            <Section title="Claude API key" desc="Lưu key để dùng cho AI reasoning (hiện AI chat vẫn rule-based; key được lưu sẵn cho tương lai). Key được che khi hiển thị.">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Key hiện tại</label>
                  <div className="mt-1.5 font-mono text-[12px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500">{settings.apiKeySet ? settings.apiKey : "— chưa đặt —"}</div>
                </div>
                <TextField label="Đặt key mới" value={newApiKey} onChange={setNewApiKey} placeholder="sk-ant-…" mono />
              </div>
              <SaveBtn label="Lưu key" onClick={() => { if (!newApiKey.trim()) { flash("Nhập key trước."); return; } save({ apiKey: newApiKey.trim() }).then(() => setNewApiKey("")); }} />
            </Section>
          )}
        </div>
      </div>

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[12px] font-black px-6 py-3 rounded-2xl shadow-2xl z-50">{toast}</div>}
    </div>
  );
}

// ── Small field helpers ─────────────────────────────────────────────────────

function Section({ title, desc, children, right }: { title: string; desc?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-black text-slate-800">{title}</h2>
          {desc && <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500 capitalize">{label}</label>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className={`w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] outline-none focus:ring-2 focus:ring-indigo-500/20 ${mono ? "font-mono" : ""}`} />
    </div>
  );
}

function SaveBtn({ onClick, label = "Lưu" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-black hover:bg-indigo-700 transition-all">
      <Save size={14} /> {label}
    </button>
  );
}
