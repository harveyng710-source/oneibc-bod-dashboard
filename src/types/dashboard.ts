// ============================================================
// OneIBC BOD Dashboard — TypeScript Data Types
// ============================================================

export type Severity = "Low" | "Medium" | "High";
export type Trend = "up" | "down" | "flat";
export type StatusType = "On Track" | "At Risk" | "Delayed" | "Critical" | "Good";
export type SentimentType = "Positive" | "Watch" | "Action";
export type ComparisonMode = "budget" | "forecast";
export type Period = "apr" | "may" | "jun" | string;

/** Single sub-KPI inside a scorecard pillar */
export interface ScorecardSubKPI {
  name: string;
  weight: number; 
  value: number;  
}

/** A pillar (Financial, Customer, Operational, Technology) */
export interface ScorecardPillar {
  score: number;  
  trend: number;  
  subs: ScorecardSubKPI[];
}

/** Complete scorecard for one period */
export interface Scorecard {
  financial: ScorecardPillar;
  customer: ScorecardPillar;
  operational: ScorecardPillar;
  technology: ScorecardPillar;
}

/** Enterprise risk entry */
export interface Risk {
  area: string;
  desc: string;
  sev: Severity;
  trend: Trend;
  owner: string;
}

/** Quarterly chart data point */
export interface ChartPoint {
  q: string;          // "Q1", "Q2", "Q3", "Q4", "FY"
  actual: number | null;
  base: number;
  target: number;
}

/**
 * Earned Value Management raw inputs (all in $M unless noted).
 * Derived metrics (SV, CV, SPI, CPI, EAC, ETC, VAC, % complete) are
 * computed from these by `computeEVM()` in lib/evm.ts — never stored,
 * so the dashboard always shows internally-consistent numbers.
 */
export interface EVMInput {
  bac: number; // Budget At Completion — total approved budget
  pv: number;  // Planned Value (BCWS) — budgeted cost of work scheduled to date
  ev: number;  // Earned Value (BCWP) — budgeted cost of work actually performed
  ac: number;  // Actual Cost (ACWP) — real cost incurred to date
}

/** Strategic initiative */
export interface Initiative {
  name: string;
  status: StatusType;
  progress: number; // 0–100
  /** Optional initiative-level EVM (Phase 1 EVM tier 2) */
  evm?: EVMInput;
}

/** Department GP breakdown */
export interface Department {
  name: string;
  value: number; // in $M
  pct: number;   // percentage of total
}

/** Revenue-generating vs support team (drives EVM interpretation). */
export type TeamType = "revenue" | "support";

/**
 * Per-team workforce + cost + EVM block.
 * Teams: RM + Bank, S&F, Renew, ATA, Marketing, Ops, …
 */
export interface TeamWorkforce {
  team: string;
  type: TeamType;             // revenue (EVM keyed to revenue KPI) vs support (standard EVM)
  headcount: number;
  utilization: number;        // % capacity utilised
  attrition: number;          // % annualised
  costPerHead: number;        // $K / head / period
  totalCost: number;          // $M total people cost this period
  revenueContribution: number; // $M revenue/GP attributed to the team
  evm: EVMInput;              // team-level EVM (Phase 1 EVM tier 1)
}

/** One month of a team's GP/revenue actuals & target (from the FP&A workbook). */
export interface TeamMonthly {
  month: string;            // "M1".."M6"
  gpTarget: number;         // $M
  gpActual: number | null;  // $M (null = not yet closed)
  revenue: number | null;   // $M
}

/** Per-team forecast combining the Bayesian (workbook) and Salesforce pipeline models. */
export interface TeamForecast {
  team: string;
  type: TeamType;
  q2Target: number;          // $M GP target for the quarter
  posteriorRate: number;     // Bayesian posterior achievement rate (0..1)
  bayesianForecast: number;  // $M = posteriorRate × q2Target (workbook model)
  pipelineForecast: number;  // $M = Σ(median quote × stage %) — Salesforce export model
  confidence: "High" | "Medium" | "Low";
  monthly: TeamMonthly[];
}

/** Probabilistic scenario row (P20 / P50 / P80). */
export interface ScenarioRow {
  name: string;
  prob: number;        // 0..1
  gpForecast: number;  // $M
  achievement: number; // 0..1
  revenueEst: number;  // $M
}

/** Workbook-derived FP&A analytics shared across the dashboard. */
export interface FpaModel {
  q2TargetGP: number;        // $M
  teams: TeamForecast[];
  scenarios: ScenarioRow[];
  ci: { p80Low: number; p80High: number; p95Low: number; p95High: number }; // $M GP
}

/** Data snapshot for one reporting period */
export interface PeriodData {
  period: string;          
  label: string;           
  compareLabel: string;    

  // KPIs (Actuals)
  revenue: number;
  revenueTarget: number; // Default (Budget)
  revenueForecast: number; // For Forecast comparison
  revenueSpark: number[];

  gp: number;
  gpTarget: number;
  gpForecast: number;
  gpSpark: number[];

  ebitda: number;
  ebitdaTarget: number;
  ebitdaForecast: number;
  ebitdaSpark: number[];

  forecastBase: number;
  forecastTarget: number;

  // Sections
  scorecard: Scorecard;
  risks: Risk[];
  chart: ChartPoint[];
  initiatives: Initiative[];
  narrative: string[];
  departments: Department[];

  // --- NEW FP&A EXTENSIONS ---
  operations?: {
    serviceCenters: { name: string; type: "HQ" | "Fulfillment" | "Procurement"; cost: number; actual: number; target: number }[];
    suppliers: { name: string; category: "Bank" | "Agent"; spend: number; performance: number }[];
    workforce?: {
      // Company-wide aggregates (kept for backward-compatible summary cards)
      headcount: number;
      utilization: number;
      attrition: number;
      costPerHead: number;
      // Per-team breakdown (RM + Bank, S&F, Renew, ATA, Marketing, Ops, …)
      teams?: TeamWorkforce[];
    };
  };
  capital?: {
    pl: { item: string; actual: number; budget: number; variance: number }[];
    cashFlow: { category: string; inflow: number; outflow: number; net: number }[];
    /** Supplier/bank payables tracking with deadlines. */
    payables?: { supplier: string; category: string; amount: number; due: string; status: "Paid" | "Pending" | "Overdue" }[];
  };
  insights?: {
    signal: string;
    description: string;
    category: "Risk" | "Operational" | "Financial";
    confidence: number; // 0-1
    impact: "High" | "Medium" | "Low";
  }[];
}

/** Management Story */
export interface Story {
  title: string;
  sentiment: SentimentType;
  summary: string;
  thread: string;
  time: string;
}

/** Council initiative item */
export interface CouncilItem {
  name: string;
  status: StatusType;
  progress: number;
}

/** Council with its items */
export interface Council {
  council: string;
  accountable: string;
  items: CouncilItem[];
}

/** Structural governance risk */
export interface StructuralRisk {
  name: string;
  desc: string;
  framework: string;
}

/** Report library item */
export interface Report {
  name: string;
  updated: string;
}

/** Complete dashboard payload (returned by API or data loader) */
export interface DashboardData {
  periods: PeriodData[];
  stories: Story[];
  councils: Council[];
  structuralRisks: StructuralRisk[];
  reports: Report[];
  /** Workbook-derived FP&A analytics (forecasts, scenarios, per-team monthly). */
  fpa?: FpaModel;
  lastRefreshed?: string;
  source?: "csv" | "google_sheets" | "static";
}

/** Data source configuration */
export interface DataSourceConfig {
  type: "csv" | "google_sheets" | "static";
  /** For CSV: path to local file relative to /public, or URL */
  csvUrl?: string;
  /** For Google Sheets: the spreadsheet ID */
  sheetId?: string;
  /** The name/gid of the tab to read (default: Sheet1) */
  sheetTab?: string;
}
