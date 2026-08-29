"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import { BRAND, MONTH_NAMES, parseISODate, tourDateLabel, hostNameOf } from "@/lib/helpers";
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
      <div style={{ flex: 1, height, borderRadius: 99, background: "#eef2f7", overflow: "hidden", minWidth: 80 }}>
        <div style={{ width: `${pct ?? 0}%`, height: "100%", background: barColor(pct), borderRadius: 99, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: pct === null ? "#94a3b8" : barColor(pct), width: 42, textAlign: "right", flexShrink: 0 }}>
        {pct === null ? "n/a" : `${pct}%`}
      </span>
      <span style={{ fontSize: 11, color: "#94a3b8", width: 58, flexShrink: 0 }}>
        {total > 0 ? `${done} / ${total}` : "no items"}
      </span>
    </div>
  );
}

type Scope = "upcoming" | "all";

export default function ConfirmationProgress({ tours, onOpenTour }: {
  tours: OverviewTour[];
  onOpenTour: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Closed tours are finished business; hide them unless asked.
  const [scope, setScope] = useState<Scope>("upcoming");

  const visible = useMemo(() => {
    const list = scope === "all" ? tours : tours.filter(t => t.status !== "closed");
    // Dated tours first (soonest first), undated at the end.
    return [...list].sort((a, b) => {
      const am = parseISODate(a.start_date)?.getTime() ?? Infinity;
      const bm = parseISODate(b.start_date)?.getTime() ?? Infinity;
      return am - bm || a.name.localeCompare(b.name);
    });
  }, [tours, scope]);

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
    <section style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, overflow: "hidden" }}>
      {/* Header: click anywhere on the row to expand or collapse. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(c => !c)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed(c => !c); } }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: collapsed ? "none" : "1px solid #f1f5f9", flexWrap: "wrap", cursor: "pointer", userSelect: "none" }}
      >
        <ClipboardCheck size={18} color="#64748b" />
        <span style={{ fontSize: 16, fontWeight: 400, color: BRAND.navy, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
          Confirmation Progress
        </span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {visible.length} tour{visible.length !== 1 ? "s" : ""}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 1, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
            {([{ value: "upcoming", label: "Upcoming" }, { value: "all", label: "All tours" }] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: scope === opt.value ? "#fff" : "transparent",
                  color: scope === opt.value ? BRAND.navy : "#94a3b8",
                  boxShadow: scope === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b" }}
            onClick={() => setCollapsed(c => !c)} aria-hidden>
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </span>
        </div>
      </div>

      {!collapsed && (
        <div>
          {/* All tours together */}
          <div style={{ padding: "12px 18px", background: "#fbfcfe", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
              All {scope === "upcoming" ? "upcoming " : ""}tours together
            </div>
            <Bar {...overall} height={10} />
          </div>

          {visible.length === 0 && (
            <div style={{ padding: "18px", fontSize: 12, color: "#94a3b8" }}>No tours to show.</div>
          )}

          {months.map(m => {
            const mpct = m.total > 0 ? Math.round((m.done / m.total) * 100) : null;
            return (
              <div key={m.label} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", background: "#fbfcfe", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: BRAND.navy, minWidth: 130 }}>{m.label}</span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Bar done={m.done} total={m.total} pct={mpct} height={6} />
                  </div>
                </div>
                {m.tours.map(t => {
                  const s = confirmationStats(t);
                  return (
                    <div key={t.id}
                      onClick={() => onOpenTour(t.id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px 10px 28px", cursor: "pointer", flexWrap: "wrap", borderTop: "1px solid #f8fafc" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
