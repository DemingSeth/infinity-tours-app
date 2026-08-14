"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { initialsFrom } from "@/lib/helpers";
import { isHostRole, nameFallback, type ActionResult } from "@/lib/invites";
import type { HostRole } from "@/lib/types";

// Server actions behind the Team Access screen.
//
// Two clients are in play and the split is deliberate:
//
//   the session client  runs as the signed-in admin, so the database can see who
//                       is asking. Every role and active-flag change goes through
//                       it, into the SECURITY DEFINER RPCs, which re-check
//                       is_admin() and enforce the rules about self-edits and
//                       super admins. A direct table update would fail anyway:
//                       tour_hosts.role and tour_hosts.is_active are not in the
//                       authenticated column grants.
//
//   the admin client    runs as service_role and bypasses all of that. It is used
//                       only for what the session client genuinely cannot do: the
//                       auth admin API (invite, delete) and writing the role on a
//                       brand new roster row.
//
// Nothing here trusts the browser. requireAdmin re-reads the caller's role from
// tour_hosts on every single call, before the service role client is ever built.

// Explicit discriminated union. An `"error" in result` check does not narrow the
// success branch cleanly once the success branch carries a client and an id, so
// the `ok` flag does the discriminating.
type AdminContext = {
  ok: true;
  supabase: SupabaseClient;
  userId: string;
  role: HostRole;
};

type AdminCheck = AdminContext | { ok: false; error: string };

async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has expired. Sign in again to manage team access." };
  }

  // isAdmin(), never an inline role string comparison. A super_admin passes every
  // admin gate, and forgetting that is how super admins silently lost access to
  // the banner image library.
  const { data: caller } = await supabase
    .from("tour_hosts")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isAdmin(caller?.role)) {
    return { ok: false, error: "You do not have permission to manage team access." };
  }

  return { ok: true, supabase, userId: user.id, role: caller!.role as HostRole };
}

// Invite a new team member.
//
// Order matters. The auth account is created first (only Supabase can send the
// email), then the tour_hosts row. Creating the roster row now rather than at
// first login is what makes the person show up immediately as a pending
// invitation, because admin_list_users selects FROM tour_hosts and left joins
// auth.users: no row, no line on the screen.
export async function inviteUser(input: {
  email: string;
  name: string;
  role: string;
  phone?: string;
}): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const email = (input.email ?? "").trim().toLowerCase();
  const name = (input.name ?? "").trim();
  const role = (input.role ?? "").trim();
  const phone = (input.phone ?? "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!isHostRole(role)) {
    return { ok: false, error: "Choose an access level for this person." };
  }
  // Mirrors the guard inside admin_set_host_role. Only a super admin hands out
  // super admin.
  if (role === "super_admin" && !isSuperAdmin(auth.role)) {
    return { ok: false, error: "Only a super admin can change super admin access" };
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }

  const displayName = nameFallback(name, email);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name: displayName, role },
    redirectTo: `${await siteOrigin()}/accept-invite`,
  });

  if (inviteError || !invited?.user) {
    const message = inviteError?.message ?? "";
    if (/already been registered|already registered|already exists/i.test(message)) {
      return {
        ok: false,
        error: `${email} already has an account. If they never accepted their invitation, use Resend invitation on their row instead.`,
      };
    }
    return { ok: false, error: message || "Supabase did not send the invitation." };
  }

  const { error: rowError } = await admin.from("tour_hosts").insert({
    id: invited.user.id,
    name: displayName,
    email,
    phone: phone || null,
    initials: initialsFrom(displayName, "TH"),
    role,
    is_active: true,
  });

  if (rowError) {
    // Roll the auth account back. An auth user with no tour_hosts row is a dead
    // account: the dashboard layout now refuses it, and its address is taken, so
    // leaving it behind would block a retry with the same email.
    await admin.auth.admin.deleteUser(invited.user.id);
    return {
      ok: false,
      error: `Could not add ${email} to the team, so the invitation was cancelled. ${rowError.message}`,
    };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: `Invitation sent to ${email}.` };
}

// Send a fresh invitation to someone who never accepted the first one.
//
// Supabase refuses a second invite to an address that already has an auth
// record, so the pending account is removed and rebuilt rather than re-invited.
// That is only safe while the account has never been used, which is exactly what
// the last_sign_in_at check below guarantees: no session has ever existed, so no
// data can be attached to it.
export async function resendInvite(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }

  const pending = await loadPendingTarget(admin, userId);
  if (!pending.ok) return { ok: false, error: pending.error };
  const { email, name, role, phone } = pending;

  if (role === "super_admin" && !isSuperAdmin(auth.role)) {
    return { ok: false, error: "Only a super admin can change super admin access" };
  }

  const teardown = await deleteAccount(admin, userId);
  if (!teardown.ok) return { ok: false, error: teardown.error };

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role },
    redirectTo: `${await siteOrigin()}/accept-invite`,
  });

  if (inviteError || !invited?.user) {
    revalidatePath("/admin/users");
    return {
      ok: false,
      error: `The old invitation for ${email} was cleared but the new one could not be sent. Invite them again. ${inviteError?.message ?? ""}`.trim(),
    };
  }

  const { error: rowError } = await admin.from("tour_hosts").insert({
    id: invited.user.id,
    name,
    email,
    phone,
    initials: initialsFrom(name, "TH"),
    role,
    is_active: true,
  });

  if (rowError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    revalidatePath("/admin/users");
    return {
      ok: false,
      error: `Could not restore ${email} on the team, so the invitation was cancelled. Invite them again. ${rowError.message}`,
    };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: `A new invitation is on its way to ${email}.` };
}

// Withdraw an invitation that was never accepted. A hard delete of both rows,
// which is only offered while the account has never been signed in to.
export async function revokeInvite(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (userId === auth.userId) {
    return { ok: false, error: "You cannot remove your own account." };
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (err) {
    return { ok: false, error: errorText(err) };
  }

  const pending = await loadPendingTarget(admin, userId);
  if (!pending.ok) return { ok: false, error: pending.error };

  if (pending.role === "super_admin" && !isSuperAdmin(auth.role)) {
    return { ok: false, error: "Only a super admin can change super admin access" };
  }

  const teardown = await deleteAccount(admin, userId);
  if (!teardown.ok) return { ok: false, error: teardown.error };

  revalidatePath("/admin/users");
  return { ok: true, message: `The invitation for ${pending.email} has been withdrawn.` };
}

// Change someone's access level.
//
// Through the caller's own session, never the service client: admin_set_host_role
// reads auth.uid() to decide whether this is a self-edit and whether the caller
// outranks the target. Handing it a service role connection would blind it. The
// exceptions it raises are already written for a human, so they are passed
// straight back rather than replaced with a generic failure line.
export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (!isHostRole(role)) {
    return { ok: false, error: "Choose a valid access level." };
  }

  const { error } = await auth.supabase.rpc("admin_set_host_role", {
    p_user: userId,
    p_role: role,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true, message: "Access level updated." };
}

// Turn app access on or off. Same reasoning as setUserRole: the RPC checks
// auth.uid(), so it runs on the caller's session.
export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase.rpc("admin_set_host_active", {
    p_user: userId,
    p_active: active,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: active ? "Access restored." : "Access turned off.",
  };
}

// ─── Shared internals ────────────────────────────────────────────────────────

type PendingTarget =
  | { ok: true; email: string; name: string; role: HostRole; phone: string | null }
  | { ok: false; error: string };

// Load a roster row and refuse it unless the account has never signed in.
// resendInvite and revokeInvite both destroy the account they are handed, so this
// is the check that keeps them from destroying one that has been used.
async function loadPendingTarget(admin: SupabaseClient, userId: string): Promise<PendingTarget> {
  const { data: host, error } = await admin
    .from("tour_hosts")
    .select("email, name, role, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!host) return { ok: false, error: "That person is no longer on the team." };

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError) return { ok: false, error: authError.message };

  if (authUser?.user?.last_sign_in_at) {
    return {
      ok: false,
      error: "This person has already signed in, so their invitation cannot be reissued or withdrawn. Turn their access off instead.",
    };
  }

  return {
    ok: true,
    email: host.email as string,
    name: host.name as string,
    role: host.role as HostRole,
    phone: (host.phone as string | null) ?? null,
  };
}

// Remove an account completely.
//
// The tour_hosts row goes FIRST. tour_hosts.id references auth.users(id) with no
// cascade, so deleting the auth user while the roster row still points at it is
// rejected by the foreign key. Tours, vendors, reviews, banner images,
// confirmations and notes all reference tour_hosts with no cascade either, which
// is what the failure branch below is about: the delete bounces precisely when
// the person owns real work, and that work must not be dragged down with them.
async function deleteAccount(
  admin: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: rowError } = await admin.from("tour_hosts").delete().eq("id", userId);
  if (rowError) {
    return {
      ok: false,
      error:
        "This account has tours or other records attached to it, so it cannot be deleted. Deactivate it instead.",
    };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { ok: false, error: authError.message };

  return { ok: true };
}

// Base URL for the invite link, taken from the request that is sending it so
// production, preview deploys and localhost each build their own. A hardcoded or
// pinned URL sends preview and local invites to production.
//
// Note this only governs the PKCE fallback: the invite email template hand builds
// its link from Supabase's own Site URL. It still has to be right, because
// Supabase will only redirect to an address on its allow list.
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}
