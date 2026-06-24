/**
 * API Route: POST /api/upload-csv
 * ────────────────────────────────
 * Accepts a CSV file upload via FormData, parses it into DashboardData,
 * and returns the result. This allows staff to drag-and-drop a CSV
 * directly into the dashboard UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseCsvString } from "@/lib/csvParser";

/** Reject oversized uploads early — the parser is CPU-bound, so cap input size. */
const MAX_BYTES = 2_000_000; // 2 MB is plenty for a flat dashboard CSV.

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

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / 1_000_000} MB).` },
        { status: 413 }
      );
    }

    const csvText = await file.text();
    // Guard against a small file that decompresses / decodes to something huge.
    if (csvText.length > MAX_BYTES * 4) {
      return NextResponse.json({ error: "File content too large." }, { status: 413 });
    }

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
