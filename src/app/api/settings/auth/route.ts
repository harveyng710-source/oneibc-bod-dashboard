/**
 * POST /api/settings/auth   — login (sets session cookie)
 * DELETE /api/settings/auth — logout
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, sessionToken, SESSION_COOKIE, isAuthConfigured } from "@/lib/settingsAuth";
import { logAccess } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "SETTINGS_PASSWORD chưa được cấu hình trên server." },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => ({}));
  if (!verifyPassword(String(body?.password ?? ""))) {
    await logAccess("settings.login.fail");
    return NextResponse.json({ error: "Sai mật khẩu." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8h
  });
  await logAccess("settings.login.success");
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
