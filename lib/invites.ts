// Shared vocabulary for the Team Access screen: the roles an admin can hand out
// and the shape every server action answers with. Kept out of the actions module
// so the client screen can type a result without reaching into server-only code.
import type { Role } from "@/lib/roles";

export const HOST_ROLES: readonly Role[] = ["host", "admin", "super_admin"];

export function isHostRole(value: unknown): value is Role {
  return typeof value === "string" && (HOST_ROLES as readonly string[]).includes(value);
}

// Result of every server action on the Team Access screen. A discriminated union
// on `ok` rather than an optional error field, so a caller that forgets to check
// does not compile.
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

// Display name for an invited account when none was supplied. Falls back to the
// local part of the address so the roster never shows a blank row.
export function nameFallback(name?: string | null, email?: string | null): string {
  const trimmed = (name || "").trim();
  if (trimmed) return trimmed;
  const local = (email || "").split("@")[0];
  return local || "Tour Host";
}

// First name for the invite greeting. The invite metadata carries the full name
// an admin typed; only the first word is wanted for "Welcome, Jane".
export function firstName(name?: string | null): string | null {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}
