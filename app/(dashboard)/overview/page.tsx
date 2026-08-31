import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OverviewClient from "./OverviewClient";
import type { OverviewTour, HostRole } from "@/lib/types";

// Always render fresh on every request so the dashboard reflects the latest
// tour data — including edits made directly in Supabase — with no caching.
export const dynamic = "force-dynamic";

// Command center. Open to every signed-in team member, but scoped by role
// (September 2026 request): an admin sees every tour, while everyone else sees
// only the upcoming tours they are actually working — listed as Tour Consultant,
// listed or assigned as Tour Host, or the owner. The scoping runs in
// OverviewClient so one query feeds the calendar and the confirmation list.
// The revenue row and the banner library stay admin-only.
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
      // Email and name back the fallback matching in isViewerOnTour(), for
      // consultant/host entries saved before the staff dropdown stored ids.
      currentHostEmail={tourHost?.email ?? user.email ?? null}
      currentHostName={tourHost?.name ?? null}
      viewerRole={(tourHost?.role ?? "host") as HostRole}
    />
  );
}
