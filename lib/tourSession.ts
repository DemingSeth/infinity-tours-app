import crypto from "node:crypto";
import { activePersonaKeys, getPersona } from "./helpers";

// Server-only helpers for the guest access-code session cookie. This module
// must never be imported from a client component (it reads the server secret
// and uses node:crypto).

// Cookie that remembers a validated guest access-code session, scoped to one
// tour. httpOnly + signed — the browser can read neither the secret nor the code.
export const TOUR_SESSION_COOKIE = "tour_session";

export interface TourSessionPayload {
  t: string; // tour id this session is scoped to
  p: string; // persona key the code unlocked (e.g. "student")
  exp: number; // expiry, unix seconds
}

function getSecret(): string {
  const s = process.env.TOUR_SESSION_SECRET;
  if (s && s.length > 0) return s;
  // Keep local dev working without configuration, but never run prod unsigned.
  if (process.env.NODE_ENV !== "production") return "dev-insecure-tour-session-secret-change-me";
  throw new Error("TOUR_SESSION_SECRET is not set");
}

function hmac(body: string): string {
  return crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
}

// Token format: `<base64url(json payload)>.<hmac>`. The raw access code is
// never part of the token.
export function signTourSession(payload: TourSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${hmac(body)}`;
}

// Verify the signature and expiry; returns the payload, or null if the token is
// missing, malformed, tampered, or expired. Uses a constant-time comparison.
export function verifyTourSession(token: string | undefined | null): TourSessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = hmac(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload: TourSessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.t !== "string" || typeof payload.p !== "string" || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.exp * 1000 <= Date.now()) return null;
  return payload;
}

// Constant-time string equality. Both inputs are hashed to a fixed 32-byte
// digest first, so timingSafeEqual always compares equal-length buffers (it
// throws on a length mismatch) and the comparison never short-circuits or leaks
// the lengths of the real codes. Distinct strings → distinct digests → false.
function constantTimeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a, "utf8").digest();
  const hb = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Resolve which persona a shareable-link code unlocks. The persona is derived
// ENTIRELY from the secret code server-side — there is no persona URL parameter
// to edit, so a viewer cannot escalate to a role whose code they don't know.
//
// The match is compared uniformly against EVERY active persona's stored code:
// the loop always runs to completion (no early return on first match) and every
// candidate runs the same constant-time compare, including empty stored codes,
// so timing reveals neither which persona matched nor whether a code was set.
// An empty/blank stored code can never be matched (a blank ?c= must not unlock).
export function resolvePersonaFromCode(
  code: string | null | undefined,
  accessCodes: Record<string, string> | null | undefined,
  activePersonas: string[] | null | undefined,
): { personaKey: string; codeKey: string } | null {
  const supplied = (code ?? "").trim();
  let matched: { personaKey: string; codeKey: string } | null = null;
  for (const personaKey of activePersonaKeys(activePersonas)) {
    const persona = getPersona(personaKey);
    if (!persona) continue;
    const stored = (accessCodes?.[persona.codeKey] ?? "").trim();
    const isMatch = constantTimeEqual(supplied, stored);
    if (isMatch && stored.length > 0) {
      matched = { personaKey, codeKey: persona.codeKey };
    }
  }
  return matched;
}
