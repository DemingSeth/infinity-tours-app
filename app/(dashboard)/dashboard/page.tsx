import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PipelineClient from "./PipelineClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tours }, { data: tourHost }] = await Promise.all([
    supabase
      .from("tours")
      .select("*, tour_hosts(id, name, initials), tour_members(id, type, waiver)")
      .order("created_at", { ascending: false }),
    supabase
      .from("tour_hosts")
      .select("*")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <PipelineClient
      initialTours={tours ?? []}
      currentHostId={user.id}
      currentHostName={tourHost?.name ?? user.email ?? ""}
    />
  );
}
