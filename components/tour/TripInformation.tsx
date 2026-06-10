"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { BRAND, formatFullDate } from "@/lib/helpers";
import type { TripInfo } from "@/lib/types";

const HOTLINE_DISPLAY = "(801) 477-8963";
const HOTLINE_TEL = "8014778963";

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
const noteStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11.5, marginTop: 2 };

interface TripInformationProps {
  info: TripInfo;
  /** When true (tour host / internal view) show the inline edit affordance. */
  isHost?: boolean;
  /** Persists tour-record fields (contact_name, contact_email, traveling_tour_host, bus_capacity). */
  onSaveTour?: (patch: Record<string, any>) => void | Promise<void>;
  /** Opens the hotel itinerary item's edit modal. Null when no hotel item exists. */
  onEditHotel?: (() => void) | null;
  /** Opens the bus itinerary item's edit modal. Null when no bus item exists. */
  onEditBus?: (() => void) | null;
}

export default function TripInformation({ info, isHost = false, onSaveTour, onEditHotel, onEditBus }: TripInformationProps) {
  const [open, setOpen] = useState(true); // expanded by default
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ teacherName: "", teacherEmail: "", tourHostName: "", busCapacity: "" });

  function startEdit() {
    setForm({
      teacherName: info.teacherName ?? "",
      teacherEmail: info.teacherEmail ?? "",
      tourHostName: info.tourHostName ?? "",
      busCapacity: info.busCapacity != null ? String(info.busCapacity) : "",
    });
    setOpen(true);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await onSaveTour?.({
        contact_name: form.teacherName.trim() || null,
        contact_email: form.teacherEmail.trim() || null,
        traveling_tour_host: form.tourHostName.trim() || null,
        bus_capacity: Number(form.busCapacity) || 0,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
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
          <div>
            {dash(info.tourHostPhone)}
            <div style={noteStyle}>Edit phone in your profile settings</div>
          </div>
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
      content: (
        <>
          <div>{info.participants.map(p => `${p.count} ${p.label}`).join(", ") || "—"}</div>
          <div style={{ color: BRAND.teal, fontWeight: 700, marginTop: 2 }}>
            {info.totalParticipants} Total Participants
          </div>
        </>
      ),
    },
    { label: "Departure", content: formatFullDate(info.departure) },
    { label: "Return", content: formatFullDate(info.returnDate) },
    {
      label: "Hotel",
      content: editing ? (
        onEditHotel ? (
          <div>
            <div>{dash(info.hotelName)}</div>
            {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
            <button type="button" onClick={onEditHotel} style={linkBtnStyle}>Edit Hotel Item →</button>
          </div>
        ) : (
          <div style={{ color: "#94a3b8" }}>Add a Hotel item to your itinerary to populate this field.</div>
        )
      ) : (
        <>
          <div>{dash(info.hotelName)}</div>
          {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
          {info.hotelRooms && <div style={{ color: "#64748b" }}>{info.hotelRooms}</div>}
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
            <div style={{ color: "#94a3b8" }}>Add a bus travel item with a contact name to populate this field.</div>
          )}
        </div>
      ) : (
        <div>
          {[info.busCompany, info.busCapacity ? `${info.busCapacity} passengers` : null]
            .filter(Boolean).join(" · ") || "—"}
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px" }}>
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 8, padding: 0,
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
        >
          {open ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
          <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Trip Information
          </span>
        </button>
        {isHost && !editing && (
          <button
            type="button"
            onClick={startEdit}
            title="Edit Trip Information"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, background: "#f1f5f9",
              border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 600,
              color: "#475569", cursor: "pointer", fontFamily: "inherit",
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
                  padding: "10px 16px", fontSize: 11.5, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: 0.4,
                  borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                  background: "#fbfcfe",
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "#fbfcfe" }}>
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
