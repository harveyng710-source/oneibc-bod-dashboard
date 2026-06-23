/** GET /api/settings/logs — recent access logs (authed) */
import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/settingsAuth";
import { getLogs } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const logs = await getLogs(200);
  return NextResponse.json({ logs });
}
