import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicTourViewClient from "./PublicTourViewClient";
import { buildTripInfo } from "@/lib/helpers";
import type { AgendaDayWithItems } from "@/lib/types";

export default async function PublicTourViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tour }, { data: rawDays }, { data: members }] = await Promise.all([
    supabase
      .from("tours")
      .select("id, name, destination, dates, access_codes, banner_image_url, contact_name, contact_email, traveling_tour_host, start_date, end_date, bus_capacity, room_config, tour_hosts(name, phone)")
      .eq("id", id)
      .single(),
    supabase
      .from("agenda_days")
      .select("*, agenda_items(*)")
      .eq("tour_id", id)
      .order("sort_order"),
    supabase
      .from("tour_members")
      .select("type")
      .eq("tour_id", id),
  ]);

  if (!tour) notFound();

  const days: AgendaDayWithItems[] = (rawDays ?? []).map((day: any) => ({
    ...day,
    agenda_items: (day.agenda_items ?? []).map((item: any) => ({
      ...item,
      agenda_feedback: [],
    })),
  }));

  const host = (tour as any).tour_hosts;
  const tripInfo = buildTripInfo({
    tour,
    members: members ?? [],
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
