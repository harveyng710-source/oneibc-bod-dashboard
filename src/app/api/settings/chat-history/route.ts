/**
 * GET    /api/settings/chat-history — list history (authed)
 * POST   /api/settings/chat-history — append a message (open: called from the dashboard)
 * DELETE /api/settings/chat-history — clear history (authed)
 */
import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/settingsAuth";
import { addChat, getChat, clearChat } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const history = await getChat(200);
  return NextResponse.json({ history });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const role = String(body?.role ?? "");
  const content = String(body?.content ?? "");
  if (!role || !content) return NextResponse.json({ error: "role & content required" }, { status: 400 });
  await addChat(role, content, body?.period ? String(body.period) : undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await clearChat();
  return NextResponse.json({ ok: true });
}
