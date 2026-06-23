/**
 * GET /api/settings  — read settings (apiKey masked)
 * PUT /api/settings  — update settings (requires DB)
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/settingsAuth";
import { getSettings, updateSettings, maskKey, logAccess } from "@/lib/settingsStore";
import type { AppSettings } from "@/lib/settingsStore";
import { isDbEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await getSettings();
  return NextResponse.json({
    settings: { ...s, apiKey: maskKey(s.apiKey), apiKeySet: !!s.apiKey },
    dbEnabled: isDbEnabled(),
  });
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDbEnabled()) {
    return NextResponse.json(
      { error: "DATABASE_URL chưa cấu hình — không thể lưu thay đổi." },
      { status: 503 }
    );
  }
  const patch = (await req.json().catch(() => ({}))) as Partial<AppSettings>;
  // Never overwrite the stored key with the masked placeholder echoed back by the UI.
  if (typeof patch.apiKey === "string" && patch.apiKey.includes("•")) delete patch.apiKey;
  await updateSettings(patch);
  await logAccess("settings.update", Object.keys(patch).join(",") || "(none)");
  return NextResponse.json({ ok: true });
}
