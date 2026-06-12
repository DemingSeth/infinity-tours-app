import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPersona, activePersonaKeys } from "@/lib/helpers";
import { signTourSession, TOUR_SESSION_COOKIE } from "@/lib/tourSession";

// Per the brief: fall back to 18h when the client can't supply a local
// end-of-day, and never let a session outlive a single day.
const FALLBACK_MAX_AGE = 18 * 60 * 60;
const MAX_AGE_CAP = 24 * 60 * 60;

// POST /api/tour-session
// Validates a guest access code server-side and, on success, sets a signed
// httpOnly cookie so a refresh doesn't re-prompt for the rest of the day.
export async function POST(req: NextRequest) {
  let body: { tourId?: unknown; personaKey?: unknown; code?: unknown; maxAgeSeconds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const tourId = typeof body.tourId === "string" ? body.tourId : "";
  const personaKey = typeof body.personaKey === "string" ? body.personaKey : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!tourId || !personaKey || !code.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const persona = getPersona(personaKey);
  if (!persona) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  // Read the participant-safe tour payload (including access codes) through the
  // same SECURITY DEFINER RPC the public page uses. Codes never leave the server.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_tour", { p_tour_id: tourId });
  if (error || !data?.tour) {
    return NextResponse.json({ error: "Tour not found." }, { status: 404 });
  }

  const tour = data.tour as { access_codes?: Record<string, string> | null; active_personas?: string[] | null };
  if (!activePersonaKeys(tour.active_personas).includes(personaKey)) {
    return NextResponse.json({ error: "That role isn't available for this tour." }, { status: 400 });
  }

  const expected = (tour.access_codes?.[persona.codeKey] ?? "").trim();
  if (!expected || code.trim() !== expected) {
    return NextResponse.json({ error: "Incorrect access code. Please try again." }, { status: 401 });
  }

  // Prefer the client's seconds-until-local-midnight (session ends at 11:59 PM
  // on the viewer's device), clamped to a day; otherwise an 18h fallback.
  const requested = Number(body.maxAgeSeconds);
  const maxAge = Number.isFinite(requested) && requested >= 60
    ? Math.min(Math.floor(requested), MAX_AGE_CAP)
    : FALLBACK_MAX_AGE;
  const exp = Math.floor(Date.now() / 1000) + maxAge;

  const res = NextResponse.json({ ok: true, role: persona.viewRole, personaKey });
  res.cookies.set(TOUR_SESSION_COOKIE, signTourSession({ t: tourId, p: personaKey, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
