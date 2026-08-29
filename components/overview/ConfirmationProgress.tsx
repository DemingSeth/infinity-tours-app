"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Filter, X } from "lucide-react";
import { MONTH_NAMES, STATUSES, parseISODate, tourDateLabel, hostNameOf } from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";
import type { OverviewTour } from "@/lib/types";

// Confirmation completeness per tour (August 2026 request): every itinerary
// item that expects a confirmation counts, and an item is "done" once a
// confirmation file or link is attached. Items marked "no confirmation
// required" are left out of both numbers, matching the Confirmations tab badge.
export function confirmationStats(tour: OverviewTour) {
  const items = (tour.agenda_items ?? []).filter(i => !i.confirmation_not_required);
  const done = items.filter(i => (i.confirmation_urls?.length ?? 0) > 0).length;
  const total = items.length;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : null };
}

function barColor(pct: number | null): string {
  if (pct === null) return "#cbd5e1";
  if (pct >= 100) return "#16a34a";
  if (pct >= 60) return "#2563eb";
  if (pct >= 30) return "#d97706";
  return "#dc2626";
}

function Bar({ done, total, pct, height = 8 }: { done: number; total: number; pct: number | null; height?: number }) {
  return (
    <div title={total > 0 ? `${done} of ${total} confirmed` : "No items expecting a confirmation"}
      style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ flex: 1, height, borderRadius: 99, background: "var(--border-soft)", overflow: "hidden", minWidth: 80 }}>
        <div style={{ width: `${pct ?? 0}%`, height: "100%", background: barColor(pct), borderRadius: 99, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: pct === null ? "var(--muted-2)" : barColor(pct), width: 42, textAlign: "right", flexShrink: 0 }}>
        {pct === null ? "n/a" : `${pct}%`}
      </span>
      <span style={{ fontSize: 11, color: "var(--muted-2)", width: 58, flexShrink: 0 }}>
        {total > 0 ? `${done} / ${total}` : "no items"}
      </span>
    </div>
  );
}

type Scope = "upcoming" | "all";

const filterInput: React.CSSProperties = {
  border: "1px solid var(--border)", borderRadius: 7, padding: "5px 8px", fontSize: 12,
  fontFamily: "inherit", background: "var(--surface)", color: "var(--text)", outline: "none",
};

export default function ConfirmationProgress({ tours, onOpenTour }: {
  tours: OverviewTour[];
  onOpenTour: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Closed tours are finished business; hide them unless asked.
  const [scope, setScope] = useState<Scope>("upcoming");
  // Filters: tour host (account), status, and a start-date range.
  const [hostFilter, setHostFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const filtersActive = !!(hostFilter || statusFilter || fromDate || toDate);

  // Host choices come from the tours themselves (account owner, else the
  // free-text host name), so the list only offers people who have tours.
  const hostOptions = useMemo(() => {
    const seen: Record<string, string> = {};
    for (const t of tours) {
      const key = t.tour_hosts?.id ?? `name:${hostNameOf(t)}`;
      if (!seen[key]) seen[key] = hostNameOf(t);
    }
    return Object.entries(seen).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tours]);
  const hostKeyOf = (t: OverviewTour) => t.tour_hosts?.id ?? `name:${hostNameOf(t)}`;

  const visible = useMemo(() => {
    const from = parseISODate(fromDate);
    const to = parseISODate(toDate);
    const list = tours.filter(t => {
      if (scope !== "all" && t.status === "closed") return false;
      if (hostFilter && hostKeyOf(t) !== hostFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (from || to) {
        const s = parseISODate(t.start_date);
        if (!s) return false;
        if (from && s < from) return false;
        if (to && s > to) return false;
      }
      return true;
    });
    // Dated tours first (soonest first), undated at the end.
    return [...list].sort((a, b) => {
      const am = parseISODate(a.start_date)?.getTime() ?? Infinity;
      const bm = parseISODate(b.start_date)?.getTime() ?? Infinity;
      return am - bm || a.name.localeCompare(b.name);
    });
  }, [tours, scope, hostFilter, statusFilter, fromDate, toDate]);

  // Totals across every listed tour, and per month (by start date).
  const overall = useMemo(() => {
    let done = 0, total = 0;
    for (const t of visible) { const s = confirmationStats(t); done += s.done; total += s.total; }
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : null };
  }, [visible]);

  const months = useMemo(() => {
    const map = new Map<string, { label: string; tours: OverviewTour[]; done: number; total: number }>();
    for (const t of visible) {
      const d = parseISODate(t.start_date);
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "undated";
      const label = d ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : "No dates yet";
      if (!map.has(key)) map.set(key, { label, tours: [], done: 0, total: 0 });
      const m = map.get(key)!;
      const s = confirmationStats(t);
      m.tours.push(t); m.done += s.done; m.total += s.total;
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a === "undated" ? 1 : b === "undated" ? -1 : a.localeCompare(b))).map(([, v]) => v);
  }, [visible]);

  return (
    <section style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 14, overflow: "hidden" }}>
      {/* Header: click anywhere on the row to expand or collapse. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(c => !c)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed(c => !c); } }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: collapsed ? "none" : "1px solid var(--surface-3)", flexWrap: "wrap", cursor: "pointer", userSelect: "none" }}
      >
        <ClipboardCheck size={18} style={{ color: "var(--muted)" }} />
        <span style={{ fontSize: 16, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
          Confirmation Progress
        </span>
        <span style={{ fontSize: 12, color: "var(--muted-2)" }}>
          {visible.length} tour{visible.length !== 1 ? "s" : ""}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 1, background: "var(--surface-3)", borderRadius: 8, padding: 3 }}>
            {([{ value: "upcoming", label: "Upcoming" }, { value: "all", label: "All tours" }] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: scope === opt.value ? "var(--surface)" : "transparent",
                  color: scope === opt.value ? "var(--ink)" : "var(--muted-2)",
                  boxShadow: scope === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div>
          {/* Filters: host, status, start-date range. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "10px 18px", borderBottom: "1px solid var(--surface-3)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              <Filter size={12} />Filter
            </span>
            <select value={hostFilter} onChange={e => setHostFilter(e.target.value)} aria-label="Tour host" style={filterInput}>
              <option value="">All tour hosts</option>
              {hostOptions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Status" style={filterInput}>
              <option value="">Any status</option>
              {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              From
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={filterInput} />
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              To
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={filterInput} />
            </label>
            {filtersActive && (
              <button type="button" onClick={() => { setHostFilter(""); setStatusFilter(""); setFromDate(""); setToDate(""); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface-3)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
                <X size={12} />Clear
              </button>
            )}
          </div>
          {/* All tours together */}
          <div style={{ padding: "12px 18px", background: "var(--surface-2)", borderBottom: "1px solid var(--surface-3)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
              All {scope === "upcoming" ? "upcoming " : ""}tours together
            </div>
            <Bar {...overall} height={10} />
          </div>

          {visible.length === 0 && (
            <div style={{ padding: "18px", fontSize: 12, color: "var(--muted-2)" }}>{filtersActive ? "No tours match these filters." : "No tours to show."}</div>
          )}

          {months.map(m => {
            const mpct = m.total > 0 ? Math.round((m.done / m.total) * 100) : null;
            return (
              <div key={m.label} style={{ borderBottom: "1px solid var(--surface-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", background: "var(--surface-2)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", minWidth: 130 }}>{m.label}</span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Bar done={m.done} total={m.total} pct={mpct} height={6} />
                  </div>
                </div>
                {m.tours.map(t => {
                  const s = confirmationStats(t);
                  return (
                    <div key={t.id}
                      onClick={() => onOpenTour(t.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px 10px 28px", cursor: "pointer", flexWrap: "wrap", borderTop: "1px solid var(--surface-2)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "var(--muted-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {[t.school, tourDateLabel(t.dates, t.start_date, t.end_date), hostNameOf(t)].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}><StatusPill status={t.status} /></div>
                      <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                        <Bar {...s} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
