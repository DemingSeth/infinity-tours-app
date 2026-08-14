import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/roles";
import OverviewClient from "./OverviewClient";
import type { TourWithHostAndMembers, HostRole } from "@/lib/types";

// Always render fresh on every request so the dashboard reflects the latest
// tour data — including edits made directly in Supabase — with no caching.
export const dynamic = "force-dynamic";

// Command center: an all-tours view (not scoped to the current host by design).
export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tours }, { data: tourHost }] = await Promise.all([
    supabase
      .from("tours")
      .select("*, tour_hosts(id, name, initials), tour_members(id, type, waiver)")
      .order("start_date", { ascending: true, nullsFirst: false }),
    supabase.from("tour_hosts").select("*").eq("id", user.id).maybeSingle(),
  ]);

  // Overview is admin-only. Mirror the app's role check (tour_hosts.role +
  // isAdmin); logged-in non-admins are sent back to the dashboard.
  if (!isAdmin(tourHost?.role)) redirect("/dashboard");

  return (
    <OverviewClient
      tours={(tours ?? []) as TourWithHostAndMembers[]}
      currentHostId={user.id}
      // Still threaded through so the client can gate admin-only cards as
      // defense in depth behind this page-level redirect.
      viewerRole={(tourHost?.role ?? "host") as HostRole}
    />
  );
}
