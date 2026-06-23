"use client";
/**
 * AIChatPanel.tsx
 * ───────────────
 * A floating or sidebar-integrated chat interface for the FP&A Analyst.
 * It "reads" the current PeriodData and can answer questions about variances,
 * drivers, and operational signals.
 */

import { useState, useEffect, useRef } from "react";
import { Send, Bot, Sparkles, X, ChevronRight } from "lucide-react";
import type { PeriodData } from "@/types/dashboard";
import { fmt1 } from "@/lib/helpers";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  currentData: PeriodData;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatPanel({ currentData, isOpen, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm your OneIBC FP&A Analyst. I've analyzed the data for ${currentData.label}. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    void persistChat("user", input, currentData.label);

    // Simulate AI reasoning over dashboard data
    setTimeout(() => {
      const response = generateAIResponse(input, currentData);
      const aiMsg: Message = { role: "assistant", content: response, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      void persistChat("assistant", response, currentData.label);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-6 bottom-24 w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-sm font-bold">AI FP&A Analyst</div>
            <div className="text-[10px] text-indigo-100 opacity-80">Live Reasoning Engine</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
              m.role === "user" 
                ? "bg-indigo-600 text-white rounded-tr-none" 
                : "bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-none"
            }`}>
              {m.role === "assistant" && <Bot size={12} className="mb-1 text-indigo-500" />}
              {m.content}
              <div className={`mt-1 text-[9px] opacity-50 ${m.role === "user" ? "text-right" : "text-left"}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about revenue, centers, or signals..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Explain variance", "KYC Risks", "Center costs"].map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-[10px] text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              {q} <ChevronRight size={10} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Best-effort persist of a chat message (no-op server-side without a DB). */
async function persistChat(role: string, content: string, period?: string) {
  try {
    await fetch("/api/settings/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, period }),
    });
  } catch {
    /* ignore — chat still works offline */
  }
}

// ── Mock AI Reasoning Logic ──────────────────────────────────────────────────

function generateAIResponse(input: string, data: PeriodData): string {
  const query = input.toLowerCase();
  
  if (query.includes("variance") || query.includes("revenue")) {
    const revVar = data.revenue - data.revenueTarget;
    const revVarPct = (revVar / data.revenueTarget) * 100;
    return `Revenue for ${data.label} is $${data.revenue}M, which is ${fmt1(revVarPct)}% ${revVarPct >= 0 ? 'above' : 'below'} the target of $${data.revenueTarget}M. The main driver is the Service & Formation segment in HK. Would you like a breakdown of the Pricebook contributors?`;
  }

  if (query.includes("kyc") || query.includes("risk") || query.includes("signal")) {
    const signal = data.insights?.find(i => i.category === "Operational" || i.category === "Risk");
    if (!signal) return "I don't see any critical operational risks in the current data snapshot.";
    return `Analysis: ${signal.signal}. ${signal.description} My confidence in this signal is ${(signal.confidence * 100).toFixed(0)}%. I recommend reviewing the HK Fulfillment Center workflow.`;
  }

  if (query.includes("center") || query.includes("plant") || query.includes("cost")) {
    const centers = data.operations?.serviceCenters;
    if (!centers || centers.length === 0) return "Operation details for centers are not available in this view.";
    const hq = centers.find(c => c.type === "HQ");
    return `${data.label} Operating Cost Analysis: HQ cost is at $${hq?.actual}M vs a target of $${hq?.target}M. Fulfillment centers in SG and HK are performing within 5% of target margin. Procurement center costs have stabilized.`;
  }

  if (query.includes("capital") || query.includes("cash") || query.includes("p&l")) {
    const pl = data.capital?.pl.find(p => p.item === "EBITDA");
    return `CEO Financial Summary: EBITDA is trending at $${pl?.actual}M. Cash flow from operating activities remains strong at $27M net. Overall capital health is stable.`;
  }

  return "I understand your query. Based on the Salesforce and Sheets data, I can provide detailed insights on revenue drivers, service center costs, or financial variances. Please specify which area you'd like to dive into.";
}
