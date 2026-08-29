import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OverviewClient from "./OverviewClient";
import type { OverviewTour, HostRole } from "@/lib/types";

// Always render fresh on every request so the dashboard reflects the latest
// tour data — including edits made directly in Supabase — with no caching.
export const dynamic = "force-dynamic";

// Command center: an all-tours view (not scoped to the current host by design).
// Open to every signed-in team member (August 2026 request): the calendar and
// the confirmation-progress list are for everyone; the revenue row and the
// banner library stay admin-only inside OverviewClient.
export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tours }, { data: tourHost }] = await Promise.all([
    supabase
      .from("tours")
      // agenda_items feed the confirmation-completeness bars (only the three
      // columns that calculation needs).
      .select("*, tour_hosts(id, name, initials), tour_members(id, type, waiver), agenda_items(id, confirmation_urls, confirmation_not_required)")
      .order("start_date", { ascending: true, nullsFirst: false }),
    supabase.from("tour_hosts").select("*").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <OverviewClient
      tours={(tours ?? []) as OverviewTour[]}
      currentHostId={user.id}
      viewerRole={(tourHost?.role ?? "host") as HostRole}
    />
  );
}
