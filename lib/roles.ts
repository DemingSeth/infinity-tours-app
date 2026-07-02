// Central host-role helpers. Route admin ACCESS checks through these so adding a
// future `super_admin` tier is a one-function change instead of scattered string
// comparisons. Note: this covers the host account role (tour_hosts.role) — it is
// unrelated to the participant persona roles (coordinator/teacher/driver/student)
// in lib/types.ts.
//
// Do NOT use these for role WRITES/assignments, host-only checks (role === "host"),
// or the participant-persona system — only for admin gating.
export type Role = "host" | "admin" | "super_admin";

// True for any admin-level role. A super_admin is a strict superset of admin, so
// it passes every admin gate.
export function isAdmin(role?: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === "super_admin";
}
