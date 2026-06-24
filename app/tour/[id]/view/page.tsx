import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicTourViewClient from "./PublicTourViewClient";
import { buildTripInfo, getPersona, personaLabel, activePersonaKeys } from "@/lib/helpers";
import { verifyTourSession, resolvePersonaFromCode, TOUR_SESSION_COOKIE } from "@/lib/tourSession";
import type { AgendaDayWithItems, Role } from "@/lib/types";

export default async function PublicTourViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c: linkCode } = await searchParams;
  const supabase = await createClient();

  // The shared view is public (no login). RLS restricts the underlying tables to
  // authenticated users, so we read the curated, participant-safe payload through
  // a SECURITY DEFINER RPC keyed on the (unguessable) tour id. Returns null when
  // the tour doesn't exist.
  const { data } = await supabase.rpc("get_shared_tour", { p_tour_id: id });
  if (!data) notFound();

  const tour = data.tour;
  const host = data.host;

  const days: AgendaDayWithItems[] = (data.days ?? []).map((day: any) => ({
    ...day,
    agenda_items: (day.agenda_items ?? []).map((item: any) => ({
      ...item,
      agenda_feedback: [],
    })),
  }));

  const tripInfo = buildTripInfo({
    tour,
    members: data.members ?? [],
    days,
    hostName: host?.name ?? null,
    hostPhone: host?.phone ?? null,
    confirmations: data.confirmations ?? [],
  });

  let initialUnlocked: { role: Role; label: string; personaKey: string } | null = null;

  // Per-persona shareable link: ?c=<code> carries the secret access code only —
  // never a persona key. The persona is resolved ENTIRELY server-side from the
  // code (constant-time, against the access_codes the RPC returned but never
  // forwards to the browser). A viewer cannot escalate by editing the URL: there
  // is no persona parameter, and reaching another role requires its unguessable
  // code. No cookie is set — the link itself is the credential.
  if (linkCode) {
    const resolved = resolvePersonaFromCode(linkCode, tour.access_codes ?? null, tour.active_personas ?? null);
    if (resolved) {
      const persona = getPersona(resolved.personaKey)!;
      initialUnlocked = {
        role: persona.viewRole,
        label: personaLabel(resolved.personaKey, tour.persona_labels ?? {}),
        personaKey: resolved.personaKey,
      };
    }
  }

  // Otherwise skip the access-code prompt when this device already holds a valid,
  // unexpired session cookie for THIS tour and the unlocked persona is still
  // active. The access codes themselves are never sent to the browser.
  if (!initialUnlocked) {
    const session = verifyTourSession((await cookies()).get(TOUR_SESSION_COOKIE)?.value);
    if (session && session.t === id) {
      const persona = getPersona(session.p);
      if (persona && activePersonaKeys(tour.active_personas).includes(session.p)) {
        initialUnlocked = {
          role: persona.viewRole,
          label: personaLabel(session.p, tour.persona_labels ?? {}),
          personaKey: session.p,
        };
      }
    }
  }

  return (
    <PublicTourViewClient
      tourId={id}
      tourName={tour.name}
      tourDestination={tour.destination ?? null}
      tourDates={tour.dates ?? null}
      tourBannerUrl={tour.banner_image_url ?? null}
      tourBannerFocusX={tour.banner_focus_x ?? 50}
      tourBannerFocusY={tour.banner_focus_y ?? 50}
      tripInfo={tripInfo}
      initialUnlocked={initialUnlocked}
      activePersonas={tour.active_personas ?? []}
      personaLabels={tour.persona_labels ?? {}}
      days={days}
      generalFeedbackEnabled={tour.general_feedback_enabled ?? true}
      tourEndDate={tour.end_date ?? null}
    />
  );
}
