import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tourHost } = await supabase
    .from("tour_hosts")
    .select("*")
    .eq("id", user.id)
    .single();

  // Auto-create tour_hosts record on first login if missing
  if (!tourHost) {
    await supabase.from("tour_hosts").insert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Tour Host",
      email: user.email!,
      initials: (user.user_metadata?.name || user.email || "TH")
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    });
  }

  return <DashboardShell user={user} tourHost={tourHost}>{children}</DashboardShell>;
}
