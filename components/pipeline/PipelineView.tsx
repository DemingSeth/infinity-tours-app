"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { STATUSES, BRAND, parseISODate, parseAgendaDate, expandDateRange } from "@/lib/helpers";
import { canEditTour, type EditorViewer } from "@/lib/roles";
import TripCard from "./TripCard";

interface Props {
  tours: any[];
  currentHostId: string;
  currentHostName: string;
  viewer: EditorViewer;
  duplicatingId: string | null;
  onSelectTour: (id: string) => void;
  onNewTour: () => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Best-effort departure timestamp for sorting: the start_date column, else the
// first parseable date in the free-text `dates` field, else none (sorts last).
function departureMs(tour: any): number | null {
  const iso = parseISODate(tour.start_date);
  if (iso) return iso.getTime();
  if (tour.dates) {
    // Range-format free text ("March 16-21, 2027") first — its trailing year is
    // only captured by the range parser; parseAgendaDate would read it as the
    // CURRENT year and mis-sort the tour by up to a year.
    const range = expandDateRange(String(tour.dates));
    if (range.length) return range[0].getTime();
    const parsed = parseAgendaDate(String(tour.dates));
    if (parsed) return parsed.getTime();
  }
  return null;
}

export default function PipelineView({
  tours, currentHostId, currentHostName, viewer, duplicatingId, onSelectTour, onNewTour, onDuplicate, onDelete,
}: Props) {
  const [hostFilter, setHostFilter] = useState<"mine" | "all">("mine");
  // Sort order: departure date (soonest first, undated last) — the default per
  // the July 2026 request — or most recently created.
  const [sortMode, setSortMode] = useState<"departure" | "recent">("departure");
  // Per-status column collapse (August 2026 request): a collapsed column shows
  // just its header + count so a busy board can be narrowed to what matters.
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const toggleCol = (id: string) => setCollapsedCols(c => ({ ...c, [id]: !c[id] }));

  // "My Tours" = tours I created PLUS tours I am listed on as a Tour Host or
  // Tour Consultant (August 2026 request). Admin rights are deliberately left
  // out of this filter, otherwise an admin's "My Tours" would be every tour.
  const listedViewer: EditorViewer = { ...viewer, role: null };
  const filtered = hostFilter === "mine"
    ? tours.filter(t => canEditTour(t, listedViewer))
    : tours;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "recent") {
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    }
    const am = departureMs(a); const bm = departureMs(b);
    if (am === null && bm === null) return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    if (am === null) return 1;
    if (bm === null) return -1;
    return am - bm;
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One', Georgia, sans-serif", margin: 0, letterSpacing: -0.5 }}>
            Tour Pipeline
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {filtered.length} tour{filtered.length !== 1 ? "s" : ""} · logged in as <strong>{currentHostName}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 1, background: "var(--surface-3)", borderRadius: 8, padding: 3 }}>
            {([{ value: "departure", label: "By Departure" }, { value: "recent", label: "Recently Added" }] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                title={opt.value === "departure" ? "Order tours by departure date (soonest first)" : "Order tours by when they were created"}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: sortMode === opt.value ? "var(--surface)" : "transparent",
                  color: sortMode === opt.value ? "var(--ink)" : "var(--muted-2)",
                  boxShadow: sortMode === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  transition: "all .12s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 1, background: "var(--surface-3)", borderRadius: 8, padding: 3 }}>
            {([{ value: "mine", label: "My Tours" }, { value: "all", label: "All Tours" }] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setHostFilter(opt.value)}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: hostFilter === opt.value ? "var(--surface)" : "transparent",
                  color: hostFilter === opt.value ? "var(--ink)" : "var(--muted-2)",
                  boxShadow: hostFilter === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  transition: "all .12s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={onNewTour}
            style={{
              background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            New Tour
          </button>
        </div>
      </div>

      <div className="pipeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
        {STATUSES.map(st => {
          const col = sorted.filter(t => t.status === st.id);
          const collapsed = !!collapsedCols[st.id];
          return (
            <div key={st.id} style={{ minWidth: 0 }}>
              <button
                type="button"
                onClick={() => toggleCol(st.id)}
                aria-expanded={!collapsed}
                title={collapsed ? `Show ${st.label} tours` : `Hide ${st.label} tours`}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, marginBottom: 10, background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                {collapsed ? <ChevronRight size={13} style={{ color: "var(--muted-2)" }} /> : <ChevronDown size={13} style={{ color: "var(--muted-2)" }} />}
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.8 }}>{st.label}</span>
                <span style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: "auto" }}>{col.length}</span>
              </button>
              <div style={{ display: collapsed ? "none" : "flex", flexDirection: "column", gap: 8 }}>
                {col.map(t => (
                  <TripCard
                    key={t.id}
                    tour={t}
                    currentHostId={currentHostId}
                    canEdit={canEditTour(t, viewer)}
                    isDuplicating={duplicatingId === t.id}
                    onClick={() => onSelectTour(t.id)}
                    onDuplicate={() => onDuplicate(t.id)}
                    onDelete={onDelete ? () => onDelete(t.id) : undefined}
                  />
                ))}
                {col.length === 0 && (
                  <div style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: 18, textAlign: "center", color: "var(--muted-3)", fontSize: 12 }}>
                    No tours
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
