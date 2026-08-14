import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // maybeSingle, not single: "no row" is a real and expected state here (an auth
  // account that was never invited into the app), and it is answered with a
  // redirect rather than an error.
  const { data: tourHost } = await supabase
    .from("tour_hosts")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Provisioning is invite-only, and this is the gate that makes it so. The
  // invite action writes the tour_hosts row at the moment the invite is sent, so
  // by the time an invited person arrives the row already exists with the name
  // and role an admin chose.
  //
  // Nothing is created here. An auth.users row on its own must never be enough
  // to enter the app: anyone who can reach the Supabase auth endpoints can
  // create one, so auto-creating a roster row on first login (which this used to
  // do) quietly made an auth account equal to full app access.
  //
  // Sign-out runs through the route handler because a Server Component cannot
  // clear cookies: lib/supabase/server.ts swallows the write, so the session
  // would survive and the visitor would bounce between /login and here forever.
  if (!tourHost) redirect("/auth/signout?reason=noaccess");

  // A deactivated account keeps its auth credentials but loses the app.
  //
  // Written to fail closed: anything other than a true is_active is refused. If
  // the column ever stopped coming back (a dropped SELECT grant, say) this locks
  // everyone out loudly instead of quietly readmitting deactivated accounts.
  if (!tourHost.is_active) redirect("/auth/signout?reason=deactivated");

  return <DashboardShell user={user} tourHost={tourHost}>{children}</DashboardShell>;
}
