"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, MapPin, Users, FileWarning, ExternalLink } from "lucide-react";
import { STATUSES, BRAND, getStatus, initialsFrom, tourDateLabel } from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";
import type { TourWithHostAndMembers } from "@/lib/types";

function SummaryCard({ tour, isOwn, onOpenTour }: {
  tour: TourWithHostAndMembers; isOwn: boolean; onOpenTour: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const members = tour.tour_members ?? [];
  const travelers = members.length;
  const waiversPending = members.filter(m => m.type === "student" && !m.waiver).length;
  const initials = tour.tour_hosts?.initials || initialsFrom(tour.tour_hosts?.name);

  return (
    <div style={{ background: "#fff", border: "1px solid #e8eef4", borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,.03)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "9px 11px", fontFamily: "inherit", display: "flex", gap: 8, alignItems: "flex-start" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.navy, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tour.name}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
            {tour.school}
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{tourDateLabel(tour.dates, tour.start_date, tour.end_date)}</div>
        </div>
        <div
          title={tour.tour_hosts?.name ?? ""}
          style={{ width: 22, height: 22, borderRadius: "50%", background: isOwn ? BRAND.teal : "#94a3b8", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 11px 11px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <StatusPill status={tour.status} />
          </div>
          {tour.destination && (
            <div style={{ fontSize: 11.5, color: "#475569", display: "flex", alignItems: "center", gap: 5 }}>
              <MapPin size={12} style={{ flexShrink: 0, color: "#94a3b8" }} />{tour.destination}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Users size={11} />{travelers} traveler{travelers !== 1 ? "s" : ""}
            </span>
            {waiversPending > 0 && (
              <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <FileWarning size={11} />{waiversPending} waiver{waiversPending !== 1 ? "s" : ""} pending
              </span>
            )}
          </div>
          <button
            onClick={() => onOpenTour(tour.id)}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            <ExternalLink size={12} />Open Tour
          </button>
        </div>
      )}
    </div>
  );
}

export default function PipelineSummary({ tours, currentHostId, onOpenTour }: {
  tours: TourWithHostAndMembers[];
  currentHostId: string;
  onOpenTour: (id: string) => void;
}) {
  const [open, setOpen] = useState(false); // section collapsed by default

  return (
    <section style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        {open ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
        <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Pipeline Summary
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
          {tours.length} tour{tours.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, alignItems: "start" }}>
          {STATUSES.map(st => {
            const col = tours.filter(t => t.status === st.id);
            return (
              <div key={st.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9, position: "sticky", top: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: getStatus(st.id).color, textTransform: "uppercase", letterSpacing: 0.7 }}>{st.label}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{col.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: "70vh", overflowY: "auto" }}>
                  {col.map(t => (
                    <SummaryCard key={t.id} tour={t} isOwn={t.tour_host_id === currentHostId} onOpenTour={onOpenTour} />
                  ))}
                  {col.length === 0 && (
                    <div style={{ border: "1.5px dashed #e2e8f0", borderRadius: 9, padding: 14, textAlign: "center", color: "#cbd5e1", fontSize: 11 }}>
                      None
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
