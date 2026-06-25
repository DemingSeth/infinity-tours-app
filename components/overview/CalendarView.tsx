"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, CalendarDays } from "lucide-react";
import {
  BRAND, STATUSES, getStatus, buildHostColorMap, initialsFrom, hostNameOf,
  parseISODate, startOfDay, sameDay, tourDateLabel, MONTH_NAMES, WEEKDAY_LABELS,
} from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";
import type { TourWithHostAndMembers } from "@/lib/types";

type Mode = "status" | "host";

interface ScheduledTour {
  tour: TourWithHostAndMembers;
  start: Date; // start of day
  end: Date;   // start of day (== start for single-day)
}

// Layout constants (px).
const HEADER_H = 22;
const LANE_H = 17;
const LANE_GAP = 3;
const MAX_LANES = 3;
const OVERFLOW_H = 16;
const WEEK_H = HEADER_H + MAX_LANES * (LANE_H + LANE_GAP) + OVERFLOW_H;

const DAY_MS = 86400000;
const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY_MS);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface Anchor { x: number; y: number; }
type Popover =
  | { kind: "tour"; tour: TourWithHostAndMembers; anchor: Anchor }
  | { kind: "day"; date: Date; tours: TourWithHostAndMembers[]; anchor: Anchor }
  | null;

export default function CalendarView({ tours, onOpenTour }: {
  tours: TourWithHostAndMembers[];
  onOpenTour: (id: string) => void;
}) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [mode, setMode] = useState<Mode>("status");
  const [popover, setPopover] = useState<Popover>(null);

  const hostColorMap = useMemo(
    () => buildHostColorMap(tours.map(t => t.tour_host_id)),
    [tours],
  );

  const colorFor = (tour: TourWithHostAndMembers) =>
    mode === "status" ? getStatus(tour.status).dot : (hostColorMap[tour.tour_host_id] ?? "#94a3b8");

  // Tours with a usable start_date, normalized to whole-day ranges.
  const { scheduled, unscheduledCount } = useMemo(() => {
    const list: ScheduledTour[] = [];
    let missing = 0;
    for (const tour of tours) {
      const s = parseISODate(tour.start_date);
      if (!s) { missing++; continue; }
      const e = parseISODate(tour.end_date) ?? s;
      list.push({ tour, start: startOfDay(s), end: startOfDay(e < s ? s : e) });
    }
    return { scheduled: list, unscheduledCount: missing };
  }, [tours]);

  // Build the month grid (Sunday-start), padded to full weeks.
  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = startOfDay(new Date(year, month, 1 - first.getDay()));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    const out: Date[][] = [];
    for (let w = 0; w * 7 < cells; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(startOfDay(new Date(gridStart.getTime() + (w * 7 + d) * DAY_MS)));
      }
      out.push(row);
    }
    return out;
  }, [cursor]);

  const month = cursor.getMonth();

  const goPrev = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  const goNext = () => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const toursOnDay = (day: Date) =>
    scheduled.filter(s => s.start <= day && s.end >= day).map(s => s.tour);

  return (
    <section style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, overflow: "hidden" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
        <CalendarDays size={18} color="#64748b" />
        <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
          Calendar
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 10 }}>
          <button onClick={goPrev} aria-label="Previous month" style={navBtn}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: BRAND.navy, minWidth: 132, textAlign: "center" }}>
            {MONTH_NAMES[month]} {cursor.getFullYear()}
          </span>
          <button onClick={goNext} aria-label="Next month" style={navBtn}><ChevronRight size={16} /></button>
          <button onClick={goToday} style={{ ...navBtn, width: "auto", padding: "0 10px", fontSize: 11, fontWeight: 600, color: "#64748b" }}>Today</button>
        </div>

        {/* Mode toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 1, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {([{ value: "status", label: "By Status" }, { value: "host", label: "By Host" }] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setMode(opt.value)}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                background: mode === opt.value ? "#fff" : "transparent",
                color: mode === opt.value ? BRAND.navy : "#94a3b8",
                boxShadow: mode === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "9px 18px", borderBottom: "1px solid #f1f5f9", background: "#fbfcfe" }}>
        {mode === "status"
          ? STATUSES.map(s => <LegendDot key={s.id} color={s.dot} label={s.label} />)
          : (() => {
              const seen = new Map<string, string>();
              for (const s of scheduled) {
                const name = hostNameOf(s.tour);
                if (!seen.has(s.tour.tour_host_id)) seen.set(s.tour.tour_host_id, name);
              }
              const entries = Array.from(seen.entries());
              return entries.length
                ? entries.map(([id, name]) => <LegendDot key={id} color={hostColorMap[id] ?? "#94a3b8"} label={name} />)
                : <span style={{ fontSize: 11, color: "#94a3b8" }}>No scheduled tours</span>;
            })()}
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #eef2f7" }}>
        {WEEKDAY_LABELS.map(d => (
          <div key={d} style={{ padding: "6px 8px", fontSize: 10.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "left" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div>
        {weeks.map((days, wi) => {
          const weekStart = days[0];
          const weekEnd = days[6];

          const overlapping = scheduled
            .filter(s => s.start <= weekEnd && s.end >= weekStart)
            .sort((a, b) =>
              a.start.getTime() - b.start.getTime() ||
              (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime()) ||
              a.tour.name.localeCompare(b.tour.name),
            );

          // Greedy lane assignment within the week.
          const laneEnds: number[] = [];
          const spans = overlapping.map(s => {
            const startCol = clamp(diffDays(s.start, weekStart), 0, 6);
            const endCol = clamp(diffDays(s.end, weekStart), 0, 6);
            let lane = laneEnds.findIndex(end => end < startCol);
            if (lane === -1) { lane = laneEnds.length; laneEnds.push(endCol); }
            else laneEnds[lane] = endCol;
            return { s, startCol, endCol, lane };
          });

          const placed = spans.filter(p => p.lane < MAX_LANES);

          // Hidden-tour count per day column (accurate per-day overflow).
          const overflowByCol = Array.from({ length: 7 }, (_, c) => {
            const total = spans.filter(p => p.startCol <= c && c <= p.endCol).length;
            const shown = placed.filter(p => p.startCol <= c && c <= p.endCol).length;
            return total - shown;
          });

          return (
            <div key={wi} style={{ position: "relative", height: WEEK_H, borderBottom: wi === weeks.length - 1 ? "none" : "1px solid #eef2f7" }}>
              {/* Day cells (background + date numbers) */}
              <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {days.map((day, di) => {
                  const inMonth = day.getMonth() === month;
                  const isToday = sameDay(day, today);
                  return (
                    <div key={di} style={{ borderLeft: di === 0 ? "none" : "1px solid #f3f6fa", background: inMonth ? "#fff" : "#fbfcfe", padding: 5 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        minWidth: 18, height: 18, borderRadius: "50%", fontSize: 11,
                        fontWeight: isToday ? 700 : 500,
                        color: isToday ? "#fff" : inMonth ? "#475569" : "#cbd5e1",
                        background: isToday ? BRAND.blue : "transparent",
                      }}>
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Tour bars */}
              {placed.map(({ s, startCol, endCol, lane }) => {
                const continuesLeft = s.start < weekStart;
                const continuesRight = s.end > weekEnd;
                const single = sameDay(s.start, s.end);
                const color = colorFor(s.tour);
                return (
                  <button
                    key={s.tour.id}
                    onClick={(e) => setPopover({ kind: "tour", tour: s.tour, anchor: { x: e.clientX, y: e.clientY } })}
                    title={s.tour.name}
                    style={{
                      position: "absolute",
                      left: `calc(${(startCol / 7) * 100}% + 4px)`,
                      width: `calc(${((endCol - startCol + 1) / 7) * 100}% - 8px)`,
                      top: HEADER_H + lane * (LANE_H + LANE_GAP),
                      height: LANE_H,
                      background: single ? "#fff" : color,
                      border: single ? `1.5px solid ${color}` : "none",
                      color: single ? color : "#fff",
                      borderTopLeftRadius: continuesLeft ? 0 : 5,
                      borderBottomLeftRadius: continuesLeft ? 0 : 5,
                      borderTopRightRadius: continuesRight ? 0 : 5,
                      borderBottomRightRadius: continuesRight ? 0 : 5,
                      fontSize: 10.5, fontWeight: 600, fontFamily: "inherit",
                      padding: "0 6px", display: "flex", alignItems: "center", gap: 4,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      cursor: "pointer", textAlign: "left", lineHeight: `${LANE_H}px`,
                    }}
                  >
                    {single && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.tour.name}</span>
                  </button>
                );
              })}

              {/* "+N more" per day */}
              {overflowByCol.map((n, c) => n > 0 ? (
                <button
                  key={`more-${c}`}
                  onClick={(e) => setPopover({ kind: "day", date: days[c], tours: toursOnDay(days[c]), anchor: { x: e.clientX, y: e.clientY } })}
                  style={{
                    position: "absolute",
                    left: `calc(${(c / 7) * 100}% + 4px)`,
                    width: `calc(${(1 / 7) * 100}% - 8px)`,
                    top: HEADER_H + MAX_LANES * (LANE_H + LANE_GAP),
                    height: OVERFLOW_H - 2,
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 10, fontWeight: 700, color: "#64748b", fontFamily: "inherit",
                    textAlign: "left", padding: "0 6px",
                  }}
                >
                  +{n} more
                </button>
              ) : null)}
            </div>
          );
        })}
      </div>

      {unscheduledCount > 0 && (
        <div style={{ padding: "9px 18px", borderTop: "1px solid #f1f5f9", fontSize: 11, color: "#94a3b8", background: "#fbfcfe" }}>
          {unscheduledCount} tour{unscheduledCount !== 1 ? "s" : ""} without dates not shown on the calendar.
        </div>
      )}

      {popover && (
        <PopoverCard popover={popover} colorFor={colorFor} onOpenTour={onOpenTour} onClose={() => setPopover(null)} />
      )}
    </section>
  );
}

// ── Popover ──────────────────────────────────────────────────────────────────
function PopoverCard({ popover, colorFor, onOpenTour, onClose }: {
  popover: NonNullable<Popover>;
  colorFor: (t: TourWithHostAndMembers) => string;
  onOpenTour: (id: string) => void;
  onClose: () => void;
}) {
  const W = 280;
  const left = Math.min(popover.anchor.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - W - 12);
  const top = Math.min(popover.anchor.y + 10, (typeof window !== "undefined" ? window.innerHeight : 800) - 220);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 900 }} />
      <div
        style={{
          position: "fixed", left: Math.max(12, left), top: Math.max(12, top), width: W, zIndex: 901,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,.18)", padding: 14,
        }}
      >
        {popover.kind === "tour" ? (
          <TourPopoverBody tour={popover.tour} onOpenTour={onOpenTour} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.navy }}>
              {popover.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
              {popover.tours.map(t => (
                <button
                  key={t.id}
                  onClick={() => onOpenTour(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "7px 9px", cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: colorFor(t), flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: BRAND.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.school}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TourPopoverBody({ tour, onOpenTour }: { tour: TourWithHostAndMembers; onOpenTour: (id: string) => void }) {
  const hostName = hostNameOf(tour);
  const initials = tour.tour_hosts?.initials || initialsFrom(hostName === "Unassigned" ? null : hostName);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em", lineHeight: 1.25 }}>
        {tour.name}
      </div>
      <div style={{ fontSize: 12, color: "#64748b" }}>{tour.school}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 20, height: 20, borderRadius: "50%", background: BRAND.blue, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {initials}
        </span>
        <span style={{ fontSize: 12, color: "#475569" }}>{hostName}</span>
      </div>
      <div style={{ fontSize: 12, color: "#475569" }}>{tourDateLabel(tour.dates, tour.start_date, tour.end_date)}</div>
      <div><StatusPill status={tour.status} /></div>
      <button
        onClick={() => onOpenTour(tour.id)}
        style={{ marginTop: 2, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        <ExternalLink size={12} />Open Tour
      </button>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}

const navBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0",
  background: "#fff", color: "#475569", cursor: "pointer",
};
