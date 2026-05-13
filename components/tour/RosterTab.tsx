"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, MEMBER_TYPES, calcRoster, calcRooms } from "@/lib/helpers";
import { I, INP, Field, Inp, Tex, Sel, Btn, Modal } from "@/components/tour/ui";
import type { TourRow, TourMemberRow } from "@/lib/types";

const TYPE_STYLE: Record<string, { background: string; color: string }> = {
  student:     { background: "#e0f2fe", color: "#0369a1" },
  chaperone:   { background: "#f0fdf4", color: "#166534" },
  "tour-host": { background: "#fef3c7", color: "#92400e" },
  teacher:     { background: "#fef3c7", color: "#92400e" },
  driver:      { background: "#f3e8ff", color: "#6b21a8" },
};

interface Props {
  tour: TourRow;
  members: TourMemberRow[];
  isOwner: boolean;
  onMembersChange: (members: TourMemberRow[]) => void;
}

export default function RosterTab({ tour, members, onMembersChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [form, setForm] = useState({ name: "", type: "student", gender: "female", waiver: false, notes: "" });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [saving, setSaving] = useState(false);

  const calc  = calcRoster(members, tour.bus_capacity);
  const rooms = calcRooms(members, tour.room_config);

  const filtered = members.filter(m => {
    const byName = m.name.toLowerCase().includes(search.toLowerCase());
    const byType = filterType === "all" || m.type === filterType || (filterType === "no-waiver" && !m.waiver);
    return byName && byType;
  });

  const pendingWaivers = members.filter(m => m.type === "student" && !m.waiver).length;

  async function addMember() {
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.from("tour_members").insert({
      tour_id: tour.id,
      name: form.name.trim(),
      type: form.type,
      gender: form.gender,
      waiver: form.waiver,
      notes: form.notes || null,
      sort_order: members.length + 1,
    }).select().single();
    if (data) onMembersChange([...members, data]);
    setForm({ name: "", type: "student", gender: "female", waiver: false, notes: "" });
    setShowAdd(false);
    setSaving(false);
  }

  async function importCsv() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    const supabase = createClient();
    const inserts = lines.map((l, i) => {
      const parts = l.split(",").map(s => s.trim());
      return {
        tour_id: tour.id,
        name: parts[0] || "",
        type: "student" as const,
        gender: parts[1]?.toLowerCase() || "female",
        waiver: false,
        notes: parts[2] || null,
        sort_order: members.length + i + 1,
      };
    }).filter(r => r.name);
    const { data } = await supabase.from("tour_members").insert(inserts).select();
    if (data) onMembersChange([...members, ...data]);
    setCsvText("");
    setShowCsv(false);
    setSaving(false);
  }

  async function toggleWaiver(member: TourMemberRow) {
    const supabase = createClient();
    await supabase.from("tour_members").update({ waiver: !member.waiver }).eq("id", member.id);
    onMembersChange(members.map(m => m.id === member.id ? { ...m, waiver: !m.waiver } : m));
  }

  async function removeMember(id: string) {
    const supabase = createClient();
    await supabase.from("tour_members").delete().eq("id", id);
    onMembersChange(members.filter(m => m.id !== id));
  }

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { l: "Students",   v: calc.students.length,   col: "#0369a1" },
          { l: "Chaperones", v: calc.chaperones.length,  col: "#166534" },
          { l: "Hosts",      v: calc.hosts.length,       col: "#92400e" },
          { l: "Drivers",    v: calc.drivers.length,     col: "#6b21a8" },
          { l: "Bus Riders", v: calc.busRiders,          col: "#1e40af" },
          { l: "Buses",      v: calc.busesNeeded,        col: "#6366f1" },
          { l: "Rooms",      v: rooms.totalRooms,        col: "#0d9488" },
        ].map(s => (
          <div key={s.l} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 9, padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Planning summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, fontSize: 12 }}>
        <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 9, padding: "10px 12px" }}>
          <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>Bus Planning</div>
          <div style={{ color: "#1e40af" }}>
            {calc.busRiders} riders · {tour.bus_capacity} seats/bus · <strong>{calc.busesNeeded} bus{calc.busesNeeded !== 1 ? "es" : ""} needed</strong>
          </div>
          <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>Count includes all non-driver travelers</div>
        </div>
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 9, padding: "10px 12px" }}>
          <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 3 }}>Room Planning</div>
          <div style={{ color: "#065f46" }}>
            {rooms.girls} girls → {rooms.girlRooms} room{rooms.girlRooms !== 1 ? "s" : ""} · {rooms.boys} boys → {rooms.boyRooms} room{rooms.boyRooms !== 1 ? "s" : ""}
          </div>
          <div style={{ color: "#64748b", marginTop: 2, fontSize: 11 }}>
            {tour.room_config?.girlsPerRoom || 4}/room girls · {tour.room_config?.boysPerRoom || 4}/room boys
          </div>
        </div>
      </div>

      {/* Waiver warning */}
      {pendingWaivers > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 9, padding: "9px 14px", fontSize: 12, color: "#92400e", marginBottom: 12, display: "flex", gap: 7, alignItems: "center" }}>
          <I n="warn" s={13} />
          {pendingWaivers} student waiver{pendingWaivers > 1 ? "s" : ""} still pending
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input style={{ ...INP, flex: 1, minWidth: 160 }} placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        <Sel
          value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ width: 160 }}
          options={[
            { value: "all",       label: "All" },
            { value: "student",   label: "Students" },
            { value: "chaperone", label: "Chaperones" },
            { value: "tour-host", label: "Tour Hosts" },
            { value: "teacher",   label: "Teachers" },
            { value: "driver",    label: "Drivers" },
            { value: "no-waiver", label: "Missing waiver" },
          ]}
        />
        <Btn onClick={() => setShowCsv(true)} variant="muted" small><I n="upload" s={12} />Import CSV</Btn>
        <Btn onClick={() => setShowAdd(true)} small><I n="plus" s={12} />Add</Btn>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f1f5f9", background: "#f8fafc" }}>
              {["Name", "Type", "Gender", "Waiver", "Notes", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#cbd5e1", padding: "28px 0", fontSize: 12 }}>
                  {members.length === 0 ? "No travelers yet. Add your first." : "No travelers match."}
                </td>
              </tr>
            )}
            {filtered.map((m, i) => {
              const ts = TYPE_STYLE[m.type] || { background: "#f1f5f9", color: "#475569" };
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f2233" }}>{m.name}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ ...ts, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 5 }}>
                      {MEMBER_TYPES.find(t => t.value === m.type)?.label || m.type}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#64748b", textTransform: "capitalize" }}>{m.gender || "-"}</td>
                  <td style={{ padding: "9px 12px" }}>
                    {m.type === "student" ? (
                      <button onClick={() => toggleWaiver(m)}
                        style={{ background: m.waiver ? "#dcfce7" : "#fee2e2", color: m.waiver ? "#166534" : "#b91c1c", border: "none", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {m.waiver ? "Signed" : "Pending"}
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#64748b", fontSize: 11 }}>{m.notes || <span style={{ color: "#e2e8f0" }}>-</span>}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <button onClick={() => removeMember(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: 2 }}>
                      <I n="trash" s={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add member modal */}
      {showAdd && (
        <Modal title="Add Traveler" onClose={() => setShowAdd(false)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="Full Name">
              <Inp value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="First Last" autoFocus />
            </Field>
            <Field label="Type" half>
              <Sel value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                options={MEMBER_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            </Field>
            <Field label="Gender" half>
              <Sel value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]} />
            </Field>
            <Field label="Notes">
              <Inp value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Allergies, room preference..." />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", width: "100%" }}>
              <input type="checkbox" checked={form.waiver} onChange={e => setForm(p => ({ ...p, waiver: e.target.checked }))} style={{ accentColor: BRAND.navy }} />
              Waiver signed
            </label>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <Btn onClick={() => setShowAdd(false)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={addMember} disabled={saving} style={{ flex: 1 }}>Add Traveler</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV import modal */}
      {showCsv && (
        <Modal title="Import from CSV / Google Sheet Paste" onClose={() => setShowCsv(false)}>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
            One row per person. Format: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>Full Name, gender, notes</code>
          </p>
          <Tex value={csvText} onChange={e => setCsvText(e.target.value)} style={{ minHeight: 140, fontFamily: "monospace", fontSize: 12 }}
            placeholder={"Ava Christensen, female, vegetarian\nBrody Larsen, male\nCami Petersen, female, nut allergy"} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => setShowCsv(false)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={importCsv} disabled={saving} style={{ flex: 1 }}>
              Import {csvText.trim().split("\n").filter(Boolean).length} Travelers
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
