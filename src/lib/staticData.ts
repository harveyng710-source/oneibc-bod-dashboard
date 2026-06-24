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
      period: "jan",
      label: "Jan 2026 (MTD)",
      compareLabel: "—",
      // Headline revenue & GP (actual + target) are REAL (GP workbook, M1).
      // revenueTarget is DERIVED = GP target ÷ 0.66 margin (no revenue target in source).
      // EBITDA has no source in the uploaded files → kept 0 (hidden) until OpEx provided.
      revenue: 0.6207, revenueTarget: 0.6118, revenueForecast: 0.6118,
      revenueSpark: [0.6207],
      gp: 0.3764, gpTarget: 0.4038, gpForecast: 0.4038,
      gpSpark: [0.3764],
      ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0,
      ebitdaSpark: [],
      forecastBase: 0.3764, forecastTarget: 7.7586,
      scorecard: {
        financial: { score: 89, trend: 0, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 101 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 93 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: 0, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: 0, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 0, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 0.6207, base: 1.7532, target: 1.7532 },
        { q: "Q2", actual: null, base: 1.911, target: 1.911 },
        { q: "Q3", actual: null, base: 1.9934, target: 1.9934 },
        { q: "Q4", actual: null, base: 2.101, target: 2.101 },
        { q: "FY", actual: null, base: 7.7586, target: 7.7586 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 60 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 40 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 58 },
        { name: "Operational Efficiency", status: "Delayed", progress: 35 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 50 },
      ],
      narrative: [
        "Doanh thu Jan 2026 đạt $0.6207M (101% so với mục tiêu $0.6118M suy ra từ GP target).",
        "GP thực tế $0.3764M / mục tiêu $0.4038M (93%).",
        "Lũy kế YTD: doanh thu $0.6207M · GP $0.3764M.",
      ],
      departments: [
        { name: "RM + Bank", value: 0.0525, pct: 8 },
        { name: "Service & Formation", value: 0.0456, pct: 7 },
        { name: "Renew", value: 0.4139, pct: 67 },
        { name: "ATA", value: 0.1088, pct: 18 },
      ],
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 59, utilization: 84, attrition: 12, costPerHead: 82,
          teams: [
            { team: "RM + Bank",  type: "revenue", headcount: 19, utilization: 82, attrition: 12, costPerHead: 95, totalCost: 1.81, revenueContribution: 0.3338, evm: { bac: 5.0, pv: 2.5, ev: 2.6,  ac: 2.4  } },
            { team: "S&F",        type: "revenue", headcount: 6,  utilization: 88, attrition: 15, costPerHead: 80, totalCost: 0.48, revenueContribution: 0.2696, evm: { bac: 5.5, pv: 2.8, ev: 2.6,  ac: 2.9  } },
            { team: "Renew",      type: "revenue", headcount: 4,  utilization: 79, attrition: 10, costPerHead: 78, totalCost: 0.31, revenueContribution: 1.0493, evm: { bac: 3.0, pv: 1.5, ev: 1.55, ac: 1.45 } },
            { team: "ATA",        type: "revenue", headcount: 9,  utilization: 84, attrition: 18, costPerHead: 70, totalCost: 0.63, revenueContribution: 0.4542, evm: { bac: 2.2, pv: 1.1, ev: 1.0,  ac: 1.2  } },
            { team: "Marketing",  type: "support", headcount: 8,  utilization: 75, attrition: 9,  costPerHead: 85, totalCost: 0.68, revenueContribution: 0,      evm: { bac: 1.8, pv: 0.9, ev: 0.95, ac: 0.88 } },
            { team: "Ops",        type: "support", headcount: 13, utilization: 90, attrition: 11, costPerHead: 72, totalCost: 0.94, revenueContribution: 0,      evm: { bac: 2.4, pv: 1.2, ev: 1.18, ac: 1.25 } },
          ],
        },
      },
      capital: {
        pl: [
          { item: "Revenue",      actual: 0.6207, budget: 0.6118, variance: 0.0089 },
          { item: "Gross Profit", actual: 0.3764,  budget: 0.4038,  variance: -0.0274 },
        ],
        cashFlow: [],
      },
      insights: [],
    },
    {
      period: "feb",
      label: "Feb 2026 (MTD)",
      compareLabel: "Jan 2026 (MTD)",
      // Headline revenue & GP (actual + target) are REAL (GP workbook, M2).
      // revenueTarget is DERIVED = GP target ÷ 0.66 margin (no revenue target in source).
      // EBITDA has no source in the uploaded files → kept 0 (hidden) until OpEx provided.
      revenue: 0.3823, revenueTarget: 0.6126, revenueForecast: 0.6126,
      revenueSpark: [0.6207, 0.3823],
      gp: 0.2656, gpTarget: 0.4043, gpForecast: 0.4043,
      gpSpark: [0.3764, 0.2656],
      ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0,
      ebitdaSpark: [],
      forecastBase: 0.642, forecastTarget: 7.7586,
      scorecard: {
        financial: { score: 67, trend: 0, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 62 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 66 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: 0, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: 0, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 0, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 1.003, base: 1.7532, target: 1.7532 },
        { q: "Q2", actual: null, base: 1.911, target: 1.911 },
        { q: "Q3", actual: null, base: 1.9934, target: 1.9934 },
        { q: "Q4", actual: null, base: 2.101, target: 2.101 },
        { q: "FY", actual: null, base: 7.7586, target: 7.7586 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 60 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 40 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 58 },
        { name: "Operational Efficiency", status: "Delayed", progress: 35 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 50 },
      ],
      narrative: [
        "Doanh thu Feb 2026 đạt $0.3823M (62% so với mục tiêu $0.6126M suy ra từ GP target).",
        "GP thực tế $0.2656M / mục tiêu $0.4043M (66%).",
        "Lũy kế YTD: doanh thu $1.003M · GP $0.642M.",
      ],
      departments: [
        { name: "RM + Bank", value: 0.0846, pct: 22 },
        { name: "Service & Formation", value: 0.0945, pct: 25 },
        { name: "Renew", value: 0.1398, pct: 37 },
        { name: "ATA", value: 0.0633, pct: 17 },
      ],
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 59, utilization: 84, attrition: 12, costPerHead: 82,
          teams: [
            { team: "RM + Bank",  type: "revenue", headcount: 19, utilization: 82, attrition: 12, costPerHead: 95, totalCost: 1.81, revenueContribution: 0.3338, evm: { bac: 5.0, pv: 2.5, ev: 2.6,  ac: 2.4  } },
            { team: "S&F",        type: "revenue", headcount: 6,  utilization: 88, attrition: 15, costPerHead: 80, totalCost: 0.48, revenueContribution: 0.2696, evm: { bac: 5.5, pv: 2.8, ev: 2.6,  ac: 2.9  } },
            { team: "Renew",      type: "revenue", headcount: 4,  utilization: 79, attrition: 10, costPerHead: 78, totalCost: 0.31, revenueContribution: 1.0493, evm: { bac: 3.0, pv: 1.5, ev: 1.55, ac: 1.45 } },
            { team: "ATA",        type: "revenue", headcount: 9,  utilization: 84, attrition: 18, costPerHead: 70, totalCost: 0.63, revenueContribution: 0.4542, evm: { bac: 2.2, pv: 1.1, ev: 1.0,  ac: 1.2  } },
            { team: "Marketing",  type: "support", headcount: 8,  utilization: 75, attrition: 9,  costPerHead: 85, totalCost: 0.68, revenueContribution: 0,      evm: { bac: 1.8, pv: 0.9, ev: 0.95, ac: 0.88 } },
            { team: "Ops",        type: "support", headcount: 13, utilization: 90, attrition: 11, costPerHead: 72, totalCost: 0.94, revenueContribution: 0,      evm: { bac: 2.4, pv: 1.2, ev: 1.18, ac: 1.25 } },
          ],
        },
      },
      capital: {
        pl: [
          { item: "Revenue",      actual: 0.3823, budget: 0.6126, variance: -0.2303 },
          { item: "Gross Profit", actual: 0.2656,  budget: 0.4043,  variance: -0.1387 },
        ],
        cashFlow: [],
      },
      insights: [],
    },
    {
      period: "mar",
      label: "Mar 2026 (MTD)",
      compareLabel: "Feb 2026 (MTD)",
      // Headline revenue & GP (actual + target) are REAL (GP workbook, M3).
      // revenueTarget is DERIVED = GP target ÷ 0.66 margin (no revenue target in source).
      // EBITDA has no source in the uploaded files → kept 0 (hidden) until OpEx provided.
      revenue: 0.4495, revenueTarget: 0.5289, revenueForecast: 0.5289,
      revenueSpark: [0.6207, 0.3823, 0.4495],
      gp: 0.3084, gpTarget: 0.3491, gpForecast: 0.3491,
      gpSpark: [0.3764, 0.2656, 0.3084],
      ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0,
      ebitdaSpark: [],
      forecastBase: 0.9504, forecastTarget: 7.7586,
      scorecard: {
        financial: { score: 82, trend: 0, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 85 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 88 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: 0, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: 0, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 0, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 1.4525, base: 1.7532, target: 1.7532 },
        { q: "Q2", actual: null, base: 1.911, target: 1.911 },
        { q: "Q3", actual: null, base: 1.9934, target: 1.9934 },
        { q: "Q4", actual: null, base: 2.101, target: 2.101 },
        { q: "FY", actual: null, base: 7.7586, target: 7.7586 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 60 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 40 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 58 },
        { name: "Operational Efficiency", status: "Delayed", progress: 35 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 50 },
      ],
      narrative: [
        "Doanh thu Mar 2026 đạt $0.4495M (85% so với mục tiêu $0.5289M suy ra từ GP target).",
        "GP thực tế $0.3084M / mục tiêu $0.3491M (88%).",
        "Lũy kế YTD: doanh thu $1.4525M · GP $0.9504M.",
      ],
      departments: [
        { name: "RM + Bank", value: 0.0833, pct: 19 },
        { name: "Service & Formation", value: 0.0597, pct: 13 },
        { name: "Renew", value: 0.1717, pct: 38 },
        { name: "ATA", value: 0.1349, pct: 30 },
      ],
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 59, utilization: 84, attrition: 12, costPerHead: 82,
          teams: [
            { team: "RM + Bank",  type: "revenue", headcount: 19, utilization: 82, attrition: 12, costPerHead: 95, totalCost: 1.81, revenueContribution: 0.3338, evm: { bac: 5.0, pv: 2.5, ev: 2.6,  ac: 2.4  } },
            { team: "S&F",        type: "revenue", headcount: 6,  utilization: 88, attrition: 15, costPerHead: 80, totalCost: 0.48, revenueContribution: 0.2696, evm: { bac: 5.5, pv: 2.8, ev: 2.6,  ac: 2.9  } },
            { team: "Renew",      type: "revenue", headcount: 4,  utilization: 79, attrition: 10, costPerHead: 78, totalCost: 0.31, revenueContribution: 1.0493, evm: { bac: 3.0, pv: 1.5, ev: 1.55, ac: 1.45 } },
            { team: "ATA",        type: "revenue", headcount: 9,  utilization: 84, attrition: 18, costPerHead: 70, totalCost: 0.63, revenueContribution: 0.4542, evm: { bac: 2.2, pv: 1.1, ev: 1.0,  ac: 1.2  } },
            { team: "Marketing",  type: "support", headcount: 8,  utilization: 75, attrition: 9,  costPerHead: 85, totalCost: 0.68, revenueContribution: 0,      evm: { bac: 1.8, pv: 0.9, ev: 0.95, ac: 0.88 } },
            { team: "Ops",        type: "support", headcount: 13, utilization: 90, attrition: 11, costPerHead: 72, totalCost: 0.94, revenueContribution: 0,      evm: { bac: 2.4, pv: 1.2, ev: 1.18, ac: 1.25 } },
          ],
        },
      },
      capital: {
        pl: [
          { item: "Revenue",      actual: 0.4495, budget: 0.5289, variance: -0.0794 },
          { item: "Gross Profit", actual: 0.3084,  budget: 0.3491,  variance: -0.0407 },
        ],
        cashFlow: [],
      },
      insights: [],
    },
    {
      period: "apr",
      label: "Apr 2026 (MTD)",
      compareLabel: "Mar 2026 (MTD)",
      // Headline revenue & GP (actual + target) are REAL (GP workbook, M4).
      // revenueTarget is DERIVED = GP target ÷ 0.66 margin (no revenue target in source).
      // EBITDA has no source in the uploaded files → kept 0 (hidden) until OpEx provided.
      revenue: 0.2423, revenueTarget: 0.5671, revenueForecast: 0.5671,
      revenueSpark: [0.6207, 0.3823, 0.4495, 0.2423],
      gp: 0.167, gpTarget: 0.3743, gpForecast: 0.3743,
      gpSpark: [0.3764, 0.2656, 0.3084, 0.167],
      ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0,
      ebitdaSpark: [],
      forecastBase: 1.1174, forecastTarget: 7.7586,
      scorecard: {
        financial: { score: 54, trend: 0, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 43 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 45 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: 0, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: 0, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 0, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 1.4525, base: 1.7532, target: 1.7532 },
        { q: "Q2", actual: 0.2423, base: 1.911, target: 1.911 },
        { q: "Q3", actual: null, base: 1.9934, target: 1.9934 },
        { q: "Q4", actual: null, base: 2.101, target: 2.101 },
        { q: "FY", actual: null, base: 7.7586, target: 7.7586 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 60 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 40 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 58 },
        { name: "Operational Efficiency", status: "Delayed", progress: 35 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 50 },
      ],
      narrative: [
        "Doanh thu Apr 2026 đạt $0.2423M (43% so với mục tiêu $0.5671M suy ra từ GP target).",
        "GP thực tế $0.167M / mục tiêu $0.3743M (45%).",
        "Lũy kế YTD: doanh thu $1.6948M · GP $1.1174M.",
      ],
      departments: [
        { name: "RM + Bank", value: 0.0596, pct: 25 },
        { name: "Service & Formation", value: 0.0302, pct: 12 },
        { name: "Renew", value: 0.0897, pct: 37 },
        { name: "ATA", value: 0.0627, pct: 26 },
      ],
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 59, utilization: 84, attrition: 12, costPerHead: 82,
          teams: [
            { team: "RM + Bank",  type: "revenue", headcount: 19, utilization: 82, attrition: 12, costPerHead: 95, totalCost: 1.81, revenueContribution: 0.3338, evm: { bac: 5.0, pv: 2.5, ev: 2.6,  ac: 2.4  } },
            { team: "S&F",        type: "revenue", headcount: 6,  utilization: 88, attrition: 15, costPerHead: 80, totalCost: 0.48, revenueContribution: 0.2696, evm: { bac: 5.5, pv: 2.8, ev: 2.6,  ac: 2.9  } },
            { team: "Renew",      type: "revenue", headcount: 4,  utilization: 79, attrition: 10, costPerHead: 78, totalCost: 0.31, revenueContribution: 1.0493, evm: { bac: 3.0, pv: 1.5, ev: 1.55, ac: 1.45 } },
            { team: "ATA",        type: "revenue", headcount: 9,  utilization: 84, attrition: 18, costPerHead: 70, totalCost: 0.63, revenueContribution: 0.4542, evm: { bac: 2.2, pv: 1.1, ev: 1.0,  ac: 1.2  } },
            { team: "Marketing",  type: "support", headcount: 8,  utilization: 75, attrition: 9,  costPerHead: 85, totalCost: 0.68, revenueContribution: 0,      evm: { bac: 1.8, pv: 0.9, ev: 0.95, ac: 0.88 } },
            { team: "Ops",        type: "support", headcount: 13, utilization: 90, attrition: 11, costPerHead: 72, totalCost: 0.94, revenueContribution: 0,      evm: { bac: 2.4, pv: 1.2, ev: 1.18, ac: 1.25 } },
          ],
        },
      },
      capital: {
        pl: [
          { item: "Revenue",      actual: 0.2423, budget: 0.5671, variance: -0.3248 },
          { item: "Gross Profit", actual: 0.167,  budget: 0.3743,  variance: -0.2073 },
        ],
        cashFlow: [],
      },
      insights: [],
    },
    {
      period: "may",
      label: "May 2026 (MTD)",
      compareLabel: "Apr 2026 (MTD)",
      // Headline revenue & GP (actual + target) are REAL (GP workbook, M5).
      // revenueTarget is DERIVED = GP target ÷ 0.66 margin (no revenue target in source).
      // EBITDA has no source in the uploaded files → kept 0 (hidden) until OpEx provided.
      revenue: 0.4121, revenueTarget: 0.7215, revenueForecast: 0.7215,
      revenueSpark: [0.6207, 0.3823, 0.4495, 0.2423, 0.4121],
      gp: 0.2731, gpTarget: 0.4762, gpForecast: 0.4762,
      gpSpark: [0.3764, 0.2656, 0.3084, 0.167, 0.2731],
      ebitda: 0, ebitdaTarget: 0, ebitdaForecast: 0,
      ebitdaSpark: [],
      forecastBase: 1.3905, forecastTarget: 7.7586,
      scorecard: {
        financial: { score: 63, trend: 0, subs: [
          { name: "Revenue Achievement %", weight: 0.35, value: 57 },
          { name: "Gross Profit Achievement %", weight: 0.30, value: 57 },
          { name: "EBITDA Margin", weight: 0.20, value: 80 },
          { name: "Forecast Accuracy %", weight: 0.15, value: 65 },
        ]},
        customer: { score: 78, trend: 0, subs: [
          { name: "Client Retention Rate", weight: 0.30, value: 85 },
          { name: "Renewal Rate", weight: 0.25, value: 80 },
          { name: "Cross-sell Revenue", weight: 0.20, value: 65 },
          { name: "Pipeline Coverage Ratio", weight: 0.25, value: 72 },
        ]},
        operational: { score: 72, trend: 0, subs: [
          { name: "SLA Compliance %", weight: 0.30, value: 78 },
          { name: "KYC / CDD Completion %", weight: 0.25, value: 85 },
          { name: "Quality Score (Error/Rework)", weight: 0.25, value: 60 },
          { name: "Capacity Utilization", weight: 0.20, value: 68 },
        ]},
        technology: { score: 82, trend: 0, subs: [
          { name: "AI / Tool Adoption Rate", weight: 0.30, value: 88 },
          { name: "Salesforce Data Hygiene Score", weight: 0.25, value: 80 },
          { name: "Automation Coverage %", weight: 0.25, value: 85 },
          { name: "System Uptime / Reliability", weight: 0.20, value: 78 },
        ]},
      },
      risks: [
        { area: "Revenue Risk", desc: "Market demand, pricing", sev: "Medium", trend: "flat", owner: "Revenue & Growth Council" },
        { area: "Capacity Risk", desc: "People, workload", sev: "Medium", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Compliance Risk", desc: "Regulatory, legal", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Execution Risk", desc: "Delivery, process", sev: "Low", trend: "flat", owner: "Operational Excellence Council" },
        { area: "Financial Risk", desc: "Liquidity, cost", sev: "Low", trend: "flat", owner: "ExCo / Finance" },
      ],
      chart: [
        { q: "Q1", actual: 1.4525, base: 1.7532, target: 1.7532 },
        { q: "Q2", actual: 0.6544, base: 1.911, target: 1.911 },
        { q: "Q3", actual: null, base: 1.9934, target: 1.9934 },
        { q: "Q4", actual: null, base: 2.101, target: 2.101 },
        { q: "FY", actual: null, base: 7.7586, target: 7.7586 },
      ],
      initiatives: [
        { name: "AI & Automation Program", status: "On Track", progress: 60 },
        { name: "Market Expansion (SEA)", status: "At Risk", progress: 40 },
        { name: "Service Excellence 2.0", status: "On Track", progress: 58 },
        { name: "Operational Efficiency", status: "Delayed", progress: 35 },
        { name: "Data & Analytics Platform", status: "On Track", progress: 50 },
      ],
      narrative: [
        "Doanh thu May 2026 đạt $0.4121M (57% so với mục tiêu $0.7215M suy ra từ GP target).",
        "GP thực tế $0.2731M / mục tiêu $0.4762M (57%).",
        "Lũy kế YTD: doanh thu $2.1069M · GP $1.3905M.",
      ],
      departments: [
        { name: "RM + Bank", value: 0.0537, pct: 13 },
        { name: "Service & Formation", value: 0.0396, pct: 10 },
        { name: "Renew", value: 0.2343, pct: 57 },
        { name: "ATA", value: 0.0845, pct: 21 },
      ],
      operations: {
        serviceCenters: [], suppliers: [],
        workforce: {
          headcount: 59, utilization: 84, attrition: 12, costPerHead: 82,
          teams: [
            { team: "RM + Bank",  type: "revenue", headcount: 19, utilization: 82, attrition: 12, costPerHead: 95, totalCost: 1.81, revenueContribution: 0.3338, evm: { bac: 5.0, pv: 2.5, ev: 2.6,  ac: 2.4  } },
            { team: "S&F",        type: "revenue", headcount: 6,  utilization: 88, attrition: 15, costPerHead: 80, totalCost: 0.48, revenueContribution: 0.2696, evm: { bac: 5.5, pv: 2.8, ev: 2.6,  ac: 2.9  } },
            { team: "Renew",      type: "revenue", headcount: 4,  utilization: 79, attrition: 10, costPerHead: 78, totalCost: 0.31, revenueContribution: 1.0493, evm: { bac: 3.0, pv: 1.5, ev: 1.55, ac: 1.45 } },
            { team: "ATA",        type: "revenue", headcount: 9,  utilization: 84, attrition: 18, costPerHead: 70, totalCost: 0.63, revenueContribution: 0.4542, evm: { bac: 2.2, pv: 1.1, ev: 1.0,  ac: 1.2  } },
            { team: "Marketing",  type: "support", headcount: 8,  utilization: 75, attrition: 9,  costPerHead: 85, totalCost: 0.68, revenueContribution: 0,      evm: { bac: 1.8, pv: 0.9, ev: 0.95, ac: 0.88 } },
            { team: "Ops",        type: "support", headcount: 13, utilization: 90, attrition: 11, costPerHead: 72, totalCost: 0.94, revenueContribution: 0,      evm: { bac: 2.4, pv: 1.2, ev: 1.18, ac: 1.25 } },
          ],
        },
      },
      capital: {
        pl: [
          { item: "Revenue",      actual: 0.4121, budget: 0.7215, variance: -0.3094 },
          { item: "Gross Profit", actual: 0.2731,  budget: 0.4762,  variance: -0.2031 },
        ],
        cashFlow: [],
      },
      insights: [],
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

  // ── FP&A model (from OneIBC GP Forecast Masterworkbook v3.1, values in $M) ──
  fpa: {
    q2TargetGP: 1.7978,
    teams: [
      {
        team: "RM + Bank", type: "revenue", q2Target: 0.2262, posteriorRate: 0.53005,
        bayesianForecast: 0.1199, pipelineForecast: 0.1280, confidence: "High",
        monthly: [
          { month: "M1", gpTarget: 0.0992, gpActual: 0.0358, revenue: 0.0525 },
          { month: "M2", gpTarget: 0.0992, gpActual: 0.0564, revenue: 0.0846 },
          { month: "M3", gpTarget: 0.0992, gpActual: 0.0560, revenue: 0.0833 },
          { month: "M4", gpTarget: 0.0754, gpActual: 0.0362, revenue: 0.0596 },
          { month: "M5", gpTarget: 0.0754, gpActual: 0.0362, revenue: 0.0537 },
          { month: "M6", gpTarget: 0.0754, gpActual: null, revenue: null },
        ],
      },
      {
        team: "S&F", type: "revenue", q2Target: 0.4652, posteriorRate: 0.53065,
        bayesianForecast: 0.2468, pipelineForecast: 0.2350, confidence: "Medium",
        monthly: [
          { month: "M1", gpTarget: 0.0665, gpActual: 0.0326, revenue: 0.0456 },
          { month: "M2", gpTarget: 0.0665, gpActual: 0.0674, revenue: 0.0945 },
          { month: "M3", gpTarget: 0.0665, gpActual: 0.0392, revenue: 0.0597 },
          { month: "M4", gpTarget: 0.0665, gpActual: 0.0234, revenue: 0.0302 },
          { month: "M5", gpTarget: 0.1045, gpActual: 0.0287, revenue: 0.0396 },
          { month: "M6", gpTarget: 0.0950, gpActual: null, revenue: null },
        ],
      },
      {
        team: "Renew", type: "revenue", q2Target: 0.7101, posteriorRate: 0.694,
        bayesianForecast: 0.4928, pipelineForecast: 0.5100, confidence: "Medium",
        monthly: [
          { month: "M1", gpTarget: 0.1759, gpActual: 0.2344, revenue: 0.4139 },
          { month: "M2", gpTarget: 0.1791, gpActual: 0.0925, revenue: 0.1398 },
          { month: "M3", gpTarget: 0.0973, gpActual: 0.1118, revenue: 0.1717 },
          { month: "M4", gpTarget: 0.1433, gpActual: 0.0629, revenue: 0.0897 },
          { month: "M5", gpTarget: 0.2064, gpActual: 0.1392, revenue: 0.2343 },
          { month: "M6", gpTarget: 0.1524, gpActual: null, revenue: null },
        ],
      },
      {
        team: "ATA", type: "revenue", q2Target: 0.3963, posteriorRate: 0.6971,
        bayesianForecast: 0.2762, pipelineForecast: 0.2680, confidence: "Medium",
        monthly: [
          { month: "M1", gpTarget: 0.0622, gpActual: 0.0736, revenue: 0.1088 },
          { month: "M2", gpTarget: 0.0594, gpActual: 0.0493, revenue: 0.0633 },
          { month: "M3", gpTarget: 0.0860, gpActual: 0.1015, revenue: 0.1349 },
          { month: "M4", gpTarget: 0.0891, gpActual: 0.0446, revenue: 0.0627 },
          { month: "M5", gpTarget: 0.0898, gpActual: 0.0690, revenue: 0.0845 },
          { month: "M6", gpTarget: 0.0879, gpActual: null, revenue: null },
        ],
      },
    ],
    scenarios: [
      { name: "P20 · Conservative", prob: 0.20, gpForecast: 0.670, achievement: 0.5312, revenueEst: 0.9955 },
      { name: "P50 · Base Case",    prob: 0.50, gpForecast: 0.740, achievement: 0.5867, revenueEst: 1.0996 },
      { name: "P80 · Stretch",      prob: 0.20, gpForecast: 0.850, achievement: 0.6739, revenueEst: 1.2630 },
    ],
    ci: { p80Low: 0.629, p80High: 0.851, p95Low: 0.555, p95High: 0.925 },
  },
};
