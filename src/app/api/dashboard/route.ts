/**
 * API Route: GET /api/dashboard
 * ──────────────────────────────
 * Returns the full DashboardData payload.
 *
 * Query params:
 *   ?source=static     → force static data (debugging)
 *   ?source=csv&url=…  → load from a CSV URL
 *   ?source=sheets     → load from Google Sheets (env vars)
 *
 * Without params, uses the auto-detect logic from dataLoader.
 */

import { NextRequest, NextResponse } from "next/server";
import { loadDashboardData } from "@/lib/dataLoader";
import { parseCsvUrl } from "@/lib/csvParser";
import { fetchGoogleSheetData } from "@/lib/googleSheets";
import { STATIC_DASHBOARD_DATA } from "@/lib/staticData";
import { isAuthed } from "@/lib/settingsAuth";

export const dynamic = "force-dynamic"; // always fresh

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source");
    const csvUrl = searchParams.get("url");

    // The `source`/`url` overrides let a caller make the server fetch an
    // arbitrary URL (SSRF) or force a specific backend. They are debugging /
    // admin tools, so gate them behind the Settings session. The default,
    // unauthenticated path uses only the env-configured source.
    if (source && !(await isAuthed())) {
      return NextResponse.json(
        { error: "The ?source override requires an authenticated Settings session." },
        { status: 401 }
      );
    }

    let data;

    switch (source) {
      case "static":
        data = STATIC_DASHBOARD_DATA;
        break;

      case "csv":
        if (!csvUrl) {
          return NextResponse.json(
            { error: "CSV source requires a ?url= parameter" },
            { status: 400 }
          );
        }
        data = await parseCsvUrl(csvUrl);
        break;

      case "sheets":
        data = await fetchGoogleSheetData();
        break;

      default:
        data = await loadDashboardData();
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[API /dashboard] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
