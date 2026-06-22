// ============================================================
// OneIBC BOD Dashboard — TypeScript Data Types
// ============================================================

export type Severity = "Low" | "Medium" | "High";
export type Trend = "up" | "down" | "flat";
export type StatusType = "On Track" | "At Risk" | "Delayed" | "Critical" | "Good";
export type SentimentType = "Positive" | "Watch" | "Action";
export type Period = "apr" | "may" | "jun" | string;

/** Single sub-KPI inside a scorecard pillar */
export interface ScorecardSubKPI {
  name: string;
  weight: number; // 0–1
  value: number;  // 0–100
}

/** A pillar (Financial, Customer, Operational, Technology) */
export interface ScorecardPillar {
  score: number;  // 0–100
  trend: number;  // positive = improved vs prev period
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
  period: string;          // e.g. "apr"
  label: string;           // e.g. "Apr 2026 (MTD)"
  compareLabel: string;    // e.g. "Mar 2026 (MTD)"

  // KPIs
  revenue: number;
  revenueTarget: number;
  revenueSpark: number[];

  gp: number;
  gpTarget: number;
  gpSpark: number[];

  ebitda: number;
  ebitdaTarget: number;
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
