"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, calcRoster, calcRooms } from "@/lib/helpers";
import type { TourMemberRow, TourNoteRow, NotePriority } from "@/lib/types";

// ─── Shared micro-components ──────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  bus:    "M3 8h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm0 0V6a2 2 0 012-2h14a2 2 0 012 2v2M7 18v2m10-2v2M3 12h18",
  bed:    "M3 9v8a2 2 0 002 2h14a2 2 0 002-2V9M3 9h18M3 9a2 2 0 012-2h14a2 2 0 012 2M9 9V7a3 3 0 016 0v2",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
};
const I = ({ n, s = 16, c }: { n: string; s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c ?? "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={ICONS[n] ?? ""} />
  </svg>
);

const inp: React.CSSProperties = {
  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "#1e293b", fontFamily: "inherit",
  background: "#fff", outline: "none", boxSizing: "border-box",
};

const Field = ({ label, children, half, third }: { label?: string; children: React.ReactNode; half?: boolean; third?: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: third ? "0 0 31%" : half ? "0 0 48%" : "1 1 100%" }}>
    {label && <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
    {children}
  </div>
);

// ─── Timestamped notes log ────────────────────────────────────────────────────
// Multiple dated notes per tour, each minimizable (July 2026 request). Collapsed
// entries show the date + a first-line preview; click to expand. The legacy
// free-text Notes field on the Trip Details card is unchanged.

function noteDateLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Priority tag styling (Low / Medium / High). Medium is the default and reads
// as neutral; High is red, Low is muted.
const PRIORITY_META: Record<NotePriority, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Low",    color: "#475569", bg: "#f1f5f9", border: "#e2e8f0" },
  medium: { label: "Medium", color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
  high:   { label: "High",   color: "#b91c1c", bg: "#fee2e2", border: "#fecaca" },
};
const PRIORITY_ORDER: NotePriority[] = ["low", "medium", "high"];

function NotesLog({ tourId, isOwner }: { tourId: string; isOwner: boolean }) {
  const [notes, setNotes] = useState<TourNoteRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<NotePriority>("medium");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await createClient()
        .from("tour_notes").select("*").eq("tour_id", tourId)
        .order("created_at", { ascending: false });
      if (active && data) setNotes(data as TourNoteRow[]);
    })();
    return () => { active = false; };
  }, [tourId]);

  async function addNote() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tour_notes")
      .insert({ tour_id: tourId, text, priority: draftPriority, created_by: user?.id ?? null })
      .select().single();
    setSaving(false);
    if (error || !data) {
      console.error("[tour_notes.insert] failed", error?.message);
      if (typeof window !== "undefined") window.alert(`Could not save note: ${error?.message ?? "permission denied"}`);
      return;
    }
    setNotes(prev => [data as TourNoteRow, ...prev]);
    setExpanded(prev => ({ ...prev, [(data as TourNoteRow).id]: true }));
    setDraft("");
    setDraftPriority("medium");
    setAdding(false);
  }

  async function changePriority(id: string, priority: NotePriority) {
    const prev = notes;
    setNotes(cur => cur.map(n => n.id === id ? { ...n, priority } : n));
    const { error } = await createClient().from("tour_notes").update({ priority }).eq("id", id);
    if (error) {
      console.error("[tour_notes.priority] failed", error.message);
      setNotes(prev); // roll back
    }
  }

  async function deleteNote(id: string) {
    const { error } = await createClient().from("tour_notes").delete().eq("id", id);
    if (error) {
      console.error("[tour_notes.delete] failed", error.message);
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 400, color: BRAND.navy, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
          Notes Log
        </span>
        {isOwner && !adding && (
          <button onClick={() => setAdding(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", color: BRAND.navy, border: `1.5px solid ${BRAND.navy}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={12} /> Add Note
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="What happened / what to remember (a timestamp is added automatically)…"
            style={{ ...inp, resize: "vertical", minHeight: 80 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Priority</span>
              {PRIORITY_ORDER.map(p => {
                const m = PRIORITY_META[p];
                const active = draftPriority === p;
                return (
                  <button key={p} type="button" onClick={() => setDraftPriority(p)}
                    style={{ padding: "4px 12px", borderRadius: 999, border: `1.5px solid ${active ? m.color : "#e2e8f0"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#94a3b8", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setAdding(false); setDraft(""); setDraftPriority("medium"); }}
              style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={addNote} disabled={saving || !draft.trim()}
              style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: saving || !draft.trim() ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          No dated notes yet. Notes added here keep their timestamp so you can track when each one was entered.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {notes.map(n => {
          const isOpen = !!expanded[n.id];
          const firstLine = (n.text.split("\n")[0] || "").slice(0, 80);
          const pr = PRIORITY_META[(n.priority ?? "medium") as NotePriority] ?? PRIORITY_META.medium;
          return (
            <div key={n.id} style={{ border: "1px solid #eef2f7", borderRadius: 9, overflow: "hidden", borderLeft: `3px solid ${pr.color}` }}>
              <div
                onClick={() => setExpanded(prev => ({ ...prev, [n.id]: !isOpen }))}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#fafbff", cursor: "pointer" }}
              >
                {isOpen ? <ChevronDown size={14} color="#94a3b8" style={{ flexShrink: 0 }} /> : <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.blue, flexShrink: 0 }}>{noteDateLabel(n.created_at)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: pr.bg, border: `1px solid ${pr.border}`, borderRadius: 999, padding: "1px 8px", flexShrink: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>{pr.label}</span>
                {!isOpen && (
                  <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {firstLine}
                  </span>
                )}
                {isOwner && (
                  <button title="Delete note" onClick={e => { e.stopPropagation(); deleteNote(n.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: 2, display: "flex", marginLeft: "auto", flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {isOpen && (
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {n.text}
                  </div>
                  {isOwner && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>Priority</span>
                      {PRIORITY_ORDER.map(p => {
                        const m = PRIORITY_META[p];
                        const active = (n.priority ?? "medium") === p;
                        return (
                          <button key={p} type="button" onClick={() => changePriority(n.id, p)}
                            style={{ padding: "3px 10px", borderRadius: 999, border: `1.5px solid ${active ? m.color : "#e2e8f0"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#94a3b8", fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tour: any;
  members: TourMemberRow[];
  isOwner: boolean;
  onChange: (patch: Record<string, any>) => void;
}

export default function OverviewTab({ tour, members, isOwner, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const f = (patch: Record<string, any>) => setForm(p => ({ ...p, ...patch }));

  const startEdit = () => {
    setForm({
      name: tour.name ?? "",
      school: tour.school ?? "",
      contact_name: tour.contact_name ?? "",
      contact_email: tour.contact_email ?? "",
      contact_phone: tour.contact_phone ?? "",
      destination: tour.destination ?? "",
      alt_destination: tour.alt_destination ?? "",
      dates: tour.dates ?? "",
      start_date: tour.start_date ?? "",
      end_date: tour.end_date ?? "",
      date_flexible: tour.date_flexible ?? false,
      bus_company: tour.bus_company ?? "",
      bus_driver_contact: { name: tour.bus_driver_contact?.name ?? "", phone: tour.bus_driver_contact?.phone ?? "" },
      bus_capacity: tour.bus_capacity ?? 55,
      room_config: { boysPerRoom: tour.room_config?.boysPerRoom ?? 4, girlsPerRoom: tour.room_config?.girlsPerRoom ?? 4 },
      activities: tour.activities ?? [],
      notes: tour.notes ?? "",
      planning_tour_host: tour.planning_tour_host ?? "",
      traveling_tour_host: tour.traveling_tour_host ?? "",
    });
    setEditing(true);
  };

  const save = () => {
    // Normalize the bus fields: empty → null so Trip Information shows a dash and
    // never stores empty objects/strings.
    const driverName = (form.bus_driver_contact?.name || "").trim();
    const driverPhone = (form.bus_driver_contact?.phone || "").trim();
    onChange({
      ...form,
      bus_company: (form.bus_company || "").trim() || null,
      bus_driver_contact: driverName || driverPhone ? { name: driverName || null, phone: driverPhone || null } : null,
    });
    setEditing(false);
  };

  const calc  = calcRoster(members, tour.bus_capacity ?? 55);
  const rooms = calcRooms(members, tour.room_config ?? { boysPerRoom: 4, girlsPerRoom: 4 });

  const stats = [
    { l: "Students",     v: calc.students.length,   icon: "users", col: "#1a4d5c" },
    { l: "Chaperones",   v: calc.chaperones.length,  icon: "users", col: "#0d9488" },
    { l: "Tour Hosts",   v: calc.hosts.length,        icon: "star",  col: "#92400e" },
    { l: "Buses Needed", v: calc.busesNeeded,         icon: "bus",   col: "#6366f1" },
    { l: "Hotel Rooms",  v: rooms.totalRooms,         icon: "bed",   col: "#0369a1" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Timestamped, minimizable notes log */}
      <NotesLog tourId={tour.id} isOwner={isOwner} />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
        {stats.map(s => (
          <div key={s.l} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: "14px 12px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <I n={s.icon} s={16} c={s.col} />
            <div style={{ fontSize: 20, fontWeight: 700, color: s.col, marginTop: 5 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Trip details card */}
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 400, color: BRAND.navy, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>Trip Details</span>
          {isOwner && !editing && (
            <button onClick={startEdit} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", color: BRAND.navy, border: `1.5px solid ${BRAND.navy}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <I n="edit" s={12} />Edit
            </button>
          )}
          {editing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={save} style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", fontSize: 13 }}>
            {[
              ["Tour Name",        tour.name],
              ["School",           tour.school],
              ["Contact",          tour.contact_name],
              ["Email",            tour.contact_email],
              ["Phone",            tour.contact_phone],
              ["Destination",      tour.destination],
              ["Alt Destination",  tour.alt_destination || "—"],
              ["Dates",            tour.dates],
              ["Start Date",       tour.start_date || "—"],
              ["End Date",         tour.end_date || "—"],
              ["Date Flexible",    tour.date_flexible ? "Yes" : "No"],
              ["Tour Consultant",  tour.planning_tour_host || "—"],
              ["Tour Host",        tour.traveling_tour_host || "—"],
              ["Bus Company",      tour.bus_company || "—"],
              ["Bus Driver Contact", [tour.bus_driver_contact?.name, tour.bus_driver_contact?.phone].filter(Boolean).join(" · ") || "—"],
              ["Bus Capacity",     `${tour.bus_capacity ?? 55} seats`],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
                <div style={{ color: "#1e293b", marginTop: 1 }}>{v ?? "—"}</div>
              </div>
            ))}
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Activities</div>
              <div style={{ color: "#1e293b" }}>{tour.activities?.join(", ") || "—"}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Notes</div>
              <div style={{ color: "#1e293b", whiteSpace: "pre-wrap" }}>{tour.notes || "—"}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="Tour Name">
              <input style={inp} value={form.name} onChange={e => f({ name: e.target.value })} />
            </Field>
            <Field label="School Name">
              <input style={inp} value={form.school} onChange={e => f({ school: e.target.value })} />
            </Field>
            <Field label="Contact Name" half>
              <input style={inp} value={form.contact_name} onChange={e => f({ contact_name: e.target.value })} />
            </Field>
            <Field label="Contact Email" half>
              <input style={inp} value={form.contact_email} onChange={e => f({ contact_email: e.target.value })} />
            </Field>
            <Field label="Contact Phone" half>
              <input style={inp} value={form.contact_phone} onChange={e => f({ contact_phone: e.target.value })} />
            </Field>
            <Field label="Destination" half>
              <input style={inp} value={form.destination} onChange={e => f({ destination: e.target.value })} />
            </Field>
            <Field label="Alt. Destination" half>
              <input style={inp} value={form.alt_destination} onChange={e => f({ alt_destination: e.target.value })} />
            </Field>
            <Field label="Dates" half>
              <input style={inp} value={form.dates} onChange={e => f({ dates: e.target.value })} />
            </Field>
            <Field label="Start Date" half>
              <input style={inp} type="date" value={form.start_date || ""} onChange={e => f({ start_date: e.target.value || null })} />
            </Field>
            <Field label="End Date" half>
              <input style={inp} type="date" value={form.end_date || ""} onChange={e => f({ end_date: e.target.value || null })} />
            </Field>
            <Field label="Tour Consultant" half>
              <input style={inp} value={form.planning_tour_host} onChange={e => f({ planning_tour_host: e.target.value })} />
            </Field>
            <Field label="Tour Host" half>
              <input style={inp} value={form.traveling_tour_host} onChange={e => f({ traveling_tour_host: e.target.value })} />
            </Field>
            <Field label="Bus Company" half>
              <input style={inp} value={form.bus_company} onChange={e => f({ bus_company: e.target.value })} placeholder="e.g. Holiday Motor Coach, LLC" />
            </Field>
            <Field label="Bus Driver Contact — Name" half>
              <input style={inp} value={form.bus_driver_contact?.name ?? ""} onChange={e => f({ bus_driver_contact: { ...form.bus_driver_contact, name: e.target.value } })} placeholder="Driver name (host-only)" />
            </Field>
            <Field label="Bus Driver Contact — Phone" half>
              <input style={inp} type="tel" value={form.bus_driver_contact?.phone ?? ""} onChange={e => f({ bus_driver_contact: { ...form.bus_driver_contact, phone: e.target.value } })} placeholder="Driver phone (host-only)" />
            </Field>
            <Field label="Bus Capacity" third>
              <input style={inp} type="number" value={form.bus_capacity} onChange={e => f({ bus_capacity: parseInt(e.target.value) || 1 })} />
            </Field>
            <Field label="Boys per Room" third>
              <input style={inp} type="number" value={form.room_config?.boysPerRoom ?? 4} onChange={e => f({ room_config: { ...form.room_config, boysPerRoom: parseInt(e.target.value) || 1 } })} />
            </Field>
            <Field label="Girls per Room" third>
              <input style={inp} type="number" value={form.room_config?.girlsPerRoom ?? 4} onChange={e => f({ room_config: { ...form.room_config, girlsPerRoom: parseInt(e.target.value) || 1 } })} />
            </Field>
            <Field label="Date Flexible">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.date_flexible} onChange={e => f({ date_flexible: e.target.checked })} style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
                Dates are flexible
              </label>
            </Field>
            <Field label="Activities (one per line)">
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 72 }}
                value={form.activities?.join("\n") ?? ""}
                onChange={e => f({ activities: e.target.value.split("\n").filter(Boolean) })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 72 }}
                value={form.notes}
                onChange={e => f({ notes: e.target.value })}
              />
            </Field>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
