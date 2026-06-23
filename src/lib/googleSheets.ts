/**
 * googleSheets.ts
 * ────────────────
 * Reads data from a Google Sheets spreadsheet.
 *
 * Two **layouts** are supported transparently:
 *
 *   A) Multi-tab workbook (preferred, staff-friendly): one tab per data
 *      `section` (e.g. "01 · KPI tài chính" → kpi). Each tab holds only that
 *      section's columns, a guide/help row, and example data. The `section`
 *      value is inferred from the tab title via TAB_SECTION below, so staff
 *      never type it. See docs/google-sheet-template.md.
 *
 *   B) Single flat tab: the legacy schema with a `section` column per row.
 *
 * And two **transports**:
 *
 *   1. Public CSV / gviz (zero-config): the sheet is shared "Anyone with the
 *      link" (or published). Multi-tab uses the gviz endpoint to read a tab by
 *      name; single-tab uses the CSV export of gid 0.
 *
 *   2. Google Sheets API v4 (service account): set GOOGLE_SERVICE_ACCOUNT_KEY
 *      with the JSON content, plus GOOGLE_SHEET_ID. Multi-tab uses a single
 *      batchGet across all recognised tabs.
 *
 * The loader auto-detects multi-tab and falls back to single-tab.
 */

import Papa from "papaparse";
import { parseCsvString, parseRows, type RawRow } from "./csvParser";
import type { DashboardData } from "@/types/dashboard";

// ── Tab title → section mapping ──────────────────────────────────────────────
// Keys must match the workbook tab titles exactly. A tab whose title (lowercased,
// spaces→underscore) already equals a known section also works, so power users
// can name tabs directly by section key.
const TAB_SECTION: Record<string, string> = {
  "01 · KPI tài chính": "kpi",
  "02 · Dự báo doanh thu": "revenue_targets",
  "03 · Scorecard": "scorecard",
  "04 · Biểu đồ quý": "chart",
  "05 · Phòng ban": "department",
  "06 · Trung tâm vận hành": "operations_center",
  "07 · Đối tác cung ứng": "supply_partner",
  "08 · Nhân sự theo team": "team_workforce",
  "09 · P&L vốn": "capital_pl",
  "10 · Dòng tiền": "capital_cf",
  "11 · Rủi ro": "risk",
  "12 · Sáng kiến": "initiative",
  "13 · Insight signals": "insight_signal",
  "14 · Narrative": "narrative",
  "15 · Stories": "story",
  "16 · Báo cáo": "report",
  "17 · FP&A theo tháng": "fpa_monthly",
  "18 · FP&A dự báo": "fpa_forecast",
  "19 · FP&A kịch bản": "fpa_scenario",
  "20 · FP&A CI": "fpa_ci",
  "21 · Công nợ phải trả": "payable",
};

const KNOWN_SECTIONS = new Set(Object.values(TAB_SECTION));

/** Resolve the data section for a tab title, or null if the tab isn't data. */
function sectionForTab(title: string): string | null {
  if (TAB_SECTION[title]) return TAB_SECTION[title];
  const norm = title.trim().toLowerCase().replace(/\s+/g, "_");
  return KNOWN_SECTIONS.has(norm) ? norm : null;
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");

/** A row is a guide/help/comment row (skipped) when its first cell starts with '#'. */
const isGuideRow = (firstCell: unknown) => String(firstCell ?? "").trim().startsWith("#");

/**
 * Turn a tab's raw value matrix (row 0 = headers) into RawRow objects tagged
 * with `section`, dropping the guide row and any '#'-prefixed comment rows.
 */
function rowsFromMatrix(section: string, values: unknown[][]): RawRow[] {
  if (!values || values.length < 2) return [];
  const headers = (values[0] as unknown[]).map((h) => normHeader(String(h ?? "")));
  const out: RawRow[] = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i] as unknown[];
    if (!r || r.length === 0) continue;
    if (isGuideRow(r[0])) continue;
    if (r.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: RawRow = { section };
    headers.forEach((h, idx) => {
      if (h) obj[h] = r[idx] != null ? String(r[idx]) : "";
    });
    out.push(obj);
  }
  return out;
}

// ── Approach 1: Published CSV URL ────────────────────────────────────────────

/**
 * Build a CSV-export URL from a Google Sheets shareable link or ID.
 *
 * @param sheetIdOrUrl - The spreadsheet ID or full URL
 * @param gid          - Sheet tab gid (default "0" = first tab)
 */
export function buildGSheetCsvUrl(sheetIdOrUrl: string, gid = "0"): string {
  return `https://docs.google.com/spreadsheets/d/${extractId(sheetIdOrUrl)}/export?format=csv&gid=${gid}`;
}

function extractId(sheetIdOrUrl: string): string {
  const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : sheetIdOrUrl;
}

/**
 * Fetch a single flat Google Sheet tab as CSV and parse into DashboardData.
 * The sheet must be "Published to the web" or shared as "Anyone with the link".
 */
export async function fetchGoogleSheetAsCSV(
  sheetIdOrUrl: string,
  gid = "0"
): Promise<DashboardData> {
  const csvUrl = buildGSheetCsvUrl(sheetIdOrUrl, gid);

  const res = await fetch(csvUrl, {
    next: { revalidate: 300 }, // revalidate every 5 min in Next.js cache
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch Google Sheet CSV (${res.status}): ${res.statusText}. ` +
      `Make sure the sheet is published to the web.`
    );
  }

  const csvText = await res.text();
  const data = parseCsvString(csvText);
  data.source = "google_sheets";
  data.lastRefreshed = new Date().toISOString();
  return data;
}

/**
 * Multi-tab via the public gviz endpoint (one request per recognised tab,
 * read by tab name). Returns null if no recognised tab yielded data, so the
 * caller can fall back to the single-tab CSV export.
 */
export async function fetchGoogleSheetMultiTabPublic(
  sheetIdOrUrl: string
): Promise<DashboardData | null> {
  const id = extractId(sheetIdOrUrl);

  const fetchTab = async (title: string, section: string): Promise<RawRow[]> => {
    const url =
      `https://docs.google.com/spreadsheets/d/${id}/gviz/tq` +
      `?tqx=out:csv&sheet=${encodeURIComponent(title)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const text = await res.text();
    // gviz returns an HTML error page (200) for unknown sheets — guard against it.
    if (text.startsWith("<")) return [];
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return rowsFromMatrix(section, parsed.data as unknown[][]);
  };

  const results = await Promise.all(
    Object.entries(TAB_SECTION).map(([title, section]) => fetchTab(title, section))
  );
  const rows = results.flat();
  if (rows.length === 0) return null;

  const data = parseRows(rows);
  data.source = "google_sheets";
  data.lastRefreshed = new Date().toISOString();
  return data;
}

// ── Approach 2: Google Sheets API v4 (service account) ──────────────────────

async function getSheetsClient(serviceKeyJson: string) {
  const { google } = await import("googleapis");
  const credentials = JSON.parse(serviceKeyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}

/**
 * Read a single flat tab via the Sheets API using a service account.
 */
export async function fetchGoogleSheetViaAPI(
  sheetId?: string,
  tabName?: string
): Promise<DashboardData> {
  const serviceKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const id = sheetId || process.env.GOOGLE_SHEET_ID;
  const tab = tabName || process.env.GOOGLE_SHEET_TAB || "Sheet1";

  if (!serviceKeyJson || !id) {
    throw new Error(
      "Google Sheets API requires GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_SHEET_ID env vars."
    );
  }

  const sheets = await getSheetsClient(serviceKeyJson);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A:Z`,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error("Google Sheet is empty or has no data rows.");
  }

  const csvLines = rows.map((row) =>
    row.map((cell: string) => {
      const s = String(cell ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  );

  const data = parseCsvString(csvLines.join("\n"));
  data.source = "google_sheets";
  data.lastRefreshed = new Date().toISOString();
  return data;
}

/**
 * Multi-tab via the Sheets API: list the workbook's tabs, batchGet every
 * recognised one, and assemble. Returns null if no recognised tabs exist, so
 * the caller can fall back to the single flat tab.
 */
export async function fetchGoogleSheetMultiTabAPI(
  sheetId?: string
): Promise<DashboardData | null> {
  const serviceKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const id = sheetId || process.env.GOOGLE_SHEET_ID;
  if (!serviceKeyJson || !id) return null;

  const sheets = await getSheetsClient(serviceKeyJson);
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: id,
    fields: "sheets.properties.title",
  });

  const tabs: { title: string; section: string }[] = [];
  for (const s of meta.data.sheets ?? []) {
    const title = s.properties?.title ?? "";
    const section = sectionForTab(title);
    if (section) tabs.push({ title, section });
  }
  if (tabs.length === 0) return null;

  const batch = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: id,
    ranges: tabs.map((t) => `'${t.title.replace(/'/g, "''")}'!A:Z`),
  });

  const ranges = batch.data.valueRanges ?? [];
  const rows: RawRow[] = [];
  ranges.forEach((vr, i) => {
    rows.push(...rowsFromMatrix(tabs[i].section, (vr.values ?? []) as unknown[][]));
  });
  if (rows.length === 0) return null;

  const data = parseRows(rows);
  data.source = "google_sheets";
  data.lastRefreshed = new Date().toISOString();
  return data;
}

// ── Convenience: auto-select transport + layout ──────────────────────────────

/**
 * Auto-detect the best approach:
 *  - With a service account: try multi-tab batchGet, else single flat tab.
 *  - Without: try multi-tab gviz, else single CSV export.
 */
export async function fetchGoogleSheetData(
  sheetIdOrUrl?: string,
  gid?: string
): Promise<DashboardData> {
  const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const id = sheetIdOrUrl || process.env.GOOGLE_SHEET_ID;

  if (!id) {
    throw new Error(
      "No Google Sheet ID configured. Set GOOGLE_SHEET_ID in .env.local or pass it directly."
    );
  }

  if (hasServiceAccount) {
    try {
      const multi = await fetchGoogleSheetMultiTabAPI(id);
      if (multi) return multi;
    } catch (err) {
      console.error("[googleSheets] Multi-tab API read failed, falling back to single tab:", err);
    }
    return fetchGoogleSheetViaAPI(id, process.env.GOOGLE_SHEET_TAB);
  }

  try {
    const multi = await fetchGoogleSheetMultiTabPublic(id);
    if (multi) return multi;
  } catch (err) {
    console.error("[googleSheets] Multi-tab gviz read failed, falling back to single tab:", err);
  }
  return fetchGoogleSheetAsCSV(id, gid || "0");
}
