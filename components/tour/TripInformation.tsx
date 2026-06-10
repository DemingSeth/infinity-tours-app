"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { BRAND, formatFullDate } from "@/lib/helpers";
import TripConfirmationsRow from "@/components/tour/TripConfirmationsRow";
import type { TripInfo } from "@/lib/types";

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
  /** When true (tour host / internal view) show the inline edit affordance + confirmations. */
  isHost?: boolean;
  /** Tour id — required for the host-only Confirmations row uploads. */
  tourId?: string;
  /** Persists tour-record fields (contact_name, contact_email, traveling_tour_host, bus_capacity). */
  onSaveTour?: (patch: Record<string, any>) => void | Promise<void>;
  /** Persists the tour host phone to the logged-in user's tour_hosts record. */
  onSaveHostPhone?: (phone: string | null) => void | Promise<void>;
  /** Opens the hotel itinerary item's edit modal. Null when no hotel item exists. */
  onEditHotel?: (() => void) | null;
  /** Opens the bus itinerary item's edit modal. Null when no bus item exists. */
  onEditBus?: (() => void) | null;
}

export default function TripInformation({ info, isHost = false, tourId, onSaveTour, onSaveHostPhone, onEditHotel, onEditBus }: TripInformationProps) {
  const [open, setOpen] = useState(true); // expanded by default
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ teacherName: "", teacherEmail: "", tourHostName: "", tourHostPhone: "", busCapacity: "" });

  function startEdit() {
    setForm({
      teacherName: info.teacherName ?? "",
      teacherEmail: info.teacherEmail ?? "",
      tourHostName: info.tourHostName ?? "",
      tourHostPhone: info.tourHostPhone ?? "",
      busCapacity: info.busCapacity != null ? String(info.busCapacity) : "",
    });
    setOpen(true);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        onSaveTour?.({
          contact_name: form.teacherName.trim() || null,
          contact_email: form.teacherEmail.trim() || null,
          traveling_tour_host: form.tourHostName.trim() || null,
          bus_capacity: Number(form.busCapacity) || 0,
        }),
        onSaveHostPhone?.(form.tourHostPhone.trim() || null),
      ]);
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
      content: (
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
            <div style={{ color: "#94a3b8" }}>Add a bus travel item to populate this field.</div>
          )}
        </div>
      ) : !info.hasBus ? (
        <div style={{ color: "#94a3b8" }}>Add a bus travel item to populate this field.</div>
      ) : (
        <>
          <div>{dash(info.busCompany)}</div>
          {(info.busContactName || info.busContactPhone) && (
            <div style={{ color: "#64748b" }}>
              {info.busContactName}
              {info.busContactName && info.busContactPhone ? " · " : null}
              {info.busContactPhone && <a href={telHref(info.busContactPhone)} style={linkStyle}>{info.busContactPhone}</a>}
            </div>
          )}
          {info.busCapacity ? <div style={{ color: "#64748b" }}>{info.busCapacity} passengers</div> : null}
        </>
      ),
    },
  ];

  // Host-only "Confirmations" row appended at the bottom (read + edit mode).
  if (isHost && tourId) {
    rows.push({ label: "Confirmations", content: <TripConfirmationsRow tourId={tourId} /> });
  }

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
