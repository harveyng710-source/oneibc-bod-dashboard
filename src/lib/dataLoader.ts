/**
 * dataLoader.ts
 * ──────────────
 * Central entry point that resolves the configured data source
 * and returns a DashboardData object.
 *
 * Priority:
 *   1. Google Sheets (if GOOGLE_SHEET_ID is set)
 *   2. CSV URL (if DASHBOARD_CSV_URL is set)
 *   3. Static fallback data
 */

import { STATIC_DASHBOARD_DATA } from "./staticData";
import { parseCsvUrl } from "./csvParser";
import { fetchGoogleSheetData } from "./googleSheets";
import type { DashboardData } from "@/types/dashboard";

export async function loadDashboardData(): Promise<DashboardData> {
  // ── 1. Google Sheets ───────────────────────────────────────────────────────
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (sheetId) {
    try {
      console.log("[dataLoader] Fetching from Google Sheets…");
      return await fetchGoogleSheetData(sheetId);
    } catch (err) {
      console.error("[dataLoader] Google Sheets fetch failed, falling back:", err);
    }
  }

  // ── 2. CSV URL ─────────────────────────────────────────────────────────────
  const csvUrl = process.env.DASHBOARD_CSV_URL;
  if (csvUrl) {
    try {
      console.log("[dataLoader] Fetching from CSV URL…");
      return await parseCsvUrl(csvUrl);
    } catch (err) {
      console.error("[dataLoader] CSV fetch failed, falling back:", err);
    }
  }

  // ── 3. Static fallback ────────────────────────────────────────────────────
  console.log("[dataLoader] Using static seed data.");
  return STATIC_DASHBOARD_DATA;
}
