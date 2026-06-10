import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicTourViewClient from "./PublicTourViewClient";
import { buildTripInfo } from "@/lib/helpers";
import type { AgendaDayWithItems } from "@/lib/types";

export default async function PublicTourViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  });

  return (
    <PublicTourViewClient
      tourId={id}
      tourName={tour.name}
      tourDestination={tour.destination ?? null}
      tourDates={tour.dates ?? null}
      tourBannerUrl={tour.banner_image_url ?? null}
      tripInfo={tripInfo}
      accessCodes={tour.access_codes}
      days={days}
    />
  );
}
