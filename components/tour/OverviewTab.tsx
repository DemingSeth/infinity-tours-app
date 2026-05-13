"use client";

import { useState } from "react";
import { BRAND, calcRoster, calcRooms } from "@/lib/helpers";
import type { TourMemberRow } from "@/lib/types";

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
      school: tour.school ?? "",
      contact_name: tour.contact_name ?? "",
      contact_email: tour.contact_email ?? "",
      contact_phone: tour.contact_phone ?? "",
      destination: tour.destination ?? "",
      alt_destination: tour.alt_destination ?? "",
      dates: tour.dates ?? "",
      date_flexible: tour.date_flexible ?? false,
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
    onChange(form);
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
          <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Trip Details</span>
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
              ["School",           tour.school],
              ["Contact",          tour.contact_name],
              ["Email",            tour.contact_email],
              ["Phone",            tour.contact_phone],
              ["Destination",      tour.destination],
              ["Alt Destination",  tour.alt_destination || "—"],
              ["Dates",            tour.dates],
              ["Date Flexible",    tour.date_flexible ? "Yes" : "No"],
              ["Planning Host",    tour.planning_tour_host || "—"],
              ["Traveling Host",   tour.traveling_tour_host || "—"],
              ["Bus Capacity",     `${tour.bus_capacity ?? 55} seats`],
              ["Boys/Room",        tour.room_config?.boysPerRoom ?? 4],
              ["Girls/Room",       tour.room_config?.girlsPerRoom ?? 4],
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
            <Field label="Planning Host" half>
              <input style={inp} value={form.planning_tour_host} onChange={e => f({ planning_tour_host: e.target.value })} />
            </Field>
            <Field label="Traveling Host" half>
              <input style={inp} value={form.traveling_tour_host} onChange={e => f({ traveling_tour_host: e.target.value })} />
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
