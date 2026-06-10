"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BRAND, formatFullDate } from "@/lib/helpers";
import type { TripInfo } from "@/lib/types";

const HOTLINE_DISPLAY = "(801) 477-8963";
const HOTLINE_TEL = "8014778963";

const linkStyle: React.CSSProperties = { color: "#0369a1", textDecoration: "none", fontWeight: 600 };
const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");
const telHref = (phone: string) => `tel:${phone.replace(/[^\d]/g, "")}`;

export default function TripInformation({ info }: { info: TripInfo }) {
  const [open, setOpen] = useState(true); // expanded by default

  const rows: { label: string; content: React.ReactNode }[] = [
    {
      label: "Teacher Name",
      content: (
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
      content: (
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
          <div>
            {info.performingStudents} Performing Students, {info.chaperones} Chaperones, {info.siblings} Siblings, {info.tourHosts} Tour Hosts
          </div>
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
      content: (
        <>
          <div>{dash(info.hotelName)}</div>
          {info.hotelAddress && <div style={{ color: "#64748b" }}>{info.hotelAddress}</div>}
          {info.hotelRooms && <div style={{ color: "#64748b" }}>{info.hotelRooms}</div>}
        </>
      ),
    },
    {
      label: "Bus",
      content: (
        <div>
          {[info.busCompany, info.busCapacity ? `${info.busCapacity} passengers` : null]
            .filter(Boolean).join(" · ") || "—"}
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)", marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
        <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Trip Information
        </span>
      </button>

      {open && (
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
      )}
    </div>
  );
}
