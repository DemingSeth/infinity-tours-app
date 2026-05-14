import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicTourViewClient from "./PublicTourViewClient";
import type { AgendaDayWithItems } from "@/lib/types";

export default async function PublicTourViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: tour }, { data: rawDays }] = await Promise.all([
    supabase
      .from("tours")
      .select("id, name, destination, dates, access_codes")
      .eq("id", id)
      .single(),
    supabase
      .from("agenda_days")
      .select("*, agenda_items(*)")
      .eq("tour_id", id)
      .order("sort_order"),
  ]);

  if (!tour) notFound();

  const days: AgendaDayWithItems[] = (rawDays ?? []).map((day: any) => ({
    ...day,
    agenda_items: (day.agenda_items ?? []).map((item: any) => ({
      ...item,
      agenda_feedback: [],
    })),
  }));

  return (
    <PublicTourViewClient
      tourId={id}
      tourName={tour.name}
      tourDestination={tour.destination ?? null}
      tourDates={tour.dates ?? null}
      accessCodes={tour.access_codes}
      days={days}
    />
  );
}
