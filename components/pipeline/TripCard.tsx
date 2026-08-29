"use client";

import { BRAND, expandStateName } from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";

interface Props {
  tour: any;
  currentHostId: string;
  /** Whether the viewer may edit this tour (owner, listed staff, or admin). */
  canEdit?: boolean;
  isDuplicating: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  /** Delete this tour (own tours only). Opens a confirm dialog upstream. */
  onDelete?: () => void;
}

export default function TripCard({ tour, currentHostId, canEdit, isDuplicating, onClick, onDuplicate, onDelete }: Props) {
  const members: any[] = tour.tour_members ?? [];
  const memberCount = members.length;
  const waiverPending = members.filter((m: any) => m.type === "student" && !m.waiver).length;
  const host = tour.tour_hosts;
  const isOwn = tour.tour_host_id === currentHostId;
  const editable = canEdit ?? isOwn;

  const initials = host?.initials ||
    (host?.name ?? "").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ||
    "?";

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 12, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
      <div onClick={onClick} style={{ cursor: "pointer" }}>
        {/* Fjalla One ships a single 400 weight — asking for bold forces the
            browser to fake it, which renders blurry. Keep it at 400. */}
        <div style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)", marginBottom: 3, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em", lineHeight: 1.3 }}>
          {tour.name}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{tour.school}</div>
        <div style={{ fontSize: 11, color: "var(--muted-2)", marginBottom: 8 }}>
          {expandStateName(tour.destination)}{tour.dates ? ` · ${tour.dates}` : ""}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          <StatusPill status={tour.status} />
          {memberCount > 0 && (
            <span style={{ fontSize: 11, background: "var(--surface-3)", color: "var(--text-2)", borderRadius: 6, padding: "2px 7px" }}>
              {memberCount} traveler{memberCount !== 1 ? "s" : ""}
            </span>
          )}
          {waiverPending > 0 && (
            <span style={{ fontSize: 11, background: "var(--amber-bg)", color: "var(--amber-text)", borderRadius: 6, padding: "2px 7px" }}>
              {waiverPending} waiver{waiverPending !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {host && (
          <div style={{ fontSize: 10, color: "var(--muted-2)", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              background: isOwn ? BRAND.blue : "var(--muted-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8, fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>
              {initials}
            </div>
            {host.name}
            {!editable && <span style={{ color: "var(--sky-border)", fontSize: 9 }}> · view only</span>}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--surface-3)", marginTop: 10, paddingTop: 8, display: "flex", gap: 6 }}>
        <button
          onClick={onClick}
          style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", fontSize: 11, fontWeight: 600, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit" }}
        >
          Open
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDuplicate(); }}
          disabled={isDuplicating}
          title="Duplicate this tour as a new quote"
          style={{ flex: 1, background: "var(--sky-bg-soft)", border: "1px solid var(--sky-border)", borderRadius: 6, padding: "4px 0", fontSize: 11, fontWeight: 600, color: "var(--sky-text)", cursor: isDuplicating ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: isDuplicating ? 0.6 : 1 }}
        >
          {isDuplicating ? "Copying..." : "⧉ Duplicate"}
        </button>
        {isOwn && onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete this tour (accidental duplicate, cancelled trip…)"
            style={{ flex: "0 0 auto", background: "var(--surface)", border: "1px solid var(--red-border)", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 600, color: "var(--red-text)", cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
