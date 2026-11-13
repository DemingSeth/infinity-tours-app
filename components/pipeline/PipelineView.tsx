"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { STATUSES, BRAND, parseISODate, parseAgendaDate, expandDateRange, tourDateRange, startOfDay } from "@/lib/helpers";
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

// Everything a person might type to find a tour (September 2026 request):
// tour name, destination, dates, school contact, teachers, tour hosts and
// consultants. Case-insensitive; every word typed must match somewhere, so
// "rigby nyc" finds the Rigby tour to New York.
function tourSearchText(t: any): string {
  const names = (list: any) => (Array.isArray(list) ? list : [])
    .map((p: any) => [p?.name, p?.contact].filter(Boolean).join(" "))
    .join(" ");
  return [
    t.name, t.destination, t.dates, t.start_date, t.end_date,
    t.contact_name, t.contact_email,
    t.traveling_tour_host, t.planning_tour_host,
    t.tour_hosts?.name,
    names(t.teachers), names(t.tour_hosts_list), names(t.consultants),
  ].filter(Boolean).join(" ").toLowerCase();
}

// ── On Tour Now (November 2026, Linda) ─────────────────────────────────────
// A tour on the road today goes to the top of the pipeline instead of sitting
// under every Quote and Signed card (on a phone the columns stack, Quote
// first). It counts when it is Signed or On Tour and today falls within its
// dates (start_date / end_date, else the free-text dates). An On Tour tour
// with no readable dates counts too, since the host marked it. Quotes and
// completed tours never do.

// Today on the DEVICE's calendar, read only in the browser. The server runs on
// UTC, so on a host's evening it would already be tomorrow there, and the
// server and browser would disagree about which tours are on the road. The
// server snapshot is null: the section appears once the page is live.
const noSubscribe = () => () => {};
const deviceDayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function useDeviceToday(): Date | null {
  const key = useSyncExternalStore(noSubscribe, deviceDayKey, () => null);
  return key ? parseISODate(key) : null;
}

const DAY_MS = 86400000;
function onTourNow(t: any, today: Date): { startMs: number; label: string } | null {
  if (t.status !== "committed" && t.status !== "in-progress") return null;
  const range = tourDateRange(t);
  if (!range) return t.status === "in-progress" ? { startMs: Infinity, label: "On tour" } : null;
  const s = startOfDay(range.start).getTime();
  const e = startOfDay(range.end).getTime();
  const now = startOfDay(today).getTime();
  if (now < s || now > e) return null;
  // Rounded: a daylight saving change makes one "day" 23 or 25 hours.
  const day = Math.round((now - s) / DAY_MS) + 1;
  const days = Math.round((e - s) / DAY_MS) + 1;
  return { startMs: s, label: days > 1 ? `Day ${day} of ${days}` : "Today" };
}

export function matchesTourSearch(t: any, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = tourSearchText(t);
  return words.every(w => text.includes(w));
}

export default function PipelineView({
  tours, currentHostId, currentHostName, viewer, duplicatingId, onSelectTour, onNewTour, onDuplicate, onDelete,
}: Props) {
  const [hostFilter, setHostFilter] = useState<"mine" | "all">("mine");
  const [search, setSearch] = useState("");
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
  const scoped = hostFilter === "mine"
    ? tours.filter(t => canEditTour(t, listedViewer))
    : tours;
  // Search applies within whichever list is showing (My Tours or All Tours).
  const searching = search.trim().length > 0;
  const filtered = searching ? scoped.filter(t => matchesTourSearch(t, search)) : scoped;

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

  // Tours on the road today lead the page and leave their status column, so
  // no tour shows twice. Same list as the board: My Tours / All Tours and the
  // search both apply.
  const today = useDeviceToday();
  const live = today
    ? sorted
        .map(t => ({ tour: t, now: onTourNow(t, today) }))
        .filter((x): x is { tour: any; now: { startMs: number; label: string } } => x.now !== null)
        .sort((a, b) => a.now.startMs - b.now.startMs)
    : [];
  const liveIds = new Set(live.map(x => x.tour.id));
  const board = liveIds.size ? sorted.filter(t => !liveIds.has(t.id)) : sorted;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One', Georgia, sans-serif", margin: 0, letterSpacing: -0.5 }}>
            Tour Pipeline
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {searching
              ? <>{filtered.length} of {scoped.length} tour{scoped.length !== 1 ? "s" : ""} match</>
              : <>{filtered.length} tour{filtered.length !== 1 ? "s" : ""}</>} · logged in as <strong>{currentHostName}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", flex: "1 1 220px", minWidth: 0, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 10, color: "var(--muted-2)", pointerEvents: "none" }} />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setSearch(""); }}
              placeholder="Search tours, schools, hosts..."
              aria-label="Search tours"
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 30px 7px 30px", fontSize: 13, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)", outline: "none" }}
            />
            {searching && (
              <button type="button" onClick={() => setSearch("")} title="Clear search" aria-label="Clear search"
                style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 2, display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
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

      {searching && hostFilter === "mine" && filtered.length === 0 && tours.some(t => matchesTourSearch(t, search)) && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
          No matches in My Tours.{" "}
          <button type="button" onClick={() => setHostFilter("all")}
            style={{ background: "none", border: "none", padding: 0, color: BRAND.blue, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            Search All Tours
          </button>
        </div>
      )}

      {live.length > 0 && (
        <section aria-label="On tour now" style={{ background: "var(--sky-bg-soft)", border: "1.5px solid var(--sky-border)", borderRadius: 14, padding: 12, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, padding: "0 2px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sky-text)", textTransform: "uppercase", letterSpacing: 0.8 }}>On Tour Now</span>
            <span style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: "auto" }}>{live.length}</span>
          </div>
          {/* Same column widths as the board below (pipeline-grid). */}
          <div className="pipeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
            {live.map(({ tour: t, now }) => (
              <TripCard
                key={t.id}
                tour={t}
                liveLabel={now.label}
                currentHostId={currentHostId}
                canEdit={canEditTour(t, viewer)}
                isDuplicating={duplicatingId === t.id}
                onClick={() => onSelectTour(t.id)}
                onDuplicate={() => onDuplicate(t.id)}
                onDelete={onDelete ? () => onDelete(t.id) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      <div className="pipeline-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
        {STATUSES.map(st => {
          const col = board.filter(t => t.status === st.id);
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
                {col.map((t, ti) => (
                  <TripCard
                    key={t.id}
                    tour={t}
                    alt={ti % 2 === 1}
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
                    {searching ? "No matches" : "No tours"}
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
