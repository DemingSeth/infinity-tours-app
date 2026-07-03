import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The app already keeps an editable display name on tour_hosts, so Account
  // exposes it here. No schema change — this only reads/writes existing columns.
  const { data: tourHost } = await supabase
    .from("tour_hosts")
    .select("name")
    .eq("id", user.id)
    .single();

  return (
    <AccountForm
      userId={user.id}
      email={user.email ?? ""}
      initialName={tourHost?.name ?? ""}
    />
  );
}
