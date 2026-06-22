/**
 * API Route: POST /api/upload-csv
 * ────────────────────────────────
 * Accepts a CSV file upload via FormData, parses it into DashboardData,
 * and returns the result. This allows staff to drag-and-drop a CSV
 * directly into the dashboard UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCsvString } from "@/lib/csvParser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Send a 'file' field in FormData." },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported." },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const data = parseCsvString(csvText);

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /upload-csv] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse error" },
      { status: 500 }
    );
  }
}
