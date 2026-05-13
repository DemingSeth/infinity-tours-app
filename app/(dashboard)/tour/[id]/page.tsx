import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TourDetailClient from "./TourDetailClient";

export default async function TourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tour }, { data: members }, { data: days }, { data: postTrip }, { data: vendors }] = await Promise.all([
    supabase
      .from("tours")
      .select("*, tour_hosts(id, name, initials, phone, email)")
      .eq("id", id)
      .single(),
    supabase
      .from("tour_members")
      .select("*")
      .eq("tour_id", id)
      .order("sort_order"),
    supabase
      .from("agenda_days")
      .select("*, agenda_items(*, agenda_feedback(*))")
      .eq("tour_id", id)
      .order("sort_order"),
    supabase
      .from("post_trip")
      .select("*")
      .eq("tour_id", id)
      .maybeSingle(),
    supabase
      .from("vendors")
      .select("*")
      .order("name"),
  ]);

  if (!tour) notFound();

  return (
    <TourDetailClient
      tour={tour}
      initialMembers={members ?? []}
      initialDays={days ?? []}
      initialPostTrip={postTrip ?? null}
      vendors={vendors ?? []}
      currentUserId={user.id}
    />
  );
}
