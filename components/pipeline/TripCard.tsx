"use client";

import { BRAND } from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";

interface Props {
  tour: any;
  currentHostId: string;
  isDuplicating: boolean;
  onClick: () => void;
  onDuplicate: () => void;
}

export default function TripCard({ tour, currentHostId, isDuplicating, onClick, onDuplicate }: Props) {
  const members: any[] = tour.tour_members ?? [];
  const memberCount = members.length;
  const waiverPending = members.filter((m: any) => m.type === "student" && !m.waiver).length;
  const host = tour.tour_hosts;
  const isOwn = tour.tour_host_id === currentHostId;

  const initials = host?.initials ||
    (host?.name ?? "").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ||
    "?";

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div onClick={onClick} style={{ cursor: "pointer" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, marginBottom: 3, fontFamily: "'Cormorant Garamond', Georgia, serif", lineHeight: 1.3 }}>
          {tour.name}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{tour.school}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
          {tour.destination}{tour.dates ? ` · ${tour.dates}` : ""}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          <StatusPill status={tour.status} />
          {memberCount > 0 && (
            <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "2px 7px" }}>
              {memberCount} traveler{memberCount !== 1 ? "s" : ""}
            </span>
          )}
          {waiverPending > 0 && (
            <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 7px" }}>
              {waiverPending} waiver{waiverPending !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {host && (
          <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              background: isOwn ? BRAND.teal : "#94a3b8",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {initials}
            </div>
            {host.name}
            {!isOwn && <span style={{ color: "#bfdbfe", fontSize: 9 }}> · view only</span>}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 10, paddingTop: 8, display: "flex", gap: 6 }}>
        <button
          onClick={onClick}
          style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 0", fontSize: 11, fontWeight: 600, color: BRAND.navy, cursor: "pointer", fontFamily: "inherit" }}
        >
          Open
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDuplicate(); }}
          disabled={isDuplicating}
          title="Duplicate this tour as a new bid"
          style={{ flex: 1, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 6, padding: "4px 0", fontSize: 11, fontWeight: 600, color: "#0369a1", cursor: isDuplicating ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isDuplicating ? 0.6 : 1 }}
        >
          {isDuplicating ? "Copying..." : "⧉ Duplicate"}
        </button>
      </div>
    </div>
  );
}
