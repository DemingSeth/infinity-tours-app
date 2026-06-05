import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OverviewClient from "./OverviewClient";
import type { TourWithHostAndMembers, HostRole } from "@/lib/types";

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
    supabase.from("tour_hosts").select("*").eq("id", user.id).single(),
  ]);

  return (
    <OverviewClient
      tours={(tours ?? []) as TourWithHostAndMembers[]}
      currentHostId={user.id}
      // Threaded through for future admin/host gating — not enforced yet.
      viewerRole={(tourHost?.role ?? "host") as HostRole}
    />
  );
}
