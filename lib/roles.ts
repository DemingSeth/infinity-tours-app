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

// Client-side mirror of the can_edit_tour() database function (the RLS policies
// are the real gate; this only decides what the UI offers). A viewer may edit a
// tour when they own it, are an admin, or are listed on it as a Tour Host or
// Tour Consultant: matched by the account id the staff dropdown stores, with an
// email fallback (consultant contact) and an exact-name fallback for entries
// saved before ids existed.
export interface EditorViewer {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

export function canEditTour(
  tour: {
    tour_host_id?: string | null;
    consultants?: { id?: string | null; name?: string; contact?: string | null }[] | null;
    tour_hosts_list?: { id?: string | null; name?: string; contact?: string | null }[] | null;
  },
  viewer: EditorViewer | null | undefined,
): boolean {
  if (!viewer?.id) return false;
  if (tour.tour_host_id === viewer.id) return true;
  if (isAdmin(viewer.role)) return true;
  const email = (viewer.email ?? "").trim().toLowerCase();
  const name = (viewer.name ?? "").trim();
  const listed = [...(tour.consultants ?? []), ...(tour.tour_hosts_list ?? [])];
  return listed.some(p => {
    if (!p) return false;
    if (p.id && p.id === viewer.id) return true;
    if (email && (p.contact ?? "").trim().toLowerCase() === email) return true;
    if (name && (p.name ?? "").trim() === name) return true;
    return false;
  });
}

// True when the viewer appears in a PersonRef list: matched by the account id the
// staff dropdown stores, with an email fallback (consultant contact) and an
// exact-name fallback for entries saved before ids existed. Same matching rules
// as canEditTour(), factored out so the overview can ask about one list at a time.
export function personListIncludes(
  list: { id?: string | null; name?: string; contact?: string | null }[] | null | undefined,
  viewer: EditorViewer | null | undefined,
): boolean {
  if (!viewer?.id || !list?.length) return false;
  const email = (viewer.email ?? "").trim().toLowerCase();
  const name = (viewer.name ?? "").trim();
  return list.some(p => {
    if (!p) return false;
    if (p.id && p.id === viewer.id) return true;
    if (email && (p.contact ?? "").trim().toLowerCase() === email) return true;
    if (name && (p.name ?? "").trim() === name) return true;
    return false;
  });
}

// Overview scoping (September 2026 request): a non-admin sees only the tours they
// are actually working — listed as a Tour Consultant, listed or assigned as the
// Tour Host, or the owner of the record. Deliberately has NO admin bypass: the
// overview decides separately that admins are never scoped, so this stays usable
// as a plain "is this viewer on this tour" test (for example, the future
// consultant-only variant Amy asked about).
export function isViewerOnTour(
  tour: {
    tour_host_id?: string | null;
    consultants?: { id?: string | null; name?: string; contact?: string | null }[] | null;
    tour_hosts_list?: { id?: string | null; name?: string; contact?: string | null }[] | null;
  },
  viewer: EditorViewer | null | undefined,
): boolean {
  if (!viewer?.id) return false;
  if (tour.tour_host_id === viewer.id) return true;
  return personListIncludes(tour.consultants, viewer) || personListIncludes(tour.tour_hosts_list, viewer);
}
