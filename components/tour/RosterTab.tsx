"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BRAND, MEMBER_TYPES, calcRoster, calcRooms,
  activePersonaKeys, personaLabel, personaColors, getPersona,
  visibleRosterPersonas, expectedCountForPersona,
} from "@/lib/helpers";
import { I, Field, Inp, Tex, Sel, Btn, Modal } from "@/components/tour/ui";
import type { TourRow, TourMemberRow, MemberType, Role } from "@/lib/types";

// Sections with more than this many entries start collapsed (larger groups).
const COLLAPSE_THRESHOLD = 8;

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

type CustomRow = { key: string; value: string };
interface MemberForm {
  name: string;
  type: MemberType;
  gender: string;
  waiver: boolean;
  dietary: string;
  allergies: string;
  notes: string;
  custom: CustomRow[];
}

const emptyForm = (type: MemberType): MemberForm => ({
  name: "", type, gender: "female", waiver: false, dietary: "", allergies: "", notes: "", custom: [],
});

function formFromMember(m: TourMemberRow): MemberForm {
  return {
    name: m.name,
    type: m.type,
    gender: m.gender || "female",
    waiver: m.waiver,
    dietary: m.dietary_restrictions || "",
    allergies: m.allergies || "",
    notes: m.notes || "",
    custom: Object.entries(m.custom_attributes || {}).map(([key, value]) => ({ key, value: String(value) })),
  };
}

interface Props {
  tour: TourRow;
  members: TourMemberRow[];
  isOwner: boolean;
  // Viewer's itinerary role. The host editing view passes "coordinator" (sees
  // every section). Other roles get filtered sections via visibleRosterPersonas;
  // the non-host views themselves are not built in this pass.
  viewerRole?: Role;
  onMembersChange: (members: TourMemberRow[]) => void;
}

export default function RosterTab({ tour, members, isOwner, viewerRole = "coordinator", onMembersChange }: Props) {
  const [collapsedOverride, setCollapsedOverride] = useState<Record<string, boolean>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm("student"));
  const [showCsv, setShowCsv] = useState(false);
  const [csvRole, setCsvRole] = useState<MemberType>("student");
  const [csvText, setCsvText] = useState("");
  const [saving, setSaving] = useState(false);

  const calc = calcRoster(members, tour.bus_capacity);
  const rooms = calcRooms(members, tour.room_config);
  const pendingWaivers = members.filter(m => !m.waiver).length;

  // One section per active persona the viewer is allowed to see, in canonical order.
  const personaKeys = visibleRosterPersonas(activePersonaKeys(tour.active_personas), viewerRole);
  const sections = personaKeys.map(key => {
    const persona = getPersona(key)!;
    const list = members
      .filter(m => m.type === persona.memberType)
      .sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    return {
      key,
      label: personaLabel(key, tour.persona_labels),
      colors: personaColors(key),
      list,
      expected: expectedCountForPersona(key, tour),
      waiversSigned: list.filter(m => m.waiver).length,
      flags: list.filter(m => (m.allergies?.trim() || m.dietary_restrictions?.trim())).length,
    };
  });

  const isCollapsed = (key: string, count: number) =>
    key in collapsedOverride ? collapsedOverride[key] : count > COLLAPSE_THRESHOLD;
  const toggle = (key: string, count: number) =>
    setCollapsedOverride(o => ({ ...o, [key]: !(key in o ? o[key] : count > COLLAPSE_THRESHOLD) }));

  function openAdd(type: MemberType) {
    setEditingId(null);
    setForm(emptyForm(type));
    setEditorOpen(true);
  }
  function openEdit(m: TourMemberRow) {
    setEditingId(m.id);
    setForm(formFromMember(m));
    setEditorOpen(true);
  }
  function openCsv(type: MemberType) {
    setCsvRole(type);
    setShowCsv(true);
  }

  async function saveMember() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const custom: Record<string, string> = {};
    for (const row of form.custom) {
      const k = row.key.trim();
      if (k) custom[k] = row.value.trim();
    }
    const patch = {
      name: form.name.trim(),
      type: form.type,
      gender: form.gender || null,
      waiver: form.waiver,
      notes: form.notes.trim() || null,
      dietary_restrictions: form.dietary.trim() || null,
      allergies: form.allergies.trim() || null,
      custom_attributes: custom,
    };
    if (editingId) {
      const { data } = await supabase.from("tour_members").update(patch).eq("id", editingId).select().single();
      if (data) onMembersChange(members.map(m => (m.id === editingId ? (data as TourMemberRow) : m)));
    } else {
      const { data } = await supabase.from("tour_members")
        .insert({ tour_id: tour.id, ...patch, sort_order: members.length + 1 }).select().single();
      if (data) onMembersChange([...members, data as TourMemberRow]);
    }
    setEditorOpen(false);
    setSaving(false);
  }

  async function importCsv() {
    const lines = csvText.trim().split("\n").filter(Boolean);
    if (!lines.length || saving) return;
    setSaving(true);
    const supabase = createClient();
    const inserts = lines.map((l, i) => {
      const p = l.split(",").map(s => s.trim());
      return {
        tour_id: tour.id,
        name: p[0] || "",
        type: csvRole,
        gender: p[1]?.toLowerCase() || "female",
        waiver: false,
        notes: null,
        dietary_restrictions: p[2] || null,
        allergies: p[3] || null,
        custom_attributes: {},
        sort_order: members.length + i + 1,
      };
    }).filter(r => r.name);
    const { data } = await supabase.from("tour_members").insert(inserts).select();
    if (data) onMembersChange([...members, ...(data as TourMemberRow[])]);
    setCsvText("");
    setShowCsv(false);
    setSaving(false);
  }

  async function toggleWaiver(member: TourMemberRow) {
    const supabase = createClient();
    await supabase.from("tour_members").update({ waiver: !member.waiver }).eq("id", member.id);
    onMembersChange(members.map(m => (m.id === member.id ? { ...m, waiver: !m.waiver } : m)));
  }

  async function removeMember(id: string) {
    const supabase = createClient();
    await supabase.from("tour_members").delete().eq("id", id);
    onMembersChange(members.filter(m => m.id !== id));
  }

  const csvCount = csvText.trim().split("\n").filter(Boolean).length;

  return (
    <div>
      {/* Tour-level planning summary (reuses the roster calculators) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, fontSize: 12 }}>
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

      {pendingWaivers > 0 && (
        <div style={{ background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 9, padding: "9px 14px", fontSize: 12, color: "#92400e", marginBottom: 12, display: "flex", gap: 7, alignItems: "center" }}>
          <I n="warn" s={13} />
          {pendingWaivers} waiver{pendingWaivers > 1 ? "s" : ""} still pending across the roster
        </div>
      )}

      {/* Global actions */}
      {isOwner && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Btn onClick={() => openCsv("student")} variant="muted" small><I n="upload" s={12} />Import CSV</Btn>
          <Btn onClick={() => openAdd("student")} small><I n="plus" s={12} />Add Participant</Btn>
        </div>
      )}

      {/* Role-grouped accordion */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sections.map(sec => {
          const count = sec.list.length;
          const collapsed = isCollapsed(sec.key, count);
          const waiverComplete = count > 0 && sec.waiversSigned === count;
          const memberType = getPersona(sec.key)!.memberType as MemberType;
          return (
            <div key={sec.key} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              {/* Header — chevron + label + status pills */}
              <div
                onClick={() => toggle(sec.key, count)}
                role="button"
                aria-expanded={!collapsed}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", borderLeft: `4px solid ${sec.colors.color}` }}
              >
                {collapsed
                  ? <ChevronRight size={18} color="#64748b" style={{ flexShrink: 0 }} />
                  : <ChevronDown size={18} color="#64748b" style={{ flexShrink: 0 }} />}
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: sec.colors.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 16, fontWeight: 700, color: BRAND.navy }}>
                  {sec.label}
                </span>

                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {/* Count added vs expected */}
                  <span style={{ background: sec.colors.bg, color: sec.colors.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                    {count}{sec.expected != null ? ` / ${sec.expected}` : ""} {sec.expected != null ? "added" : count === 1 ? "person" : "people"}
                  </span>
                  {/* Waiver completion */}
                  {count > 0 && (
                    <span style={{
                      background: waiverComplete ? "#dcfce7" : "#fef3c7",
                      color: waiverComplete ? "#166534" : "#92400e",
                      borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      Waivers {sec.waiversSigned}/{count}
                    </span>
                  )}
                  {/* Allergy / dietary flags */}
                  {sec.flags > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff1f2", color: "#be123c", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }} title="Participants with allergies or dietary notes">
                      <I n="warn" s={11} />{sec.flags}
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              {!collapsed && (
                count === 0 ? (
                  <div style={{ borderTop: "1px solid #f1f5f9", padding: "26px 16px", textAlign: "center" }}>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: isOwner ? 12 : 0 }}>
                      No {sec.label.toLowerCase()} added yet.
                    </div>
                    {isOwner && (
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <Btn onClick={() => openCsv(memberType)} variant="muted" small><I n="upload" s={12} />Import</Btn>
                        <Btn onClick={() => openAdd(memberType)} small><I n="plus" s={12} />Add {sec.label}</Btn>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid #f1f5f9", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #f1f5f9", background: "#f8fafc" }}>
                          {["Name", "Dietary", "Allergies", "Waiver", "Custom", ""].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sec.list.map((m, i) => {
                          const custom = Object.entries(m.custom_attributes || {});
                          return (
                            <tr key={m.id} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                              <td style={{ padding: "9px 12px", fontWeight: 600, color: "#0f2233", whiteSpace: "nowrap" }}>{m.name}</td>
                              <td style={{ padding: "9px 12px", color: "#64748b" }}>{m.dietary_restrictions || <span style={{ color: "#e2e8f0" }}>—</span>}</td>
                              <td style={{ padding: "9px 12px", color: m.allergies ? "#be123c" : "#64748b" }}>{m.allergies || <span style={{ color: "#e2e8f0" }}>—</span>}</td>
                              <td style={{ padding: "9px 12px" }}>
                                <button
                                  onClick={() => isOwner && toggleWaiver(m)}
                                  disabled={!isOwner}
                                  style={{ background: m.waiver ? "#dcfce7" : "#fee2e2", color: m.waiver ? "#166534" : "#b91c1c", border: "none", borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700, cursor: isOwner ? "pointer" : "default", fontFamily: "inherit" }}>
                                  {m.waiver ? "Signed" : "Pending"}
                                </button>
                              </td>
                              <td style={{ padding: "9px 12px" }}>
                                {custom.length === 0 ? <span style={{ color: "#e2e8f0" }}>—</span> : (
                                  <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {custom.map(([k, v]) => (
                                      <span key={k} style={{ background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>
                                        {k}: {String(v)}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "9px 12px", whiteSpace: "nowrap", textAlign: "right" }}>
                                {isOwner && (
                                  <>
                                    <button onClick={() => openEdit(m)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, marginRight: 4 }}>
                                      <I n="edit" s={13} />
                                    </button>
                                    <button onClick={() => removeMember(m.id)} title="Remove" style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: 2 }}>
                                      <I n="trash" s={13} />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Add / edit member modal */}
      {editorOpen && (
        <Modal title={editingId ? "Edit Participant" : "Add Participant"} onClose={() => setEditorOpen(false)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="Full Name">
              <Inp value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="First Last" autoFocus />
            </Field>
            <Field label="Role" half>
              <Sel value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as MemberType }))}
                options={MEMBER_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            </Field>
            <Field label="Gender" half>
              <Sel value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} options={GENDER_OPTIONS} />
            </Field>
            <Field label="Dietary Restrictions" half>
              <Inp value={form.dietary} onChange={e => setForm(p => ({ ...p, dietary: e.target.value }))} placeholder="Vegetarian, halal..." />
            </Field>
            <Field label="Allergies" half>
              <Inp value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} placeholder="Nuts, dairy..." />
            </Field>
            <Field label="Notes">
              <Inp value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Room preference, anything else..." />
            </Field>

            {/* Custom attributes (label → value) */}
            <div style={{ width: "100%" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>Custom Attributes</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                {form.custom.map((row, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 6 }}>
                    <Inp value={row.key} placeholder="Label (e.g. T-Shirt)" style={{ flex: 1 }}
                      onChange={e => setForm(p => ({ ...p, custom: p.custom.map((r, i) => i === idx ? { ...r, key: e.target.value } : r) }))} />
                    <Inp value={row.value} placeholder="Value (e.g. L)" style={{ flex: 1 }}
                      onChange={e => setForm(p => ({ ...p, custom: p.custom.map((r, i) => i === idx ? { ...r, value: e.target.value } : r) }))} />
                    <button onClick={() => setForm(p => ({ ...p, custom: p.custom.filter((_, i) => i !== idx) }))}
                      style={{ background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#94a3b8", padding: "0 10px" }}>
                      <I n="x" s={13} />
                    </button>
                  </div>
                ))}
                <Btn onClick={() => setForm(p => ({ ...p, custom: [...p.custom, { key: "", value: "" }] }))} variant="muted" small style={{ alignSelf: "flex-start" }}>
                  <I n="plus" s={12} />Add Attribute
                </Btn>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", width: "100%" }}>
              <input type="checkbox" checked={form.waiver} onChange={e => setForm(p => ({ ...p, waiver: e.target.checked }))} style={{ accentColor: BRAND.navy }} />
              Waiver signed
            </label>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <Btn onClick={() => setEditorOpen(false)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={saveMember} disabled={saving || !form.name.trim()} style={{ flex: 1 }}>{editingId ? "Save Changes" : "Add Participant"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* CSV import modal */}
      {showCsv && (
        <Modal title="Import from CSV / Google Sheet Paste" onClose={() => setShowCsv(false)}>
          <div style={{ marginBottom: 10 }}>
            <Field label="Import as role">
              <Sel value={csvRole} onChange={e => setCsvRole(e.target.value as MemberType)}
                options={MEMBER_TYPES.map(t => ({ value: t.value, label: t.label }))} />
            </Field>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px", lineHeight: 1.6 }}>
            One row per person. Format: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>Full Name, gender, dietary, allergies</code> (gender, dietary, and allergies optional).
          </p>
          <Tex value={csvText} onChange={e => setCsvText(e.target.value)} style={{ minHeight: 140, fontFamily: "monospace", fontSize: 12 }}
            placeholder={"Ava Christensen, female, vegetarian, none\nBrody Larsen, male\nCami Petersen, female, , nut allergy"} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={() => setShowCsv(false)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={importCsv} disabled={saving || csvCount === 0} style={{ flex: 1 }}>
              Import {csvCount} {csvCount === 1 ? "Person" : "People"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
