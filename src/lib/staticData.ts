/**
 * staticData.ts
 * ─────────────
 * Fallback / seed data that mirrors the original TSX prototype.
 * When a real CSV or Google Sheets source is connected, this is
 * superseded by the parsed data; it remains useful for local dev
 * and as a type-safe schema reference.
 */
import type { DashboardData } from "@/types/dashboard";

export const STATIC_DASHBOARD_DATA: DashboardData = {
  source: "static",
  lastRefreshed: new Date().toISOString(),

  periods: [
    {
      period: "apr",
      label: "Apr 2026 (MTD)",
      compareLabel: "Mar 2026 (MTD)",
      revenue: 108.6, revenueTarget: 109.0,
      revenueSpark: [98, 101, 104, 103, 106, 105, 107, 108.6],
      gp: 35.2, gpTarget: 36.5,
      gpSpark: [31, 32, 33, 32.5, 34, 33.5, 35, 35.2],
      ebitda: 17.8, ebitdaTarget: 18.4,
      ebitdaSpark: [15.5, 16, 16.5, 16.2, 17, 16.8, 17.5, 17.8],
      forecastBase: 222, forecastTarget: 245,
      scorecard: {
        financial: { score: 79, trend: 2, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 85 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 83 },
          { name: "EBITDA Margin", weight: 0.20, value: 75 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 62 },
        ]},
        customer: { score: 81, trend: -1, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 88 },
          { name: "Renewal Rate", weight: 0.25, value: 83 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 68 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 75 },
        ]},
        operational: { score: 77, trend: -3, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 80 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 88 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 65 },
          { name: "Capacity Utilization", weight: 0.20, value: 72 },
        ]},
        technology: { score: 78, trend: 3, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 82 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 76 },
          { name: "Automation Coverage %", weight: 0.25, value: 80 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 74 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "up", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 62, base: 68, target: 72 },
        { q: "Q2", actual: 108.6, base: 112, target: 120 },
        { q: "Q3", actual: null, base: 160, target: 178 },
        { q: "Q4", actual: null, base: 205, target: 225 },
        { q: "FY", actual: null, base: 222, target: 245 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 58 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 30 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 55 },
        { name: "Operational Efficiency", status: "Delayed", progress: 25 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 45 },
      ],
      narrative: [
        "Revenue tracking just below interim target; GP margin holding near plan.",
        "Operational and execution risk indicators trending upward — monitor capacity.",
        "AI & Automation and Service Excellence initiatives progressing on schedule.",
      ],
      departments: [
        { name: "RM + Bank", value: 12.7, pct: 36 },
        { name: "Renew", value: 8.8, pct: 25 },
        { name: "Service & Formation", value: 9.5, pct: 27 },
        { name: "ATA", value: 4.2, pct: 12 },
      ],
      revenueForecast: 105.0,
      gpForecast: 34.0,
      ebitdaForecast: 17.5,
      operations: { serviceCenters: [], suppliers: [] },
      capital: { pl: [], cashFlow: [] },
      insights: []
    },
    {
      period: "may",
      label: "May 2026 (MTD)",
      compareLabel: "Apr 2026 (MTD)",
      revenue: 128.4, revenueTarget: 118.0,
      revenueSpark: [108.6, 112, 116, 121, 118, 124, 126, 128.4],
      gp: 42.6, gpTarget: 39.7,
      gpSpark: [35.2, 37, 38, 40, 38.5, 41, 41.5, 42.6],
      ebitda: 21.3, ebitdaTarget: 20.1,
      ebitdaSpark: [17.8, 18.5, 19, 20, 19.5, 20.5, 21, 21.3],
      forecastBase: 230, forecastTarget: 245,
      scorecard: {
        financial: { score: 85, trend: 6, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 90 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 88 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: -3, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: -5, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 4, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "up", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Medium", trend: "up", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 62, base: 70, target: 75 },
        { q: "Q2", actual: 128.4, base: 118, target: 125 },
        { q: "Q3", actual: null, base: 168, target: 180 },
        { q: "Q4", actual: null, base: 210, target: 228 },
        { q: "FY", actual: null, base: 230, target: 245 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 72 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 45 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 68 },
        { name: "Operational Efficiency", status: "Delayed", progress: 38 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 60 },
      ],
      narrative: [
        "Revenue is on track to achieve 94% of target with positive momentum in Q2.",
        "Operational capacity & execution risks need proactive attention.",
        "Strategic initiatives driving future growth remain overall on track.",
      ],
      departments: [
        { name: "RM + Bank", value: 15.3, pct: 36 },
        { name: "Renew", value: 10.6, pct: 25 },
        { name: "Service & Formation", value: 11.6, pct: 27 },
        { name: "ATA", value: 5.1, pct: 12 },
      ],
      revenueForecast: 120.0,
      gpForecast: 40.0,
      ebitdaForecast: 20.5,
      operations: { serviceCenters: [], suppliers: [] },
      capital: { pl: [], cashFlow: [] },
      insights: []
    },
    {
      period: "jun",
      label: "Jun 2026 (MTD)",
      compareLabel: "May 2026 (MTD)",
      revenue: 138.7, revenueTarget: 128.0,
      revenueSpark: [128.4, 130, 132, 135, 133, 136, 137, 138.7],
      gp: 45.9, gpTarget: 43.0,
      gpSpark: [42.6, 43, 43.8, 44.5, 44, 45, 45.5, 45.9],
      ebitda: 22.8, ebitdaTarget: 22.0,
      ebitdaSpark: [21.3, 21.6, 22, 22.2, 21.9, 22.4, 22.6, 22.8],
      forecastBase: 236, forecastTarget: 245,
      scorecard: {
        financial: { score: 87, trend: 2, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 92 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 90 },
          { name: "EBITDA Margin", weight: 0.20, value: 85 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 75 },
        ]},
        customer: { score: 80, trend: 2, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 86 },
          { name: "Renewal Rate", weight: 0.25, value: 82 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 70 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 76 },
        ]},
        operational: { score: 73, trend: 1, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 79 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 86 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 62 },
          { name: "Capacity Utilization", weight: 0.20, value: 70 },
        ]},
        technology: { score: 85, trend: 3, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 90 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 84 },
          { name: "Automation Coverage %", weight: 0.25, value: 88 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 80 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "down", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "High", trend: "up", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Medium", trend: "up", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 62, base: 70, target: 75 },
        { q: "Q2", actual: 138.7, base: 122, target: 128 },
        { q: "Q3", actual: null, base: 172, target: 182 },
        { q: "Q4", actual: null, base: 212, target: 230 },
        { q: "FY", actual: null, base: 236, target: 245 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 80 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 50 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 76 },
        { name: "Operational Efficiency", status: "Delayed", progress: 42 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 68 },
      ],
      narrative: [
        "Revenue and gross profit momentum continued, ~8% ahead of YTD target.",
        "Capacity Risk escalated to High — recommend taskforce review at OpEx Council.",
        "AI & Automation nearing 80% completion; Operational Efficiency remains delayed.",
      ],
      departments: [
        { name: "RM + Bank", value: 16.5, pct: 36 },
        { name: "Renew", value: 11.5, pct: 25 },
        { name: "Service & Formation", value: 12.4, pct: 27 },
        { name: "ATA", value: 5.5, pct: 12 },
      ],
      revenueForecast: 135.0,
      gpForecast: 44.5,
      ebitdaForecast: 22.2,
      operations: {
        serviceCenters: [
          { name: "Vietnam HQ", type: "HQ", cost: 2.5, actual: 2.8, target: 2.4 },
          { name: "Singapore", type: "Fulfillment", cost: 1.2, actual: 1.1, target: 1.3 },
          { name: "Hong Kong", type: "Fulfillment", cost: 1.5, actual: 1.7, target: 1.4 },
          { name: "Global Procurement", type: "Procurement", cost: 0.8, actual: 0.9, target: 0.85 },
        ],
        suppliers: [
          { name: "HSBC", category: "Bank", spend: 0.2, performance: 95 },
          { name: "DBS", category: "Bank", spend: 0.15, performance: 92 },
          { name: "Local Agent HK", category: "Agent", spend: 0.4, performance: 88 },
          { name: "Local Agent BVI", category: "Agent", spend: 0.3, performance: 85 },
        ]
      },
      capital: {
        pl: [
          { item: "Total Revenue", actual: 138.7, budget: 128.0, variance: 10.7 },
          { item: "Cost of Services", actual: 92.8, budget: 85.0, variance: -7.8 },
          { item: "Gross Profit", actual: 45.9, budget: 43.0, variance: 2.9 },
          { item: "Operating Expenses", actual: 23.1, budget: 21.0, variance: -2.1 },
          { item: "EBITDA", actual: 22.8, budget: 22.0, variance: 0.8 },
        ],
        cashFlow: [
          { category: "Operating Activities", inflow: 145.0, outflow: 118.0, net: 27.0 },
          { category: "Investing Activities", inflow: 2.0, outflow: 15.0, net: -13.0 },
          { category: "Financing Activities", inflow: 10.0, outflow: 5.0, net: 5.0 },
        ]
      },
      insights: [
        { signal: "KYC Delay Alert", description: "SLA for HK onboarding dropped by 15% due to bank requirement changes.", category: "Operational", confidence: 0.92, impact: "High" },
        { signal: "Margin Compression", description: "BVI Agent costs increased by 5%, impacting ATA segment net margin.", category: "Financial", confidence: 0.85, impact: "Medium" },
        { signal: "Retention Improvement", description: "Renewals for S&F HK segment up by 8% vs forecast.", category: "Financial", confidence: 0.88, impact: "High" },
      ]
    },
  ],

  stories: [
    { title: "Q2 Revenue Acceleration", sentiment: "Positive", summary: "Revenue growth improved due to stronger client acquisition and service expansion.", thread: "#revenue-council > Q2-growth-review", time: "2h ago" },
    { title: "ATA Capacity Pressure", sentiment: "Watch", summary: "Increased volume in ATA may impact SLA in coming weeks. Hiring plan under review.", thread: "#opex-council > capacity-planning", time: "5h ago" },
    { title: "AI Automation Impact", sentiment: "Positive", summary: "Automation initiatives delivered 120+ hours saved last month.", thread: "#tech-intelligence > ai-automation-update", time: "1d ago" },
    { title: "Compliance Change Impact", sentiment: "Action", summary: "New regulatory changes require process updates in CoSec.", thread: "#opex-council > compliance-update", time: "1d ago" },
    { title: "KYC Automation Pilot Live", sentiment: "Positive", summary: "First automated KYC/CDD pilot launched for the HK ATA onboarding flow.", thread: "#tech-intelligence > kyc-pilot", time: "2d ago" },
    { title: "Pipeline Aging Increasing", sentiment: "Watch", summary: "S&F segment shows rising pipeline aging; flagged for next Revenue Council review.", thread: "#revenue-council > pipeline-review", time: "3d ago" },
  ],

  councils: [
    {
      council: "Revenue & Growth Council",
      accountable: "Revenue + Gross Profit",
      items: [
        { name: "AI Adoption", status: "On Track", progress: 70 },
        { name: "Key Account Program", status: "On Track", progress: 55 },
        { name: "Revenue Forecast Transformation", status: "At Risk", progress: 40 },
        { name: "Cross-selling Framework", status: "On Track", progress: 62 },
        { name: "Market Expansion Program", status: "At Risk", progress: 45 },
        { name: "Client Success Framework", status: "On Track", progress: 50 },
      ],
    },
    {
      council: "Operational Excellence Council",
      accountable: "Quality + Compliance + Risk",
      items: [
        { name: "SLA & Turnaround Optimization", status: "On Track", progress: 65 },
        { name: "KYC / CDD Standardization & Automation", status: "On Track", progress: 58 },
        { name: "SOP Library Modernization", status: "Delayed", progress: 30 },
        { name: "Operational Risk & Quality Framework", status: "On Track", progress: 60 },
        { name: "Capacity & Workload Forecasting Model", status: "At Risk", progress: 35 },
        { name: "Compliance-by-Design Operating Standard", status: "On Track", progress: 48 },
      ],
    },
    {
      council: "Technology & Intelligence Council",
      accountable: "Tech + Data + AI Capability",
      items: [
        { name: "Salesforce Data Hygiene & CRM Optimization", status: "On Track", progress: 75 },
        { name: "AI Agent Deployment Program", status: "On Track", progress: 68 },
        { name: "Workflow Automation at Scale", status: "On Track", progress: 60 },
        { name: "Business Intelligence & Predictive Analytics Layer", status: "At Risk", progress: 42 },
        { name: "Integration & Data Architecture Modernization", status: "On Track", progress: 50 },
        { name: "Information Security & Data Protection Hardening", status: "On Track", progress: 55 },
      ],
    },
  ],

  structuralRisks: [
    { name: "Decision Rights Ambiguity", desc: "Unclear approval and escalation ownership across departments creates leadership bottlenecks.", framework: "RACI + RAPID®" },
    { name: "Siloed Operations", desc: "Cross-functional processes break at department boundaries; SLA and service quality lack a common standard.", framework: "Operating Model Canvas" },
    { name: "Fragmented Data", desc: "Salesforce, Client Portal, Accounting and HRMS remain disconnected — no single source of truth for the Board.", framework: "MIS / DIKW" },
    { name: "Key-Person Dependency", desc: "Knowledge concentrated in individuals limits scalability and slows onboarding.", framework: "Knowledge Platform" },
  ],

  reports: [
    { name: "Bi-weekly Executive Summary (VN)", updated: "2 days ago" },
    { name: "Monthly Gross Profit Report — RM / Renewal / S&F / ATA", updated: "5 days ago" },
    { name: "BOD Decision Matrix & RACI", updated: "1 week ago" },
    { name: "Council Charters — Revenue, OpEx, Tech & Intelligence", updated: "1 week ago" },
    { name: "Authority Flow & Delegation of Authority Matrix", updated: "2 weeks ago" },
    { name: "Technology Value Map & Roadmap", updated: "2 weeks ago" },
    { name: "MIS Architecture Brief", updated: "3 weeks ago" },
    { name: "Enterprise Operating Models — Full BOD Deck", updated: "3 weeks ago" },
  ],
};
