import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import type { AdminUserRow } from "@/lib/types";
import AdminUsersClient from "./AdminUsersClient";

// The roster reflects sign-ins and pending invitations, so never serve it stale.
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admin-only, checked the same way app/(dashboard)/quote-builder/page.tsx does
  // it: read tour_hosts.role server-side and run it through isAdmin(), never an
  // inline role string comparison. admin_list_users() is gated on is_admin() as
  // well, so this is the outer of two independent locks rather than the only one.
  const { data: viewerHost } = await supabase
    .from("tour_hosts")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdmin(viewerHost?.role)) redirect("/dashboard");

  const { data: rows, error } = await supabase.rpc("admin_list_users");

  return (
    <AdminUsersClient
      rows={(rows ?? []) as AdminUserRow[]}
      viewerId={user.id}
      // Whether the super admin option is offered at all. The server decides it;
      // admin_set_host_role enforces it again on the way in.
      viewerIsSuperAdmin={isSuperAdmin(viewerHost?.role)}
      loadError={error?.message ?? null}
    />
  );
}
