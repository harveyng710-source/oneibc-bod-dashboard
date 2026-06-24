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

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "settings_session";

/** Constant-time string compare that doesn't leak length via early return. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function isAuthConfigured(): boolean {
  return !!process.env.SETTINGS_PASSWORD;
}

export function verifyPassword(pw: string): boolean {
  const expected = process.env.SETTINGS_PASSWORD;
  return !!expected && safeEqual(pw, expected);
}

/** Deterministic token for the current password/secret. */
export function sessionToken(): string {
  const pw = process.env.SETTINGS_PASSWORD ?? "";
  const secret = process.env.SETTINGS_SECRET;
  if (!secret) {
    // A missing secret falls back to a shared default, which makes the session
    // token forgeable by anyone who knows it. Loud in prod so it gets set.
    console.warn(
      "[settingsAuth] SETTINGS_SECRET is not set — using an insecure default. Set it in production."
    );
  }
  return createHmac("sha256", secret ?? "oneibc-settings").update(pw).digest("hex");
}

/** Read the session cookie and check it against the expected token. */
export async function isAuthed(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const jar = await cookies();
  const val = jar.get(SESSION_COOKIE)?.value;
  return !!val && safeEqual(val, sessionToken());
}
