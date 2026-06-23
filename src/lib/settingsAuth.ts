/**
 * settingsAuth.ts
 * ───────────────
 * Minimal password gate for the Settings area (server-only).
 *
 * Env:
 *   SETTINGS_PASSWORD  — the shared password required to open Settings.
 *   SETTINGS_SECRET    — optional salt for the session token (defaults provided).
 *
 * The session cookie holds a deterministic token derived from the password +
 * secret, so it can be verified statelessly without storing sessions.
 */

import { createHmac } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "settings_session";

export function isAuthConfigured(): boolean {
  return !!process.env.SETTINGS_PASSWORD;
}

export function verifyPassword(pw: string): boolean {
  const expected = process.env.SETTINGS_PASSWORD;
  return !!expected && pw === expected;
}

/** Deterministic token for the current password/secret. */
export function sessionToken(): string {
  const pw = process.env.SETTINGS_PASSWORD ?? "";
  const secret = process.env.SETTINGS_SECRET ?? "oneibc-settings";
  return createHmac("sha256", secret).update(pw).digest("hex");
}

/** Read the session cookie and check it against the expected token. */
export async function isAuthed(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const jar = await cookies();
  const val = jar.get(SESSION_COOKIE)?.value;
  return !!val && val === sessionToken();
}
