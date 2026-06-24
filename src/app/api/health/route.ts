/**
 * API Route: GET /api/health
 * ───────────────────────────
 * Liveness/readiness probe for Railway (and any uptime monitor).
 *
 * Intentionally lightweight: it reports that the process is up and which data
 * source / persistence is *configured*, but does NOT fetch the Google Sheet or
 * hit Postgres — a slow upstream must not fail the deploy healthcheck.
 */

import { NextResponse } from "next/server";
import { isDbEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

function configuredSource(): "google_sheets" | "csv" | "static" {
  if (process.env.GOOGLE_SHEET_ID) return "google_sheets";
  if (process.env.DASHBOARD_CSV_URL) return "csv";
  return "static";
}

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
      source: configuredSource(),
      dbEnabled: isDbEnabled(),
      settingsAuth: !!process.env.SETTINGS_PASSWORD,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
