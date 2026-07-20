"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Paperclip, Upload, X, Link as LinkIcon, Plus, ImagePlus, Map } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, formatFullDate, showTripSection } from "@/lib/helpers";
import type { TripInfo, Role, PersonnelRow } from "@/lib/types";

// Tour-level confirmations reuse the existing public storage bucket.
const STORAGE_BUCKET = "agenda-images";

type ConfItem = { id?: string; type: string; label: string | null; file_url: string };

type PersonForm = { name: string; contact: string };
type CustomRowForm = { id: string; label: string; value: string; url: string };

type TripForm = {
  // Multiple teachers ({ name, contact: email }) and tour hosts ({ name, contact: phone }).
  teachers: PersonForm[];
  hosts: PersonForm[];
  // Multiple tour consultants / travel planners ({ name, contact: email }).
  consultants: PersonForm[];
  busCapacity: string;
  // Free-text override for the Participants row; blank = use the roster counts.
  participantsOverride: string;
  // Free-text overrides for the Flight / Hotel / Bus rows. Blank = derive from
  // the itinerary items (legacy behavior). Multi-line text supports tours with
  // several flights / hotels / buses.
  flightOverride: string;
  hotelOverride: string;
  busOverride: string;
  // Host-named extra rows (text or link).
  customRows: CustomRowForm[];
};

const confBoxStyle: React.CSSProperties = {
  marginTop: 8, display: "flex", alignItems: "center", gap: 8,
  border: "1px dashed #d8dee9", borderRadius: 8, padding: "7px 10px", background: "#fafbff", fontSize: 12,
};
const confBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 6, padding: "3px 9px",
  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
};

const HOTLINE_DISPLAY = "(801) 477-8963";
const HOTLINE_TEL = "8014778963";

// Trip Information header band (navy) + emphasis accent (medium blue), 2025 guide.
const INFINITY_BLUE = "#0B1957";
const INFINITY_BLUE_DEEP = "#5784E6";

const linkStyle: React.CSSProperties = { color: "#0369a1", textDecoration: "none", fontWeight: 600 };
const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");
const telHref = (phone: string) => `tel:${phone.replace(/[^\d]/g, "")}`;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1",
  borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box",
};
const textareaStyle: React.CSSProperties = {
  ...inputStyle, minHeight: 56, resize: "vertical",
};
const linkBtnStyle: React.CSSProperties = {
  ...linkStyle, background: "none", border: "none", padding: 0, marginTop: 4,
  cursor: "pointer", fontSize: 12, fontFamily: "inherit",
};
const smallAddBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4, background: "#f1f5f9",
  border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 11,
  fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start",
};

// Ensure http(s) prefix so hrefs never resolve relative to the app.
const externalHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

interface TripInformationProps {
  info: TripInfo;
  /** When true (tour host / internal view) show the inline edit affordance + confirmation upload/remove controls. */
  isHost?: boolean;
  /** Tour id. When provided, confirmations are read live (authenticated contexts: host + preview). The public
   *  view omits it and relies on info.confirmations from the shared-tour payload. */
  tourId?: string;
  /** The viewing role for role-gated rows (the bus-driver map shows for "driver"). */
  viewerRole?: Role;
  /** Persists tour-record fields. */
  onSaveTour?: (patch: Record<string, any>) => void | Promise<void>;
  /** Persists the tour host phone to the logged-in user's tour_hosts record (legacy sync). */
  onSaveHostPhone?: (phone: string | null) => void | Promise<void>;
  /** Opens the flight itinerary item's edit modal. Null when no flight item exists. */
  onEditFlight?: (() => void) | null;
  /** Opens the hotel itinerary item's edit modal. Null when no hotel item exists. */
  onEditHotel?: (() => void) | null;
  /** Opens the bus itinerary item's edit modal. Null when no bus item exists. */
  onEditBus?: (() => void) | null;
  /** Print/PDF export: render contact info as plain (non-clickable) text and drop
   *  attachment/file links, which do nothing on paper. */
  print?: boolean;
}

// Editable list of people (teachers: name+email, hosts: name+phone). Each row
// has an optional "select existing" dropdown sourced from Infinity staff
// accounts + this tour's teachers; picking one fills name + contact, both still
// editable afterward. `contactKind` decides which contact field to pull from a
// staff account (phone for hosts, email for consultants/teachers).
function PersonListEditor({ people, onChange, namePlaceholder, contactPlaceholder, addLabel, personnel = [], teacherRefs = [], contactKind = "email" }: {
  people: PersonForm[];
  onChange: (next: PersonForm[]) => void;
  namePlaceholder: string;
  contactPlaceholder: string;
  addLabel: string;
  personnel?: PersonnelRow[];
  teacherRefs?: PersonForm[];
  contactKind?: "phone" | "email";
}) {
  const rows = people.length ? people : [{ name: "", contact: "" }];
  const set = (i: number, patch: Partial<PersonForm>) =>
    onChange(rows.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const hasDropdown = personnel.length > 0 || teacherRefs.some(t => t.name.trim());

  function pick(i: number, val: string) {
    if (!val) return;
    const sep = val.indexOf(":");
    const src = val.slice(0, sep);
    const key = val.slice(sep + 1);
    if (src === "staff") {
      const p = personnel.find(x => x.id === key);
      if (p) set(i, { name: p.name ?? "", contact: (contactKind === "phone" ? p.phone : p.email) ?? "" });
    } else if (src === "teacher") {
      const t = teacherRefs[parseInt(key, 10)];
      if (t) set(i, { name: t.name, contact: t.contact ?? "" });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((p, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, background: "#fafbff", border: "1px solid #eef2f7", borderRadius: 8, padding: 8 }}>
          {hasDropdown && (
            <select value="" onChange={e => pick(i, e.target.value)}
              style={{ ...inputStyle, fontSize: 12, color: "#475569", cursor: "pointer" }}>
              <option value="">＋ Select existing…</option>
              {personnel.length > 0 && (
                <optgroup label="Infinity staff">
                  {personnel.map(pr => <option key={pr.id} value={`staff:${pr.id}`}>{pr.name}</option>)}
                </optgroup>
              )}
              {teacherRefs.some(t => t.name.trim()) && (
                <optgroup label="This tour's teachers">
                  {teacherRefs.map((t, ti) => t.name.trim() ? <option key={ti} value={`teacher:${ti}`}>{t.name}</option> : null)}
                </optgroup>
              )}
            </select>
          )}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={{ ...inputStyle, flex: 1 }} value={p.name} placeholder={namePlaceholder}
              onChange={e => set(i, { name: e.target.value })} />
            <input style={{ ...inputStyle, flex: 1 }} value={p.contact} placeholder={contactPlaceholder}
              onChange={e => set(i, { contact: e.target.value })} />
            <button type="button" title="Remove" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex", flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" style={smallAddBtn} onClick={() => onChange([...rows, { name: "", contact: "" }])}>
        <Plus size={11} /> {addLabel}
      </button>
    </div>
  );
}

export default function TripInformation({ info, isHost = false, tourId, viewerRole, onSaveTour, onSaveHostPhone, onEditFlight, onEditHotel, onEditBus, print = false }: TripInformationProps) {
  const [open, setOpen] = useState(true); // expanded by default
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TripForm>({
    teachers: [], hosts: [], consultants: [], busCapacity: "", participantsOverride: "",
    flightOverride: "", hotelOverride: "", busOverride: "", customRows: [],
  });

  // Personnel directory for the host/consultant/teacher dropdowns (staff
  // accounts). Fetched once for host views via the SECURITY DEFINER RPC.
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  useEffect(() => {
    if (!isHost) return;
    let active = true;
    (async () => {
      const { data } = await createClient().rpc("list_personnel");
      if (active && Array.isArray(data)) setPersonnel(data as PersonnelRow[]);
    })();
    return () => { active = false; };
  }, [isHost]);

  // Teacher candidates for the host/consultant dropdowns come from the teachers
  // currently entered on the form (live), so a just-added teacher is selectable.
  const teacherRefs = form.teachers.filter(t => t.name.trim() || t.contact.trim());

  function startEdit() {
    setForm({
      teachers: (info.teachers ?? []).map(t => ({ name: t.name ?? "", contact: t.contact ?? "" })),
      hosts: (info.tourHosts ?? []).map(h => ({ name: h.name ?? "", contact: h.contact ?? "" })),
      consultants: (info.consultants ?? []).map(c => ({ name: c.name ?? "", contact: c.contact ?? "" })),
      busCapacity: info.busCapacity != null ? String(info.busCapacity) : "",
      participantsOverride: info.participantsOverride ?? "",
      flightOverride: info.overrides?.flight ?? "",
      hotelOverride: info.overrides?.hotel ?? "",
      busOverride: info.overrides?.bus ?? "",
      customRows: (info.customRows ?? []).map(r => ({ id: r.id, label: r.label ?? "", value: r.value ?? "", url: r.url ?? "" })),
    });
    setOpen(true);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const teachers = form.teachers
        .map(t => ({ name: t.name.trim(), contact: t.contact.trim() || null }))
        .filter(t => t.name || t.contact);
      const hosts = form.hosts
        .map(h => ({ name: h.name.trim(), contact: h.contact.trim() || null }))
        .filter(h => h.name || h.contact);
      const consultants = form.consultants
        .map(c => ({ name: c.name.trim(), contact: c.contact.trim() || null }))
        .filter(c => c.name || c.contact);
      const customRows = form.customRows
        .map(r => ({ id: r.id, label: r.label.trim(), value: r.value.trim() || null, url: r.url.trim() || null }))
        .filter(r => r.label || r.value || r.url);
      await Promise.all([
        onSaveTour?.({
          teachers,
          tour_hosts_list: hosts,
          // Legacy single-field sync so older views / the quote module keep working.
          contact_name: teachers[0]?.name || null,
          contact_email: teachers[0]?.contact || null,
          traveling_tour_host: hosts[0]?.name || null,
          consultants,
          planning_tour_host: consultants[0]?.name || null,
          bus_capacity: Number(form.busCapacity) || 0,
          participants_display_override: form.participantsOverride.trim() || null,
          trip_info_overrides: {
            flight: form.flightOverride.trim() || null,
            hotel: form.hotelOverride.trim() || null,
            bus: form.busOverride.trim() || null,
          },
          custom_trip_rows: customRows,
        }),
        // NOTE: the logged-in user's tour_hosts profile phone is deliberately NOT
        // written here anymore. Host phones now live per-tour in tour_hosts_list;
        // writing hosts[0].contact to the editor's global profile would corrupt
        // their contact info on every other tour (e.g. saving a co-host first).
      ]);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Confirmations (inline per Flight / Hotel / Bus row) ─────────────────────
  const [confs, setConfs] = useState<ConfItem[]>(info.confirmations ?? []);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [linkEntryType, setLinkEntryType] = useState<string | null>(null);
  const [linkEntryVal, setLinkEntryVal] = useState("");
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!tourId) return; // public/participant view relies on info.confirmations
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("tour_confirmations").select("*").eq("tour_id", tourId)
        .order("uploaded_at", { ascending: false });
      if (active && data) setConfs(data as ConfItem[]);
    })();
    return () => { active = false; };
  }, [tourId]);

  const confByType = (t: string) => confs.find(c => c.type === t) ?? null;

  async function saveConfRow(type: string, label: string, fileUrl: string) {
    if (!tourId) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: row, error } = await supabase
      .from("tour_confirmations")
      .insert({ tour_id: tourId, type, label, file_url: fileUrl, uploaded_by: user?.id ?? null })
      .select().single();
    if (error) {
      console.error("Confirmation insert failed", error.message);
      if (typeof window !== "undefined") window.alert(`Could not save confirmation: ${error.message}`);
    } else if (row) {
      // One confirmation per type/tour: drop any prior row of this type.
      await supabase.from("tour_confirmations").delete().eq("tour_id", tourId).eq("type", type).neq("id", (row as any).id);
      setConfs(prev => [row as ConfItem, ...prev.filter(r => r.type !== type)]);
    }
  }

  async function uploadConf(type: string, label: string, file: File | undefined) {
    if (!file || !tourId) return;
    setBusyType(type);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tourId}/tour-confirmations/${type}-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      console.error("Confirmation upload failed", upErr.message);
      if (typeof window !== "undefined") window.alert(`Upload failed: ${upErr.message}. Very large files (over ~50MB) cannot be uploaded — try a smaller PDF or image.`);
    } else {
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      await saveConfRow(type, label, pub.publicUrl);
    }
    setBusyType(null);
    const el = fileInputs.current[type]; if (el) el.value = "";
  }

  async function addConfLink(type: string, label: string) {
    const url = linkEntryVal.trim();
    if (!url) return;
    setBusyType(type);
    await saveConfRow(type, label, externalHref(url));
    setBusyType(null);
    setLinkEntryType(null);
    setLinkEntryVal("");
  }

  async function removeConf(id: string) {
    const supabase = createClient();
    await supabase.from("tour_confirmations").delete().eq("id", id);
    setConfs(prev => prev.filter(r => r.id !== id));
  }

  // ── Driver map images (hosts + bus drivers only) ─────────────────────────────
  const [mapUrls, setMapUrls] = useState<string[]>(info.driverMapUrls ?? []);
  const [mapBusy, setMapBusy] = useState(false);
  const mapInput = useRef<HTMLInputElement>(null);
  useEffect(() => { setMapUrls(info.driverMapUrls ?? []); }, [info.driverMapUrls]);

  async function uploadDriverMap(files: FileList | null) {
    if (!files || files.length === 0 || !tourId) return;
    setMapBusy(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tourId}/driver-maps/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        console.error("Driver map upload failed", error.message);
        if (typeof window !== "undefined") window.alert(`Upload failed: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) added.push(data.publicUrl);
    }
    if (added.length) {
      const next = [...mapUrls, ...added];
      setMapUrls(next);
      await onSaveTour?.({ driver_map_urls: next });
    }
    setMapBusy(false);
    if (mapInput.current) mapInput.current.value = "";
  }

  async function removeDriverMap(url: string) {
    const next = mapUrls.filter(u => u !== url);
    setMapUrls(next);
    await onSaveTour?.({ driver_map_urls: next });
  }

  // Read-only "Edit X Item →" link (host view only, when the item exists).
  function editLink(onEdit: (() => void) | null | undefined, label: string) {
    if (!isHost || !onEdit) return null;
    return <div><button type="button" onClick={onEdit} style={linkBtnStyle}>{label}</button></div>;
  }

  // Contact info (phone / email / hotline): useful as text on paper, but a clickable
  // tel:/mailto: link does nothing in print — render plain text there, a link on screen.
  const link = (href: string, text: string) =>
    print ? <span>{text}</span> : <a href={href} style={linkStyle}>{text}</a>;

  // Inline confirmation attachment area for a transport row. Accepts uploaded
  // files AND external links (e.g. Google Drive).
  function renderConf(type: string, label: string) {
    // Confirmation attachments are file links — nothing to click on paper.
    if (print) return null;
    const c = confByType(type);
    const isExternal = !!c && !c.file_url.includes(`/${STORAGE_BUCKET}/`);
    if (!isHost) {
      // Participant view: a single view link, only when a file/link exists.
      if (!c) return null;
      return (
        <a href={c.file_url} target="_blank" rel="noreferrer"
          style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, color: "#0369a1", fontWeight: 600, fontSize: 12, textDecoration: "none" }}>
          {isExternal ? <LinkIcon size={13} /> : <Paperclip size={13} />} View {label}
        </a>
      );
    }
    return (
      <div style={confBoxStyle}>
        {isExternal ? <LinkIcon size={14} color="#16a34a" style={{ flexShrink: 0 }} /> : <Paperclip size={14} color={c ? "#16a34a" : "#94a3b8"} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, color: c ? "#1e293b" : "#94a3b8" }}>
          {c ? (isExternal ? `${label} (link)` : label) : "No confirmation attached"}
        </span>
        {c ? (
          <>
            <a href={c.file_url} target="_blank" rel="noreferrer" style={{ ...linkStyle, fontSize: 12 }}>View</a>
            <button type="button" title="Remove confirmation" onClick={() => c.id && removeConf(c.id)}
              style={{ ...confBtnStyle, background: "#fff", border: "1px solid #e2e8f0", color: "#b91c1c" }}>
              <X size={12} /> Remove
            </button>
          </>
        ) : linkEntryType === type ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: 2 }}>
            <input autoFocus value={linkEntryVal} placeholder="Paste a link (e.g. Google Drive)"
              onChange={e => setLinkEntryVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addConfLink(type, label); if (e.key === "Escape") { setLinkEntryType(null); setLinkEntryVal(""); } }}
              style={{ ...inputStyle, fontSize: 11, padding: "4px 6px", flex: 1 }} />
            <button type="button" onClick={() => addConfLink(type, label)} disabled={busyType === type}
              style={{ ...confBtnStyle, background: BRAND.blue, border: "none", color: "#fff" }}>Save</button>
            <button type="button" onClick={() => { setLinkEntryType(null); setLinkEntryVal(""); }}
              style={{ ...confBtnStyle, background: "#fff", border: "1px solid #e2e8f0", color: "#64748b" }}>Cancel</button>
          </span>
        ) : (
          <>
            <input ref={el => { fileInputs.current[type] = el; }} type="file" accept="image/*,.pdf" style={{ display: "none" }}
              onChange={e => uploadConf(type, label, e.target.files?.[0])} />
            <button type="button" onClick={() => fileInputs.current[type]?.click()} disabled={busyType === type}
              style={{ ...confBtnStyle, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569" }}>
              <Upload size={12} /> {busyType === type ? "Uploading…" : "Upload"}
            </button>
            <button type="button" title="Attach a link instead of a file (e.g. Google Drive)"
              onClick={() => { setLinkEntryType(type); setLinkEntryVal(""); }}
              style={{ ...confBtnStyle, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569" }}>
              <LinkIcon size={12} /> Link
            </button>
          </>
        )}
      </div>
    );
  }

  const teachers = info.teachers ?? [];
  const hosts = info.tourHosts ?? [];
  const flightOverride = (info.overrides?.flight ?? "").trim();
  const hotelOverride = (info.overrides?.hotel ?? "").trim();
  const busOverride = (info.overrides?.bus ?? "").trim();
  // The driver map row renders for hosts and bus drivers only (never in print).
  const showDriverMap = !print && (isHost || viewerRole === "driver") && (isHost || mapUrls.length > 0);

  const overrideHint = (
    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
      Type anything here (multiple flights, hotels, buses, drivers…). Leave blank to use the itinerary item.
    </div>
  );

  const rows: { label: string; content: React.ReactNode; id?: string }[] = [
    {
      label: teachers.length > 1 ? "Teachers" : "Teacher Name",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <PersonListEditor people={form.teachers} onChange={t => setForm(f => ({ ...f, teachers: t }))}
            namePlaceholder="Teacher name" contactPlaceholder="Teacher email" addLabel="Add teacher"
            personnel={personnel} contactKind="email" />
        </div>
      ) : teachers.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {teachers.map((t, i) => (
            <div key={i}>
              {t.name || "—"}
              {t.contact && <> · {link(`mailto:${t.contact}`, t.contact)}</>}
            </div>
          ))}
        </div>
      ) : (
        <div>—</div>
      ),
    },
    {
      label: hosts.length > 1 ? "Tour Hosts" : "Infinity Tours + Events",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <PersonListEditor people={form.hosts} onChange={h => setForm(f => ({ ...f, hosts: h }))}
            namePlaceholder="Tour host name" contactPlaceholder="Tour host phone" addLabel="Add tour host"
            personnel={personnel} teacherRefs={teacherRefs} contactKind="phone" />
          <div style={{ color: "#64748b", fontSize: 12 }}>
            Infinity Hotline {HOTLINE_DISPLAY}
          </div>
        </div>
      ) : (
        <>
          {hosts.length ? hosts.map((h, i) => (
            <div key={i}>
              {h.name || "—"}
              {h.contact && <> · {link(telHref(h.contact), h.contact)}</>}
            </div>
          )) : <div>—</div>}
          <div style={{ color: "#64748b" }}>
            Infinity Hotline {link(`tel:${HOTLINE_TEL}`, HOTLINE_DISPLAY)}
          </div>
        </>
      ),
    },
    // Tour consultants (travel planners) — separate from the traveling tour host.
    ...(editing || (info.consultants ?? []).length ? [{
      label: (info.consultants ?? []).length > 1 ? "Tour Consultants" : "Tour Consultant",
      content: editing ? (
        <PersonListEditor people={form.consultants} onChange={c => setForm(f => ({ ...f, consultants: c }))}
          namePlaceholder="Consultant (travel planner) name" contactPlaceholder="Consultant email" addLabel="Add consultant"
          personnel={personnel} teacherRefs={teacherRefs} contactKind="email" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {(info.consultants ?? []).map((c, i) => (
            <div key={i}>
              {c.name || "—"}
              {c.contact && <> · {link(`mailto:${c.contact}`, c.contact)}</>}
            </div>
          ))}
        </div>
      ),
    }] : []),
    {
      label: "Participants",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Participants (custom text)</div>
          <input style={inputStyle} value={form.participantsOverride} placeholder="e.g. 42 travelers (final count pending)"
            onChange={e => setForm(f => ({ ...f, participantsOverride: e.target.value }))} />
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Overrides the roster breakdown below. Leave blank to use the roster counts.</div>
          <div style={{ fontSize: 12, color: "#475569", background: "#fafbff", border: "1px solid #eef2f7", borderRadius: 6, padding: "6px 8px" }}>
            <span style={{ fontWeight: 700 }}>From roster: </span>
            {info.participants.map(p => `${p.count} ${p.label}`).join(", ") || "—"}
          </div>
        </div>
      ) : info.participantsOverride && info.participantsOverride.trim() ? (
        <div style={{ whiteSpace: "pre-wrap" }}>{info.participantsOverride}</div>
      ) : (
        <>
          <div>{info.participants.map(p => `${p.count} ${p.label}`).join(", ") || "—"}</div>
          <div style={{ color: INFINITY_BLUE_DEEP, fontWeight: 700, marginTop: 2 }}>
            {info.totalParticipants} Total Participants
          </div>
        </>
      ),
    },
    { label: "Departure", content: formatFullDate(info.departure) },
    { label: "Return", content: formatFullDate(info.returnDate) },
    {
      id: "flight",
      label: "Flight",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea style={textareaStyle} value={form.flightOverride}
            placeholder={"e.g.\nDelta 1642 · SLC → JFK · 8:05 AM\nDelta 2210 · JFK → SLC · 6:40 PM"}
            onChange={e => setForm(f => ({ ...f, flightOverride: e.target.value }))} />
          {overrideHint}
          {onEditFlight && <button type="button" onClick={onEditFlight} style={linkBtnStyle}>Edit Flight Item →</button>}
          {renderConf("flight", "Flight Confirmation")}
        </div>
      ) : (
        <>
          {flightOverride ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{flightOverride}</div>
          ) : info.hasFlight ? (
            <>
              <div>{dash(info.flightName)}</div>
              {info.flightAddress && <div style={{ color: "#64748b" }}>{info.flightAddress}</div>}
            </>
          ) : (
            <div style={{ color: "#94a3b8" }}>{isHost ? "Add a flight travel item, or click Edit to type flight info here." : "—"}</div>
          )}
          {editLink(onEditFlight, "Edit Flight Item →")}
          {renderConf("flight", "Flight Confirmation")}
        </>
      ),
    },
    {
      label: "Hotel",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea style={textareaStyle} value={form.hotelOverride}
            placeholder={"e.g.\nHoliday Inn Chelsea (nights 1-3)\nMarriott Downtown (nights 4-5)"}
            onChange={e => setForm(f => ({ ...f, hotelOverride: e.target.value }))} />
          {overrideHint}
          {onEditHotel && <button type="button" onClick={onEditHotel} style={linkBtnStyle}>Edit Hotel Item →</button>}
          {renderConf("hotel", "Hotel Confirmation")}
        </div>
      ) : (
        <>
          {hotelOverride ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{hotelOverride}</div>
          ) : (
            <>
              <div>{dash(info.hotelName)}</div>
              {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
            </>
          )}
          {editLink(onEditHotel, "Edit Hotel Item →")}
          {renderConf("hotel", "Hotel Confirmation")}
        </>
      ),
    },
    {
      id: "bus",
      label: "Bus",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea style={textareaStyle} value={form.busOverride}
            placeholder={"e.g.\nHoliday Motor Coach · 2 buses\nDriver: Ray · (801) 555-0114"}
            onChange={e => setForm(f => ({ ...f, busOverride: e.target.value }))} />
          {overrideHint}
          <input type="number" min={0} style={inputStyle} value={form.busCapacity} placeholder="Bus capacity"
            onChange={e => setForm(f => ({ ...f, busCapacity: e.target.value }))} />
          {onEditBus && <button type="button" onClick={onEditBus} style={linkBtnStyle}>Edit Bus Item →</button>}
          {renderConf("bus", "Bus Confirmation")}
        </div>
      ) : (
        <>
          {busOverride ? (
            <div style={{ whiteSpace: "pre-wrap" }}>{busOverride}</div>
          ) : (
            <>
              {/* Company comes from the tour record (Overview → Bus Company). */}
              <div>{dash(info.busCompany)}</div>
              {(info.busContactName || info.busContactPhone) && (
                <div style={{ color: "#64748b" }}>
                  {info.busContactName}
                  {info.busContactName && info.busContactPhone ? " · " : null}
                  {info.busContactPhone && link(telHref(info.busContactPhone), info.busContactPhone)}
                </div>
              )}
              {info.busCapacity ? <div style={{ color: "#64748b" }}>{info.busCapacity} passengers</div> : null}
            </>
          )}
          {/* Bus driver contact — host-facing only, never shown to participants. */}
          {isHost && (info.busDriverName || info.busDriverPhone) && (
            <div style={{ color: "#64748b" }}>
              <span style={{ fontWeight: 600 }}>Driver: </span>
              {info.busDriverName}
              {info.busDriverName && info.busDriverPhone ? " · " : null}
              {info.busDriverPhone && link(telHref(info.busDriverPhone), info.busDriverPhone)}
            </div>
          )}
          {editLink(onEditBus, "Edit Bus Item →")}
          {renderConf("bus", "Bus Confirmation")}
        </>
      ),
    },
    // Bus-driver map images — hosts + bus drivers only.
    ...(showDriverMap ? [{
      label: "Driver Map",
      content: (
        <div>
          {mapUrls.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: isHost ? 8 : 0 }}>
              {mapUrls.map(url => (
                <span key={url} style={{ position: "relative", display: "inline-block" }}>
                  <a href={url} target="_blank" rel="noreferrer" title="Open full size">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Driver map" style={{ width: 120, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }} />
                  </a>
                  {isHost && (
                    <button type="button" title="Remove map" onClick={() => removeDriverMap(url)}
                      style={{ position: "absolute", top: -6, right: -6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b91c1c", padding: 0 }}>
                      <X size={11} strokeWidth={3} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {isHost ? (
            <>
              <input ref={mapInput} type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={e => uploadDriverMap(e.target.files)} />
              <button type="button" onClick={() => mapInput.current?.click()} disabled={mapBusy}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#fff", cursor: mapBusy ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit", opacity: mapBusy ? 0.6 : 1 }}>
                <ImagePlus size={13} />{mapBusy ? "Uploading…" : "Upload Map Image"}
              </button>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Map size={11} /> Visible only to you and bus drivers.
              </div>
            </>
          ) : mapUrls.length === 0 ? <div>—</div> : null}
        </div>
      ),
    }] : []),
    // Host-named custom rows (extra info or links) — rendered for everyone.
    ...(!editing ? (info.customRows ?? []).map(r => ({
      label: r.label || "Info",
      content: (
        <div>
          {r.url ? (
            print ? (
              <span>{r.value || r.label || r.url}</span>
            ) : (
              <a href={externalHref(r.url)} target="_blank" rel="noreferrer" style={{ ...linkStyle, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <LinkIcon size={12} />{r.value || r.label || r.url}
              </a>
            )
          ) : (
            <div style={{ whiteSpace: "pre-wrap" }}>{dash(r.value)}</div>
          )}
        </div>
      ),
    })) : []),
    // Custom-rows editor (edit mode only).
    ...(editing ? [{
      label: "Additional Rows",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.customRows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 4, background: "#fafbff", border: "1px solid #eef2f7", borderRadius: 8, padding: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input style={{ ...inputStyle, flex: 1 }} value={r.label} placeholder="Row name (e.g. Packing List)"
                  onChange={e => setForm(f => ({ ...f, customRows: f.customRows.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) }))} />
                <button type="button" title="Remove row"
                  onClick={() => setForm(f => ({ ...f, customRows: f.customRows.filter((_, idx) => idx !== i) }))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "flex", flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
              <input style={inputStyle} value={r.value} placeholder="Text to show (optional)"
                onChange={e => setForm(f => ({ ...f, customRows: f.customRows.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) }))} />
              <input style={inputStyle} value={r.url} placeholder="Link URL (optional — makes the row a link)"
                onChange={e => setForm(f => ({ ...f, customRows: f.customRows.map((x, idx) => idx === i ? { ...x, url: e.target.value } : x) }))} />
            </div>
          ))}
          <button type="button" style={smallAddBtn}
            onClick={() => setForm(f => ({ ...f, customRows: [...f.customRows, { id: crypto.randomUUID(), label: "", value: "", url: "" }] }))}>
            <Plus size={11} /> Add row
          </button>
        </div>
      ),
    }] : []),
  ];

  // Data-driven section visibility — defers to the shared showTripSection() rule
  // so the live view and the server-side PDF renderer can never diverge.
  const visibleRows = rows.filter(r => {
    if (editing) return true;
    if (r.id === "flight" || r.id === "bus") return showTripSection(r.id, info, { isHost });
    return true;
  });

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 16 }}>
      {/* Brand-blue header bar (Infinity footer periwinkle) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: INFINITY_BLUE }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8, padding: 0,
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
        >
          {open ? <ChevronDown size={18} color="#ffffff" /> : <ChevronRight size={18} color="#ffffff" />}
          <span style={{ fontSize: 16, fontWeight: 400, color: "#ffffff", fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
            Trip Information
          </span>
        </button>
        {isHost && !editing && (
          <button
            type="button"
            onClick={startEdit}
            title="Edit Trip Information"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.45)", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600,
              color: "#ffffff", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>

      {open && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 32%) 1fr", borderTop: "1px solid #f1f5f9" }}>
            {visibleRows.map((r, i) => (
              <Fragment key={`${r.label}-${i}`}>
                <div style={{
                  padding: "10px 16px", fontSize: 11.5, fontWeight: 700, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 0.4,
                  borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                  background: "#fafbff",
                }}>
                  {r.label}
                </div>
                <div style={{
                  padding: "10px 16px", fontSize: 13, color: "#1e293b", lineHeight: 1.5,
                  borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                }}>
                  {r.content}
                </div>
              </Fragment>
            ))}
          </div>

          {editing && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fafbff" }}>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                style={{ background: BRAND.blue, border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
