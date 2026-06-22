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

/** Strategic initiative */
export interface Initiative {
  name: string;
  status: StatusType;
  progress: number; // 0–100
}

/** Department GP breakdown */
export interface Department {
  name: string;
  value: number; // in $M
  pct: number;   // percentage of total
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
      headcount: number;
      utilization: number;
      attrition: number;
      costPerHead: number;
    };
  };
  capital?: {
    pl: { item: string; actual: number; budget: number; variance: number }[];
    cashFlow: { category: string; inflow: number; outflow: number; net: number }[];
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
