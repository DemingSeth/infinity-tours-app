"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BRAND, initialsFrom } from "@/lib/helpers";
import type { AdminUserRow, HostRole } from "@/lib/types";
import type { ActionResult } from "@/lib/invites";
import { inviteUser, resendInvite, revokeInvite, setUserActive, setUserRole } from "./actions";

const ROLE_LABELS: Record<HostRole, string> = {
  host: "Host",
  admin: "Admin",
  super_admin: "Super admin",
};

const ROLE_HINTS: Record<HostRole, string> = {
  host: "Runs their own tours.",
  admin: "Runs tours, plus the Quote Builder and this screen.",
  super_admin: "Everything an admin can do, plus managing other super admins.",
};

type Msg = { ok: boolean; text: string };

// The three states a row can be in, in the order they are tested. Deactivated
// wins over everything: an account turned off before it was ever accepted is off,
// not pending.
type Status = "Deactivated" | "Invitation pending" | "Active";

function statusOf(row: AdminUserRow): Status {
  if (!row.is_active) return "Deactivated";
  if (!row.last_sign_in_at) return "Invitation pending";
  return "Active";
}

export default function AdminUsersClient({
  rows,
  viewerId,
  viewerIsSuperAdmin,
  loadError,
}: {
  rows: AdminUserRow[];
  viewerId: string;
  viewerIsSuperAdmin: boolean;
  loadError: string | null;
}) {
  const router = useRouter();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [rosterMsg, setRosterMsg] = useState<Msg | null>(null);
  // The table renders the server's rows directly. After a change lands, a refresh
  // re-reads admin_list_users() rather than the screen patching a local copy, so
  // what is on screen is always what the database actually holds.
  const [refreshing, startRefresh] = useTransition();

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<HostRole>("host");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<Msg | null>(null);

  const roleOptions: HostRole[] = viewerIsSuperAdmin
    ? ["host", "admin", "super_admin"]
    : ["host", "admin"];

  // Every roster action funnels through here so exactly one row can be in flight
  // and the server's own wording is what gets shown. The RPCs raise plain
  // language exceptions ("You cannot change your own role", "Only a super admin
  // can change super admin access") and those are surfaced as written rather than
  // replaced with a generic failure line.
  async function run(rowId: string, action: () => Promise<ActionResult>, success?: string) {
    if (busyId) return;
    setBusyId(rowId);
    setRosterMsg(null);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setRosterMsg({ ok: false, text: result.error });
      return;
    }
    setRosterMsg({ ok: true, text: success ?? result.message });
    startRefresh(() => router.refresh());
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviting) return;
    setInviteMsg(null);
    if (!inviteEmail.trim()) {
      setInviteMsg({ ok: false, text: "Enter an email address to send an invitation to." });
      return;
    }
    setInviting(true);
    const result = await inviteUser({
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
      phone: invitePhone,
    });
    setInviting(false);
    if (!result.ok) {
      setInviteMsg({ ok: false, text: result.error });
      return;
    }
    setInviteName("");
    setInviteEmail("");
    setInvitePhone("");
    setInviteRole("host");
    setInviteMsg({ ok: true, text: result.message });
    startRefresh(() => router.refresh());
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={pageTitle}>Team Access</h1>

      {/* Invite */}
      <section style={card}>
        <h2 style={sectionTitle}>Invite a team member</h2>
        <p style={helpText}>
          They get an email with a link to choose their own password, and appear below as a pending
          invitation until they use it. {ROLE_HINTS[inviteRole]}
        </p>

        <form onSubmit={sendInvite} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 180px", minWidth: 160 }}>
            <label style={fieldLabel}>Full name</label>
            <input
              style={inp}
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              placeholder="Jane Roberts"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 210px", minWidth: 190 }}>
            <label style={fieldLabel}>Email</label>
            <input
              style={inp}
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="jane@infinitytours.us"
              autoComplete="off"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "0 1 150px", minWidth: 130 }}>
            <label style={fieldLabel}>Phone</label>
            <input
              style={inp}
              type="tel"
              value={invitePhone}
              onChange={e => setInvitePhone(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "0 1 160px", minWidth: 140 }}>
            <label style={fieldLabel}>Access level</label>
            <select
              style={inp}
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as HostRole)}
            >
              {roleOptions.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={inviting} style={btn(inviting)}>
            {inviting ? "Sending..." : "Send invitation"}
          </button>
        </form>

        {inviteMsg && <div style={{ marginTop: 12 }}><Notice {...inviteMsg} /></div>}
      </section>

      {/* Roster */}
      <section style={card}>
        <h2 style={sectionTitle}>Team ({rows.length})</h2>

        {loadError && <div style={{ marginBottom: 12 }}><Notice ok={false} text={loadError} /></div>}
        {rosterMsg && <div style={{ marginBottom: 12 }}><Notice {...rosterMsg} /></div>}

        {rows.length === 0 && !loadError ? (
          <p style={helpText}>Nobody on the team yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={th}>Person</th>
                  <th style={th}>Access level</th>
                  <th style={th}>Status</th>
                  <th style={th}>Last sign in</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const isSelf = row.id === viewerId;
                  const targetIsSuper = row.role === "super_admin";
                  // A super admin row is untouchable unless the viewer is one
                  // too, and nobody edits their own role or access. Both rules
                  // live inside the RPCs; mirroring them here keeps the screen
                  // from offering a control that can only fail.
                  const locked = isSelf || (targetIsSuper && !viewerIsSuperAdmin);
                  const saving = busyId === row.id;
                  // Controls stay locked through the follow-up refresh too, so
                  // nobody fires a second change at a row still in flight.
                  const busy = saving || refreshing || busyId !== null;
                  const status = statusOf(row);
                  const pending = status === "Invitation pending";

                  return (
                    <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9", opacity: row.is_active ? 1 : 0.65 }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={avatar}>{row.initials || initialsFrom(row.name, "TH")}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>
                              {row.name}
                              {isSelf && <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}> (you)</span>}
                            </span>
                            <span style={{ fontSize: 12, color: "#64748b" }}>{row.email}</span>
                          </div>
                        </div>
                      </td>

                      <td style={td}>
                        {locked ? (
                          <span style={{ color: "#64748b" }}>{ROLE_LABELS[row.role]}</span>
                        ) : (
                          <select
                            value={row.role}
                            disabled={busy}
                            onChange={e => {
                              const next = e.target.value as HostRole;
                              if (next === row.role) return;
                              run(row.id, () => setUserRole(row.id, next),
                                `${row.name} is now ${ROLE_LABELS[next].toLowerCase()}.`);
                            }}
                            style={{ ...inp, padding: "6px 9px", fontSize: 13, width: "auto", cursor: busy ? "wait" : "pointer" }}
                          >
                            {roleOptions.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td style={td}>
                        <span style={pill(status)}>{status}</span>
                      </td>

                      <td style={{ ...td, color: "#64748b", whiteSpace: "nowrap" }}>
                        {row.last_sign_in_at
                          ? formatStamp(row.last_sign_in_at)
                          : row.invited_at
                            ? `Invited ${formatStamp(row.invited_at)}`
                            : "Never"}
                      </td>

                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {locked ? (
                          <span style={{ fontSize: 12, color: "#cbd5e1" }}>-</span>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                            {/* Resending and withdrawing both destroy and rebuild
                                the account, so they are only offered while it has
                                never been signed in to. The server checks this
                                again before it deletes anything. */}
                            {pending && (
                              <>
                                <button
                                  onClick={() => run(row.id, () => resendInvite(row.id))}
                                  disabled={busy}
                                  style={linkBtn(busy, BRAND.blue)}
                                >
                                  {saving ? "Working..." : "Resend invitation"}
                                </button>
                                <button
                                  onClick={() => run(row.id, () => revokeInvite(row.id))}
                                  disabled={busy}
                                  style={linkBtn(busy, "#b91c1c")}
                                >
                                  Withdraw
                                </button>
                              </>
                            )}
                            {!pending && (
                              <button
                                onClick={() =>
                                  run(row.id, () => setUserActive(row.id, !row.is_active),
                                    row.is_active
                                      ? `${row.name} can no longer sign in.`
                                      : `${row.name} can sign in again.`)
                                }
                                disabled={busy}
                                style={linkBtn(busy, row.is_active ? "#b91c1c" : BRAND.blue)}
                              >
                                {saving ? "Working..." : row.is_active ? "Turn off access" : "Turn access back on"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Notice({ ok, text }: Msg) {
  return (
    <div style={{
      background: ok ? "#dcfce7" : "#fee2e2",
      color: ok ? "#15803d" : "#b91c1c",
      borderRadius: 8, padding: "9px 13px", fontSize: 13, lineHeight: 1.5,
    }}>
      {text}
    </div>
  );
}

// auth.users timestamps are full timestamptz values, so they get a short
// date-and-time render rather than the DATE-column formatter in lib/helpers.
//
// timeZone is pinned to UTC on purpose. Without it the server renders in the
// server's zone and the browser re-renders in the visitor's, the two strings
// disagree, and React reports a hydration mismatch on a page that is otherwise
// entirely static.
function formatStamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

const pageTitle: React.CSSProperties = {
  fontFamily: "'Fjalla One', Georgia, sans-serif",
  letterSpacing: "0.03em",
  fontSize: 24,
  fontWeight: 400,
  color: BRAND.navy,
  margin: 0,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1.5px solid #e8eef4",
  borderRadius: 14,
  padding: 20,
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Fjalla One', Georgia, sans-serif",
  letterSpacing: "0.03em",
  fontSize: 15,
  fontWeight: 700,
  color: BRAND.navy,
  margin: "0 0 14px",
};

const helpText: React.CSSProperties = {
  fontSize: 13,
  color: "#64748b",
  lineHeight: 1.5,
  margin: "0 0 14px",
};

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: 0.8,
};

const inp: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#1e293b",
  fontFamily: "inherit",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  padding: "0 12px 10px 0",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  fontSize: 13,
  color: "#1e293b",
  padding: "12px 12px 12px 0",
  verticalAlign: "middle",
};

const avatar: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: BRAND.blue,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  flexShrink: 0,
};

const STATUS_COLORS: Record<Status, { bg: string; fg: string }> = {
  Active: { bg: "#ecfdf5", fg: "#065f46" },
  "Invitation pending": { bg: "#fef3c7", fg: "#92400e" },
  Deactivated: { bg: "#f3f4f6", fg: "#374151" },
};

function pill(status: Status): React.CSSProperties {
  const { bg, fg } = STATUS_COLORS[status];
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    background: bg,
    color: fg,
    whiteSpace: "nowrap",
  };
}

function btn(busy: boolean): React.CSSProperties {
  return {
    background: BRAND.navy,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.7 : 1,
    fontFamily: "inherit",
  };
}

function linkBtn(busy: boolean, color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    padding: 0,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    color: busy ? "#94a3b8" : color,
    cursor: busy ? "wait" : "pointer",
    whiteSpace: "nowrap",
  };
}
