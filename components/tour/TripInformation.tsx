"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Paperclip, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, formatFullDate } from "@/lib/helpers";
import type { TripInfo } from "@/lib/types";

// Tour-level confirmations reuse the existing public storage bucket.
const STORAGE_BUCKET = "agenda-images";

type ConfItem = { id?: string; type: string; label: string | null; file_url: string };

type TripForm = {
  teacherName: string; teacherEmail: string; tourHostName: string; tourHostPhone: string;
  busCapacity: string;
  // Per-persona manual counts keyed by persona key; blank = use the roster count.
  participantCounts: Record<string, string>;
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

// Infinity Tours brand blue (the periwinkle/slate band from the website footer).
const INFINITY_BLUE = "#6B7FD7";
const INFINITY_BLUE_DEEP = "#4f63c4";

const linkStyle: React.CSSProperties = { color: "#0369a1", textDecoration: "none", fontWeight: 600 };
const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");
const telHref = (phone: string) => `tel:${phone.replace(/[^\d]/g, "")}`;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid #cbd5e1",
  borderRadius: 6, fontFamily: "inherit", boxSizing: "border-box",
};
const linkBtnStyle: React.CSSProperties = {
  ...linkStyle, background: "none", border: "none", padding: 0, marginTop: 4,
  cursor: "pointer", fontSize: 12, fontFamily: "inherit",
};

interface TripInformationProps {
  info: TripInfo;
  /** When true (tour host / internal view) show the inline edit affordance + confirmation upload/remove controls. */
  isHost?: boolean;
  /** Tour id. When provided, confirmations are read live (authenticated contexts: host + preview). The public
   *  view omits it and relies on info.confirmations from the shared-tour payload. */
  tourId?: string;
  /** Persists tour-record fields (contact_name, contact_email, traveling_tour_host, bus_capacity). */
  onSaveTour?: (patch: Record<string, any>) => void | Promise<void>;
  /** Persists the tour host phone to the logged-in user's tour_hosts record. */
  onSaveHostPhone?: (phone: string | null) => void | Promise<void>;
  /** Opens the flight itinerary item's edit modal. Null when no flight item exists. */
  onEditFlight?: (() => void) | null;
  /** Opens the hotel itinerary item's edit modal. Null when no hotel item exists. */
  onEditHotel?: (() => void) | null;
  /** Opens the bus itinerary item's edit modal. Null when no bus item exists. */
  onEditBus?: (() => void) | null;
}

export default function TripInformation({ info, isHost = false, tourId, onSaveTour, onSaveHostPhone, onEditFlight, onEditHotel, onEditBus }: TripInformationProps) {
  const [open, setOpen] = useState(true); // expanded by default
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TripForm>({
    teacherName: "", teacherEmail: "", tourHostName: "", tourHostPhone: "", busCapacity: "", participantCounts: {},
  });

  function startEdit() {
    setForm({
      teacherName: info.teacherName ?? "",
      teacherEmail: info.teacherEmail ?? "",
      tourHostName: info.tourHostName ?? "",
      tourHostPhone: info.tourHostPhone ?? "",
      busCapacity: info.busCapacity != null ? String(info.busCapacity) : "",
      participantCounts: Object.fromEntries(info.participants.map(p => [p.key, String(p.count)])),
    });
    setOpen(true);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      // Build the manual count override: keep only numeric entries; a blank field
      // is dropped so that persona falls back to the roster-derived count.
      const participant_counts: Record<string, number> = {};
      for (const [k, v] of Object.entries(form.participantCounts)) {
        const n = parseInt(v, 10);
        if (v.trim() !== "" && Number.isFinite(n) && n >= 0) participant_counts[k] = n;
      }
      await Promise.all([
        onSaveTour?.({
          contact_name: form.teacherName.trim() || null,
          contact_email: form.teacherEmail.trim() || null,
          traveling_tour_host: form.tourHostName.trim() || null,
          bus_capacity: Number(form.busCapacity) || 0,
          participant_counts,
        }),
        onSaveHostPhone?.(form.tourHostPhone.trim() || null),
      ]);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Confirmations (inline per Flight / Hotel / Bus row) ─────────────────────
  // Seed from the read-only payload (public view), then — in authenticated
  // contexts where a tourId is supplied — refresh with live rows that carry ids
  // so the host can remove them.
  const [confs, setConfs] = useState<ConfItem[]>(info.confirmations ?? []);
  const [busyType, setBusyType] = useState<string | null>(null);
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

  async function uploadConf(type: string, label: string, file: File | undefined) {
    if (!file || !tourId) return;
    setBusyType(type);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tourId}/tour-confirmations/${type}-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      console.error("Confirmation upload failed", upErr.message);
    } else {
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from("tour_confirmations")
        .insert({ tour_id: tourId, type, label, file_url: pub.publicUrl, uploaded_by: user?.id ?? null })
        .select().single();
      if (error) {
        console.error("Confirmation insert failed", error.message);
      } else if (row) {
        // One confirmation per type/tour: drop any prior row of this type.
        await supabase.from("tour_confirmations").delete().eq("tour_id", tourId).eq("type", type).neq("id", (row as any).id);
        setConfs(prev => [row as ConfItem, ...prev.filter(r => r.type !== type)]);
      }
    }
    setBusyType(null);
    const el = fileInputs.current[type]; if (el) el.value = "";
  }

  async function removeConf(id: string) {
    const supabase = createClient();
    await supabase.from("tour_confirmations").delete().eq("id", id);
    setConfs(prev => prev.filter(r => r.id !== id));
  }

  // Read-only "Edit X Item →" link (host view only, when the item exists).
  function editLink(onEdit: (() => void) | null | undefined, label: string) {
    if (!isHost || !onEdit) return null;
    return <div><button type="button" onClick={onEdit} style={linkBtnStyle}>{label}</button></div>;
  }

  // Inline confirmation attachment area for a transport row.
  function renderConf(type: string, label: string) {
    const c = confByType(type);
    if (!isHost) {
      // Participant view: a single view link, only when a file exists.
      if (!c) return null;
      return (
        <a href={c.file_url} target="_blank" rel="noreferrer"
          style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, color: "#0369a1", fontWeight: 600, fontSize: 12, textDecoration: "none" }}>
          <Paperclip size={13} /> View {label}
        </a>
      );
    }
    return (
      <div style={confBoxStyle}>
        <Paperclip size={14} color={c ? "#16a34a" : "#94a3b8"} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, color: c ? "#1e293b" : "#94a3b8" }}>
          {c ? label : "No confirmation uploaded"}
        </span>
        {c ? (
          <>
            <a href={c.file_url} target="_blank" rel="noreferrer" style={{ ...linkStyle, fontSize: 12 }}>View</a>
            <button type="button" title="Remove confirmation" onClick={() => c.id && removeConf(c.id)}
              style={{ ...confBtnStyle, background: "#fff", border: "1px solid #e2e8f0", color: "#b91c1c" }}>
              <X size={12} /> Remove
            </button>
          </>
        ) : (
          <>
            <input ref={el => { fileInputs.current[type] = el; }} type="file" accept="image/*,.pdf" style={{ display: "none" }}
              onChange={e => uploadConf(type, label, e.target.files?.[0])} />
            <button type="button" onClick={() => fileInputs.current[type]?.click()} disabled={busyType === type}
              style={{ ...confBtnStyle, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569" }}>
              <Upload size={12} /> {busyType === type ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
      </div>
    );
  }

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: "Teacher Name",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input style={inputStyle} value={form.teacherName} placeholder="Teacher name"
            onChange={e => setForm(f => ({ ...f, teacherName: e.target.value }))} />
          <input style={inputStyle} value={form.teacherEmail} placeholder="Teacher email"
            onChange={e => setForm(f => ({ ...f, teacherEmail: e.target.value }))} />
        </div>
      ) : (
        <>
          <div>{dash(info.teacherName)}</div>
          {info.teacherEmail && (
            <a href={`mailto:${info.teacherEmail}`} style={linkStyle}>{info.teacherEmail}</a>
          )}
        </>
      ),
    },
    {
      label: "Infinity Tours + Events",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input style={inputStyle} value={form.tourHostName} placeholder="Tour host name"
            onChange={e => setForm(f => ({ ...f, tourHostName: e.target.value }))} />
          <input style={inputStyle} type="tel" value={form.tourHostPhone} placeholder="Tour host phone"
            onChange={e => setForm(f => ({ ...f, tourHostPhone: e.target.value }))} />
          <div style={{ color: "#64748b", fontSize: 12 }}>
            Infinity Hotline {HOTLINE_DISPLAY}
          </div>
        </div>
      ) : (
        <>
          <div>
            {dash(info.tourHostName)}
            {info.tourHostPhone && (
              <> · <a href={telHref(info.tourHostPhone)} style={linkStyle}>{info.tourHostPhone}</a></>
            )}
          </div>
          <div style={{ color: "#64748b" }}>
            Infinity Hotline <a href={`tel:${HOTLINE_TEL}`} style={linkStyle}>{HOTLINE_DISPLAY}</a>
          </div>
        </>
      ),
    },
    {
      label: "Participants",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {info.participants.map(p => (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="number" min={0} style={{ ...inputStyle, width: 80 }}
                value={form.participantCounts[p.key] ?? ""}
                placeholder="—"
                onChange={e => setForm(f => ({ ...f, participantCounts: { ...f.participantCounts, [p.key]: e.target.value } }))} />
              <span>{p.label}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Leave a field blank to use the count from the roster.</div>
        </div>
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
      label: "Flight",
      content: editing ? (
        <>
          {onEditFlight ? (
            <div>
              <div>{dash(info.flightName)}</div>
              {info.flightAddress && <div style={{ color: "#64748b" }}>{info.flightAddress}</div>}
              <button type="button" onClick={onEditFlight} style={linkBtnStyle}>Edit Flight Item →</button>
            </div>
          ) : (
            <div style={{ color: "#94a3b8" }}>Add a flight travel item to populate this field.</div>
          )}
          {renderConf("flight", "Flight Confirmation")}
        </>
      ) : (
        <>
          {info.hasFlight ? (
            <>
              <div>{dash(info.flightName)}</div>
              {info.flightAddress && <div style={{ color: "#64748b" }}>{info.flightAddress}</div>}
            </>
          ) : (
            <div style={{ color: "#94a3b8" }}>{isHost ? "Add a flight travel item to populate this field." : "—"}</div>
          )}
          {editLink(onEditFlight, "Edit Flight Item →")}
          {renderConf("flight", "Flight Confirmation")}
        </>
      ),
    },
    {
      label: "Hotel",
      content: editing ? (
        <>
          {onEditHotel ? (
            <div>
              <div>{dash(info.hotelName)}</div>
              {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
              <button type="button" onClick={onEditHotel} style={linkBtnStyle}>Edit Hotel Item →</button>
            </div>
          ) : (
            <div style={{ color: "#94a3b8" }}>Add a Hotel item to your itinerary to populate this field.</div>
          )}
          {renderConf("hotel", "Hotel Confirmation")}
        </>
      ) : (
        <>
          <div>{dash(info.hotelName)}</div>
          {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
          {info.hotelRooms && <div style={{ color: "#64748b" }}>{info.hotelRooms}</div>}
          {editLink(onEditHotel, "Edit Hotel Item →")}
          {renderConf("hotel", "Hotel Confirmation")}
        </>
      ),
    },
    {
      label: "Bus",
      content: editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input type="number" min={0} style={inputStyle} value={form.busCapacity} placeholder="Bus capacity"
            onChange={e => setForm(f => ({ ...f, busCapacity: e.target.value }))} />
          {onEditBus ? (
            <div>
              <div>{dash(info.busCompany)}</div>
              <button type="button" onClick={onEditBus} style={linkBtnStyle}>Edit Bus Item →</button>
            </div>
          ) : (
            <div style={{ color: "#94a3b8" }}>Add a bus travel item to populate this field.</div>
          )}
          {renderConf("bus", "Bus Confirmation")}
        </div>
      ) : (
        <>
          {/* Company now comes from the tour record (Overview → Bus Company). */}
          <div>{dash(info.busCompany)}</div>
          {/* Existing dispatch contact, derived from the bus item — unchanged. */}
          {(info.busContactName || info.busContactPhone) && (
            <div style={{ color: "#64748b" }}>
              {info.busContactName}
              {info.busContactName && info.busContactPhone ? " · " : null}
              {info.busContactPhone && <a href={telHref(info.busContactPhone)} style={linkStyle}>{info.busContactPhone}</a>}
            </div>
          )}
          {/* Bus driver contact — host-facing only, never shown to participants. */}
          {isHost && (info.busDriverName || info.busDriverPhone) && (
            <div style={{ color: "#64748b" }}>
              <span style={{ fontWeight: 600 }}>Driver: </span>
              {info.busDriverName}
              {info.busDriverName && info.busDriverPhone ? " · " : null}
              {info.busDriverPhone && <a href={telHref(info.busDriverPhone)} style={linkStyle}>{info.busDriverPhone}</a>}
            </div>
          )}
          {info.busCapacity ? <div style={{ color: "#64748b" }}>{info.busCapacity} passengers</div> : null}
          {editLink(onEditBus, "Edit Bus Item →")}
          {renderConf("bus", "Bus Confirmation")}
        </>
      ),
    },
  ];

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
          <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
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
            {rows.map((r, i) => (
              <Fragment key={r.label}>
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
                style={{ background: BRAND.teal, border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
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
