import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildTripInfo, getPersona, personaLabel } from "@/lib/helpers";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import PrintLauncher from "./PrintLauncher";
import type { AgendaDayWithItems, Role } from "@/lib/types";

// Print-optimized, chrome-free render of an itinerary. The host opens this in a
// new tab from the Itinerary tab; PrintLauncher auto-opens the browser print
// dialog (Save as PDF). Authenticated + RLS-scoped (no public leak).
//
// Role-aware by design: `?persona=` selects which persona's view to print and
// reuses the exact same visibility filter as the on-screen view. It defaults to
// `tour_host` (the full itinerary). Student/other-role prints are a later
// follow-up that just passes a different persona here.
export const dynamic = "force-dynamic";

export default async function ItineraryPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ persona?: string }>;
}) {
  const { id } = await params;
  const { persona: personaParam } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: tour }, { data: days }, { data: members }, { data: confirmations }] = await Promise.all([
    supabase.from("tours").select("*, tour_hosts(id, name, phone, email)").eq("id", id).single(),
    supabase.from("agenda_days").select("*, agenda_items(*)").eq("tour_id", id).order("sort_order"),
    supabase.from("tour_members").select("type").eq("tour_id", id),
    supabase.from("tour_confirmations").select("type, label, file_url").eq("tour_id", id),
  ]);

  if (!tour) notFound();

  const mappedDays: AgendaDayWithItems[] = (days ?? []).map((day: any) => ({
    ...day,
    agenda_items: (day.agenda_items ?? []).map((item: any) => ({ ...item, agenda_feedback: [] })),
  }));

  const host = (tour as any).tour_hosts;
  const tripInfo = buildTripInfo({
    tour,
    members: members ?? [],
    days: mappedDays,
    hostName: host?.name ?? null,
    hostPhone: host?.phone ?? null,
    confirmations: confirmations ?? [],
  });

  // Default to the tour host's full view; honor an explicit persona for future
  // role-specific exports. Reuses the same persona → viewRole mapping the UI uses.
  const personaKey = personaParam || "tour_host";
  const role = (getPersona(personaKey)?.viewRole ?? "coordinator") as Role;
  const roleLabel = personaLabel(personaKey, tour.persona_labels);

  return (
    <>
      <style>{`
        /* Force background graphics (brand header, badges, note callouts) to print. */
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        html, body { margin: 0; padding: 0; background: #ffffff; }
        img { max-width: 100%; }

        @page { size: Letter; margin: 0.5in; }

        @media print {
          /* Hide on-screen-only chrome (the floating Print button). */
          .no-print { display: none !important; }
          /* Let day cards break across pages but keep each item intact. */
          .print-day { break-inside: auto; }
          .print-day-header { break-inside: avoid; break-after: avoid; }
          .print-item { break-inside: avoid; }
        }
      `}</style>
      <PrintLauncher />
      <div style={{ background: "#ffffff", padding: "8px 12px" }}>
        <AgendaRoleView
          tourName={tour.name}
          tourDestination={tour.destination}
          tourDates={tour.dates}
          bannerUrl={tour.banner_image_url}
          bannerFocusX={tour.banner_focus_x ?? 50}
          bannerFocusY={tour.banner_focus_y ?? 50}
          tripInfo={tripInfo}
          days={mappedDays}
          role={role}
          roleLabel={roleLabel}
          personaKey={personaKey}
          print
        />
      </div>
    </>
  );
}
