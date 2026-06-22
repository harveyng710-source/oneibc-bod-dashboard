/**
 * googleSheets.ts
 * ────────────────
 * Reads data from a **published** Google Sheets spreadsheet.
 *
 * Two approaches supported:
 *
 * 1. **Public CSV export** (zero-config, no API key needed):
 *    Publish the sheet to the web (File → Share → Publish to web → CSV)
 *    and pass the URL. We download & feed it through csvParser.
 *
 * 2. **Google Sheets API v4** (needs a service-account JSON key):
 *    Set GOOGLE_SERVICE_ACCOUNT_KEY env-var with the JSON content,
 *    plus GOOGLE_SHEET_ID and optionally GOOGLE_SHEET_TAB.
 *
 * For staff convenience, approach #1 is the default path —
 * they just paste a Google Sheets published-CSV URL into the
 * dashboard settings or .env.local.
 */

import { parseCsvString } from "./csvParser";
import type { DashboardData } from "@/types/dashboard";

// ── Approach 1: Published CSV URL ────────────────────────────────────────────

/**
 * Build a CSV-export URL from a Google Sheets shareable link or ID.
 *
 * Accepts:
 *  - Full URL:  https://docs.google.com/spreadsheets/d/SHEET_ID/...
 *  - Just the ID string
 *
 * @param sheetIdOrUrl - The spreadsheet ID or full URL
 * @param gid          - Sheet tab gid (default "0" = first tab)
 */
export function buildGSheetCsvUrl(sheetIdOrUrl: string, gid = "0"): string {
  let id = sheetIdOrUrl;

  // Extract ID from full URL if needed
  const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) id = match[1];

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

/**
 * Fetch a Google Sheet as CSV and parse into DashboardData.
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

// ── Approach 2: Google Sheets API v4 (service account) ──────────────────────

/**
 * Read sheet data via the Sheets API using a service account.
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY env var (full JSON).
 *
 * This is more robust for private sheets but requires more setup.
 * Falls back to the CSV approach if no service account is configured.
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

  // Dynamic import to avoid bundling googleapis on client
  const { google } = await import("googleapis");

  const credentials = JSON.parse(serviceKeyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!A:Z`, // read all columns
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) {
    throw new Error("Google Sheet is empty or has no data rows.");
  }

  // Convert rows array to CSV string (header + data)
  const csvLines = rows.map((row) =>
    row.map((cell: string) => {
      const s = String(cell ?? "");
      // Escape cells that contain commas or quotes
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  );

  const csvText = csvLines.join("\n");
  const data = parseCsvString(csvText);
  data.source = "google_sheets";
  data.lastRefreshed = new Date().toISOString();
  return data;
}

// ── Convenience: auto-select approach ────────────────────────────────────────

/**
 * Auto-detect the best approach:
 *  - If GOOGLE_SERVICE_ACCOUNT_KEY is configured → use API v4
 *  - Otherwise → use public CSV export
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
    return fetchGoogleSheetViaAPI(id, process.env.GOOGLE_SHEET_TAB);
  }

  return fetchGoogleSheetAsCSV(id, gid || "0");
}
