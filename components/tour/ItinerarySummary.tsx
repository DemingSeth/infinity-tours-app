"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BRAND } from "@/lib/helpers";
import { buildItinerarySummary, SUMMARY_SLOTS, type SummaryDayInput } from "@/lib/itinerarySummary";

// Summary of Itinerary (September 2026, Amy): a read-only grid of each day's
// meals and morning / afternoon / evening activities, built from the days
// below. There is nothing to edit here on purpose: change the day and the
// summary follows, so the two can never get crossed.
const MAX_TEXT = 70;
const PRINT_DAYS_PER_TABLE = 5;

export default function ItinerarySummary({ days, print = false, note, initiallyOpen = true }: {
  days: SummaryDayInput[];
  print?: boolean;
  /** Small line under the title (e.g. who else sees it). Editor only. */
  note?: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const summary = useMemo(() => buildItinerarySummary(days), [days]);
  if (summary.length === 0) return null;

  // Print splits long tours into tables of five days so columns stay readable.
  const chunks = print
    ? Array.from({ length: Math.ceil(summary.length / PRINT_DAYS_PER_TABLE) }, (_, i) => summary.slice(i * PRINT_DAYS_PER_TABLE, (i + 1) * PRINT_DAYS_PER_TABLE))
    : [summary];

  const cellText = (t: string) => (t.length > MAX_TEXT ? `${t.slice(0, MAX_TEXT - 1).trimEnd()}…` : t);
  const labelCell: React.CSSProperties = {
    position: print ? "static" : "sticky", left: 0, zIndex: 1, background: "var(--surface-2)",
    fontSize: print ? 10 : 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.4,
    padding: print ? "4px 6px" : "7px 10px", borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)",
    whiteSpace: "nowrap", verticalAlign: "top", textAlign: "left",
  };

  return (
    <div className={print ? "print-summary" : undefined}
      style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: print ? 8 : 12, overflow: "hidden", marginBottom: print ? 8 : 16, breakInside: print ? "avoid" : undefined }}>
      <button type="button" onClick={print ? undefined : () => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: BRAND.navy, border: "none", padding: print ? "5px 12px" : "10px 16px", cursor: print ? "default" : "pointer", fontFamily: "inherit", textAlign: "left" }}>
        {!print && (open ? <ChevronDown size={16} color="rgba(255,255,255,.7)" /> : <ChevronRight size={16} color="rgba(255,255,255,.7)" />)}
        <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", color: "#fff", fontSize: 15 }}>Summary of Itinerary</span>
        {!print && <span style={{ color: "rgba(255,255,255,.55)", fontSize: 11, marginLeft: "auto" }}>Built from the days below</span>}
      </button>
      {(open || print) && (
        <div>
          {note && !print && <div style={{ fontSize: 11.5, color: "var(--muted)", padding: "8px 16px 0" }}>{note}</div>}
          {chunks.map((chunk, ci) => (
            <div key={ci} style={{ overflowX: print ? "visible" : "auto", padding: print ? 6 : 12, paddingTop: print ? 6 : 10 }}>
              <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: print ? undefined : 110 + chunk.length * 140, tableLayout: "fixed", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
                <colgroup>
                  <col style={{ width: print ? 74 : 110 }} />
                  {chunk.map(d => <col key={d.id} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...labelCell, background: "var(--surface-3)" }} />
                    {chunk.map(d => (
                      <th key={d.id} style={{ background: "var(--surface-3)", padding: print ? "4px 6px" : "7px 10px", borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)", textAlign: "left", verticalAlign: "top" }}>
                        <div style={{ fontSize: print ? 10 : 11, fontWeight: 700, color: "var(--ink)" }}>Day {d.dayNumber}{d.weekday ? ` · ${d.weekday}` : ""}</div>
                        <div style={{ fontSize: print ? 10 : 11, color: "var(--muted)", fontWeight: 500 }}>{d.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SUMMARY_SLOTS.map(slot => (
                    <tr key={slot.key}>
                      <th scope="row" style={{ ...labelCell, color: slot.meal ? "var(--amber-text)" : "var(--muted)" }}>{slot.label}</th>
                      {chunk.map(d => {
                        const lines = d.cells[slot.key];
                        return (
                          <td key={d.id} style={{ padding: print ? "4px 6px" : "7px 10px", borderBottom: "1px solid var(--border-soft)", borderRight: "1px solid var(--border-soft)", verticalAlign: "top", fontSize: print ? 10 : 12, lineHeight: 1.4, color: "var(--text)", background: slot.meal ? "var(--amber-bg-soft, transparent)" : undefined }}>
                            {lines.length === 0
                              ? <span style={{ color: "var(--muted-3)" }}>–</span>
                              : lines.map((t, i) => <div key={i} title={t.length > MAX_TEXT ? t : undefined} style={{ fontStyle: slot.meal ? "italic" : undefined }}>{cellText(t)}</div>)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
