"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import IconColorButton, { IconColorRow } from "@/components/shared/IconColorPicker";
import {
  BRAND, ROLES, AGENDA_TYPES, TRAVEL_SUBTYPES, SUBTYPES_BY_TYPE,
  isDayInPast, initialCollapsedDays, parseAgendaDate, formatAgendaDate, suggestNextDate, agendaDayDateLabel,
  toDateInput, fmt$, buildTripInfo, orderAgendaItems, timeInsertIndex,
  orderedActivitySubtypes, expandStateName, tripInfoStartsCollapsed, itemMatchesGroup, groupName, resolveIconColor,
  activePersonaKeys, personaLabel, personaColors, getPersona, defaultPersonaVisibility, isActivityType, generateAccessCode,
  MEAL_MONEY_TYPES, mealMoneyHasAmount, mealMoneyLabel,
} from "@/lib/helpers";
import GoogleMapsLink from "@/components/shared/GoogleMapsLink";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import TripInformation from "@/components/tour/TripInformation";
import {
  AGENDA_TYPE_COLORS, getAgendaTypeIcon, getSentimentIcon, getSubtypeIcon,
} from "@/components/shared/agendaIcons";
import AgendaImages from "@/components/shared/AgendaImages";
import ItemConfirmationControl, { ConfirmationFileChips, type ConfirmationPatch } from "@/components/tour/itemConfirmation";
import ItineraryHeaderTile from "@/components/tour/ItineraryHeaderTile";
import { MapPin, Phone, Bus, Lock, Clock, ImagePlus, Printer, Check, GripVertical, X as XIcon, Copy, CopyPlus, Sparkles, Tag, ChevronsUpDown } from "lucide-react";
import type {
  TourRow, AgendaDayWithItems, AgendaItemWithFeedback,
  AgendaItemType, TravelMethod, MealMoneyType, Role, TourGroup,
} from "@/lib/types";

// ── Icons ──────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:     "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  pencil:   "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  chevron:  "M19 9l-7 7-7-7",
  chevronUp: "M5 15l7-7 7 7",
  chevronRight: "M9 18l6-6-6-6",
  plus:     "M12 5v14M5 12h14",
  link:     "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  feedback: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  x:        "M18 6L6 18M6 6l12 12",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
};

function I({ n, s = 13, c }: { n: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: c }}>
      <path d={ICONS[n] ?? ""} />
    </svg>
  );
}

// ── Form primitives ────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  border: "1.5px solid var(--border)", borderRadius: 8, padding: "7px 11px",
  fontSize: 13, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)",
  outline: "none", width: "100%", boxSizing: "border-box",
};

function Field({ label, children, half, third }: { label: string; children: React.ReactNode; half?: boolean; third?: boolean }) {
  const w = third ? "calc(33.33% - 7px)" : half ? "calc(50% - 5px)" : "100%";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: w, minWidth: 0, flexShrink: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8 }}>{label}</label>
      {children}
    </div>
  );
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...INP, ...props.style }} />;
}

function Tex(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...INP, minHeight: 60, resize: "vertical", ...props.style }} />;
}

function Sel({ options, ...props }: { options: { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...INP, ...props.style }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant, small, style, disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "muted" | "ghost"; small?: boolean; style?: React.CSSProperties; disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit", fontWeight: 600, border: "none", borderRadius: 8, opacity: disabled ? .6 : 1,
    padding: small ? "5px 11px" : "8px 16px", fontSize: small ? 11 : 12,
    background: variant === "muted" ? "var(--surface-3)" : variant === "ghost" ? "transparent" : BRAND.navy,
    color: variant === "muted" ? "var(--muted)" : variant === "ghost" ? "var(--muted)" : "#fff",
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...style }}>{children}</button>;
}

// ── TimePicker ─────────────────────────────────────────────────────────────────
// Typeable time field + a wheel assist. You can type free-form ("2:30 pm",
// "230p", "14:30", "2") and it normalizes on blur/Enter; the clock button opens
// the wheel, and Done ALWAYS commits the shown selection (so opening it and
// pressing Done with no change still saves). The ✕ clears the field to blank.
const pad2 = (n: number) => String(n).padStart(2, "0");

// Parse free-form typed input to canonical "h:mm AM/PM". Returns "" for empty
// (clears the field) and null for unparseable input (caller reverts).
function parseTimeInput(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (!s) return "";
  let mer: "a" | "p" | null = null;
  const mm = s.match(/([ap])\.?m?\.?\s*$/);
  if (mm) { mer = mm[1] as "a" | "p"; s = s.slice(0, mm.index).trim(); }
  s = s.replace(/[^\d:]/g, "");
  if (!s) return null;
  let h: number, min: number;
  if (s.includes(":")) {
    const [hp, mp] = s.split(":");
    if (mp === undefined || mp === "") return null;
    h = parseInt(hp || "0", 10);
    // A single minute digit means ones, not tens: "2:3" → 2:03, not 2:30.
    min = parseInt(mp.length === 1 ? mp : mp.slice(0, 2), 10);
  } else if (s.length <= 2) {
    h = parseInt(s, 10); min = 0;
  } else if (s.length === 3) {
    h = parseInt(s.slice(0, 1), 10); min = parseInt(s.slice(1), 10);
  } else {
    h = parseInt(s.slice(0, 2), 10); min = parseInt(s.slice(2, 4), 10);
  }
  if (Number.isNaN(h) || Number.isNaN(min) || min > 59) return null;
  if (mer) {
    if (h < 1 || h > 12) return null;
    return `${h}:${pad2(min)} ${mer === "a" ? "AM" : "PM"}`;
  }
  // No meridiem: read as 24-hour. 1–11 default to AM (add "pm" to override).
  if (h > 23) return null;
  if (h === 0) return `12:${pad2(min)} AM`;
  if (h < 12) return `${h}:${pad2(min)} AM`;
  if (h === 12) return `12:${pad2(min)} PM`;
  return `${h - 12}:${pad2(min)} PM`;
}

function TimePicker({ value, onChange, placeholder = "Pick a time" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  // Editable text mirrors `value`; committed on blur/Enter (or reverted).
  const [text, setText] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  const parseT = (v: string) => {
    const match = v.match(/^(\d+):(\d{2})\s*(AM|PM)$/i);
    return match ? { h: parseInt(match[1]), m: parseInt(match[2]), ap: match[3].toUpperCase() } : { h: 9, m: 0, ap: "AM" };
  };
  // Wheel draft, seeded from the current value (or a 9:00 AM default) each open.
  const [draft, setDraft] = useState(() => parseT(value));

  // Keep the visible text in sync when the value changes from outside.
  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { commitText(); setOpen(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, text, value]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      (hourRef.current?.children[draft.h - 1] as HTMLElement)?.scrollIntoView({ block: "center" });
      (minRef.current?.children[draft.m] as HTMLElement)?.scrollIntoView({ block: "center" });
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function commitText() {
    const parsed = parseTimeInput(text);
    if (parsed === null) { setText(value); return; }   // invalid → revert
    if (parsed !== value) onChange(parsed);
    else setText(value);                                // normalize display
  }

  function openWheel() {
    setDraft(parseT(value));
    setOpen(true);
  }

  // Done always commits the shown wheel selection — even with no change.
  function done() {
    const v = `${draft.h}:${pad2(draft.m)} ${draft.ap}`;
    setText(v);
    onChange(v);
    setOpen(false);
  }

  const hours = [1,2,3,4,5,6,7,8,9,10,11,12];
  const mins  = Array.from({ length: 60 }, (_, i) => i);
  const col: React.CSSProperties = { height: 156, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, padding: "4px 0", scrollbarWidth: "thin" };
  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 0", borderRadius: 6, fontSize: 13, fontWeight: active ? 700 : 400,
    cursor: "pointer", background: active ? BRAND.navy : "transparent",
    color: active ? "#fff" : "var(--text)", border: "none", fontFamily: "inherit", width: "100%", textAlign: "center",
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div style={{ ...INP, display: "flex", alignItems: "center", justifyContent: "space-between", padding: 0, paddingRight: 8 }}>
        <input
          value={text}
          placeholder={placeholder}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commitText(); setOpen(false); }
            if (e.key === "Escape") { setText(value); setOpen(false); }
          }}
          onBlur={() => { if (!open) commitText(); }}
          style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "inherit", color: "var(--text)", padding: "7px 11px" }}
        />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {(text || value) && (
            <button type="button" title="Clear time"
              onClick={() => { setText(""); onChange(""); setOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--muted-2)" }}>
              <XIcon size={13} />
            </button>
          )}
          <button type="button" title="Pick from clock" onClick={() => (open ? setOpen(false) : openWheel())}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
            <Clock size={14} style={{ color: open ? "var(--ink)" : "var(--muted-2)" }} />
          </button>
        </span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: "var(--surface)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.18)", border: "1.5px solid var(--border)", padding: 12, width: 210 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8, textAlign: "center", fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em" }}>
            {draft.h}:{pad2(draft.m)} {draft.ap}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--muted-2)", textAlign: "center", marginBottom: 3 }}>Hour</div>
              <div ref={hourRef} style={col}>{hours.map(hr => <button key={hr} type="button" style={btn(hr === draft.h)} onClick={() => setDraft(d => ({ ...d, h: hr }))}>{hr}</button>)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--muted-2)", textAlign: "center", marginBottom: 3 }}>Min</div>
              <div ref={minRef} style={col}>{mins.map(mn => <button key={mn} type="button" style={btn(mn === draft.m)} onClick={() => setDraft(d => ({ ...d, m: mn }))}>{pad2(mn)}</button>)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "var(--muted-2)", textAlign: "center", marginBottom: 3 }}>AM/PM</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
                {["AM", "PM"].map(a => <button key={a} type="button" style={{ ...btn(a === draft.ap), padding: "8px 0" }} onClick={() => setDraft(d => ({ ...d, ap: a }))}>{a}</button>)}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--surface-3)", marginTop: 8, paddingTop: 7, textAlign: "center" }}>
            <button type="button" onClick={done} style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 7, padding: "5px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, width: "100%", maxWidth: wide ? 680 : 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", fontSize: 16, fontWeight: 400, color: "var(--ink)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 4 }}><I n="x" s={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AccessLinkManager ──────────────────────────────────────────────────────────
const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

function AccessLinkManager({ tour, onTourChange, open, setOpen, isOwner }: {
  tour: TourRow; onTourChange: (patch: Record<string, any>) => void;
  open: boolean; setOpen: (v: boolean) => void; isOwner: boolean;
}) {
  const codes = (tour.access_codes as unknown as Record<string, string>) || {};
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Multi-group tours: links can open pre-filtered to one group's schedule.
  const linkGroups: TourGroup[] = (tour.groups ?? []).filter(g => g && g.id && (g.name ?? "").trim());
  const [linkGroup, setLinkGroup] = useState<string>("");

  // Outward-facing links cover participant personas only — never the tour host /
  // coordinator. No distributable coordinator link is generated anywhere; the
  // coordinator view stays reachable only by someone who knows its code (via the
  // bare /view self-select fallback).
  const personaKeys = activePersonaKeys(tour.active_personas).filter(k => k !== "tour_host");

  // Auto-generate-and-persist a code for any participant persona missing one, so
  // every persona always has a working link. OWNER ONLY: this writes to the tour,
  // so it must never run for a non-owner. RLS would block that write, and because
  // handleTourChange rolls back on failure the missing-code condition would stay
  // true and re-fire this effect into a relentless loop. Non-owners just view (and
  // copy) whatever codes already exist; RLS stays the last line of defense.
  useEffect(() => {
    if (!isOwner) return;
    const additions: Record<string, string> = {};
    for (const key of personaKeys) {
      const codeKey = getPersona(key)!.codeKey;
      if (!(codes[codeKey] || "").trim()) additions[codeKey] = generateAccessCode();
    }
    if (Object.keys(additions).length > 0) {
      onTourChange({ access_codes: { ...codes, ...additions } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id, tour.active_personas, tour.access_codes, isOwner]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (codeKey: string) =>
    `${origin}/tour/${tour.id}/view?c=${encodeURIComponent(codes[codeKey] || "")}${linkGroup ? `&group=${encodeURIComponent(linkGroup)}` : ""}`;

  // Rotate a persona's code → its link changes; the old link stops working.
  const regenerate = (codeKey: string) => onTourChange({ access_codes: { ...codes, [codeKey]: generateAccessCode() } });

  async function copy(codeKey: string) {
    try {
      await navigator.clipboard.writeText(linkFor(codeKey));
      // Only show the copied state once the clipboard write actually resolved.
      setCopiedKey(codeKey);
      setTimeout(() => setCopiedKey(c => (c === codeKey ? null : c)), 2000);
    } catch {
      // Clipboard write failed — leave the button in its normal state.
    }
  }

  const rows = personaKeys.map(key => {
    const p = getPersona(key)!;
    const meta = personaColors(key);
    return { key, codeKey: p.codeKey, label: personaLabel(key, tour.persona_labels), color: meta.color, bg: meta.bg };
  });
  const readyCount = rows.filter(r => (codes[r.codeKey] || "").trim()).length;
  // Non-owners get a clean read-only view: only personas that already have a code
  // (no empty or broken link affordances), and no regenerate control below. Owners
  // see every persona so they can mint and rotate codes.
  const visibleRows = isOwner ? rows : rows.filter(r => (codes[r.codeKey] || "").trim());

  // Subdued, collapsed-by-default secondary card (the preview buttons above are
  // the primary action). Expands to one shareable link per participant persona.
  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
        <I n={open ? "chevron" : "chevronRight"} s={13} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Access Links</span>
        <span style={{ fontSize: 11, color: "var(--muted-2)", marginLeft: "auto" }}>
          {readyCount} link{readyCount !== 1 ? "s" : ""} · send each to the right group
        </span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {linkGroups.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--muted)" }}>
              <span style={{ fontWeight: 700 }}>Links open to:</span>
              <select value={linkGroup} onChange={e => setLinkGroup(e.target.value)}
                style={{ ...INP, width: "auto", padding: "4px 8px", fontSize: 12 }}>
                <option value="">Everyone (all groups)</option>
                {linkGroups.map(g => <option key={g.id} value={g.id}>{g.name} only</option>)}
              </select>
              <span style={{ fontSize: 11, color: "var(--muted-2)" }}>Viewers can still switch groups on the page.</span>
            </div>
          )}
          {visibleRows.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--muted-2)" }}>No shareable links yet.</div>
          )}
          {visibleRows.map(r => {
            const copied = copiedKey === r.codeKey;
            return (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: 9, padding: "8px 10px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: .7, flex: "0 0 96px" }}>{r.label}</span>
                <input readOnly value={linkFor(r.codeKey)}
                  onFocus={e => e.currentTarget.select()}
                  style={{ flex: 1, minWidth: 0, border: "1px solid var(--border)", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontFamily: "inherit", color: "var(--muted)", background: "var(--surface-2)", outline: "none" }} />
                {isOwner && (
                  <button onClick={() => regenerate(r.codeKey)} title="Generate a new link (the old one stops working)"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 4, display: "flex", flexShrink: 0 }}>
                    <I n="refresh" s={13} />
                  </button>
                )}
                <button onClick={() => copy(r.codeKey)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", flexShrink: 0, background: copied ? "var(--green-bg)" : r.color, color: copied ? "var(--green-text)" : "#fff" }}>
                  {copied ? <><Check size={12} strokeWidth={3} />Copied</> : "Copy"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Item form ──────────────────────────────────────────────────────────────────
// A meal-money entry in form state: amount is held as a string (text input).
type MealMoneyForm = { type: MealMoneyType; amount: string };

type ItemFormState = {
  time: string; end_time: string; type: AgendaItemType; activity_subtypes: string[]; title: string; detail: string;
  public_note: string; address: string; map_link: string; website: string;
  travel_methods: string[]; contact_name: string; contact_phone: string;
  contact_email: string; cost: string; cost_paid: boolean;
  confirmation_not_required: boolean;
  driver_note: string; internal_note: string;
  meal_money: MealMoneyForm[];
  persona_visibility: Record<string, boolean>;
  feedback_enabled: boolean;
  image_urls: string[];
  driver_map_urls: string[];
  icon_color: string | null;
  elevate_url: string;
  group_tags: string[];
  custom_type_label: string;
};

const BLANK: ItemFormState = {
  time: "", end_time: "", type: "activity", activity_subtypes: [], title: "", detail: "", public_note: "",
  address: "", map_link: "", website: "", travel_methods: [],
  contact_name: "", contact_phone: "", contact_email: "",
  cost: "", cost_paid: false, confirmation_not_required: false, driver_note: "", internal_note: "",
  meal_money: [], persona_visibility: defaultPersonaVisibility("activity", []),
  feedback_enabled: isActivityType("activity", []), image_urls: [], driver_map_urls: [], icon_color: null,
  elevate_url: "", group_tags: [], custom_type_label: "",
};

// Toggle a value in/out of a string array (used for multi-select sub-types).
function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

// Hydrate the meal-money form list from an item. Prefers the authoritative
// meal_money list; falls back to the legacy single meal_pay_type/stipend_amount
// only for rows not yet migrated (so the editor never silently drops them).
function mealMoneyToForm(item: AgendaItemWithFeedback): MealMoneyForm[] {
  if (Array.isArray(item.meal_money)) {
    return item.meal_money.map(e => ({ type: e.type, amount: e.amount != null ? String(e.amount) : "" }));
  }
  const t = item.meal_pay_type;
  if (t === "stipend") return [{ type: "stipend", amount: item.stipend_amount ? String(item.stipend_amount) : "" }];
  if (t === "disney_dining") return [{ type: "disney_dining", amount: "" }];
  if (t === "group") return [{ type: "group", amount: "" }];
  return [];
}

// Representative legacy meal_pay_type for the dormant rollback sync (the legacy
// enum has no "cash", so cash-only meals sync to null — acceptable for insurance).
function mealLegacyType(entries: MealMoneyForm[]): "group" | "stipend" | "disney_dining" | null {
  if (entries.some(e => e.type === "stipend")) return "stipend";
  if (entries.some(e => e.type === "disney_dining")) return "disney_dining";
  if (entries.some(e => e.type === "group")) return "group";
  return null;
}

const TYPE_COLORS = AGENDA_TYPE_COLORS;

// Meal-money chips: one yellow that matches the Dining icon (#f59e0b tint),
// regardless of how the meal is covered.
export const MEAL_CHIP_STYLE: React.CSSProperties = { background: "var(--amber-bg)", color: "var(--amber-text)" };

const UNDO_WINDOW_MS = 5000;

// Persist a contiguous 1..N renumber for the given (already-ordered) days,
// writing only the rows whose sort_order / day_number actually change. Used after
// a permanent day delete so the print / role / confirmation views never show a
// gap. Fire-and-forget — the local state is updated separately by the caller.
function persistDayRenumber(supabase: ReturnType<typeof createClient>, survivors: AgendaDayWithItems[]) {
  survivors.forEach((d, i) => {
    if (d.sort_order !== i + 1 || d.day_number !== i + 1) {
      supabase.from("agenda_days").update({ sort_order: i + 1, day_number: i + 1 }).eq("id", d.id);
    }
  });
}
const STORAGE_BUCKET = "agenda-images";
const STORAGE_MARKER = `/${STORAGE_BUCKET}/`;

// Ensure an http(s) prefix so hrefs never resolve relative to the app.
const externalHref = (url: string) => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

// Derive the storage object path from a public URL so we can delete it.
function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + STORAGE_MARKER.length)) : null;
}

// ── ImageUploader ────────────────────────────────────────────────────────────
// `folder` optionally namespaces the storage path (e.g. "driver-maps") so a
// second uploader on the same item never collides with the main images.
function ImageUploader({ tourId, itemId, urls, onChange, folder, buttonLabel = "Upload Image", isShared }: {
  tourId: string; itemId: string; urls: string[]; onChange: (urls: string[]) => void;
  folder?: string; buttonLabel?: string;
  // Duplicated items share image URLs with their source. When another item
  // still references the file, removing it here must not delete the storage
  // object out from under that item.
  isShared?: (url: string) => boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tourId}/${itemId}/${folder ? folder + "/" : ""}${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        console.error("Image upload failed", error.message);
        if (typeof window !== "undefined") window.alert(`Could not upload ${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) added.push(data.publicUrl);
    }
    if (added.length) onChange([...urls, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeImage(url: string) {
    onChange(urls.filter(u => u !== url));
    if (isShared?.(url)) return;
    const path = storagePathFromUrl(url);
    if (path) { try { await createClient().storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
  }

  return (
    <div>
      <AgendaImages urls={urls} size={72} onRemove={removeImage} />
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ marginTop: urls.length ? 10 : 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px dashed var(--border-strong)", background: "var(--surface)", cursor: uploading ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-2)", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
        <ImagePlus size={14} />{uploading ? "Uploading..." : buttonLabel}
      </button>
    </div>
  );
}

function ItemForm({ form, setForm, onSave, onCancel, isEdit, saving, tourId, itemId, activePersonas, personaLabels, destination, confirmationControl, moveDayOptions, moveTargetDayId, onMoveTargetChange, groups = [], isImageShared }: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  onSave: () => void; onCancel: () => void; isEdit?: boolean; saving?: boolean;
  tourId: string; itemId: string;
  activePersonas: string[];
  personaLabels: Record<string, string>;
  // Tour-defined groups (band, choir, ...) this item can be limited to.
  groups?: TourGroup[];
  // See ImageUploader.isShared.
  isImageShared?: (url: string) => boolean;
  // Tour destination — drives city-aware Activity Type suggestions (e.g. NYC →
  // Broadway / Museum first).
  destination?: string | null;
  // When provided (edit modal), confirmation upload/status is managed by this
  // control — which writes the same agenda_items record as the Confirmations
  // page — and the inline "No confirmation required" checkbox is hidden.
  confirmationControl?: React.ReactNode;
  // "Move to day" control (edit modal only). Rendered when there is more than one
  // day; selecting a different day reassigns the item on save.
  moveDayOptions?: { value: string; label: string }[];
  moveTargetDayId?: string;
  onMoveTargetChange?: (dayId: string) => void;
}) {
  const f = (v: Partial<ItemFormState>) => setForm(p => ({ ...p, ...v }));
  // For NEW items, recompute the smart defaults when type/travel changes:
  // per-persona visibility, and the student-feedback default (on for Activities).
  // Either default can still be overridden by the host afterward.
  const fT = (v: Partial<ItemFormState>) => setForm(p => {
    const next = { ...p, ...v };
    if (!isEdit && ("type" in v || "travel_methods" in v)) {
      next.persona_visibility = defaultPersonaVisibility(next.type, next.travel_methods);
    }
    if (!isEdit && "type" in v) {
      next.feedback_enabled = isActivityType(next.type, next.activity_subtypes);
    }
    return next;
  });

  return (
    <div style={{ padding: 16, background: "var(--surface-2)", borderTop: "1.5px solid var(--border)" }} onClick={e => e.stopPropagation()}>
      {/* Title row with Save / Cancel at the TOP as well as the bottom, so a
          long form never needs a scroll to save (August 2026 request). */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", fontSize: 13, fontWeight: 400, color: "var(--ink)" }}>
          {isEdit ? "Edit Item" : "New Itinerary Item"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onCancel} variant="muted" small>Cancel</Btn>
          <Btn onClick={onSave} small disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}</Btn>
        </div>
      </div>

      {isEdit && moveDayOptions && moveDayOptions.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Move to day</label>
          <Sel options={moveDayOptions} value={moveTargetDayId ?? ""} onChange={e => onMoveTargetChange?.(e.target.value)} />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Type</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AGENDA_TYPES.map(t => {
            const bg = TYPE_COLORS[t.value] || "#6b7280";
            const active = form.type === t.value;
            const TypeIcon = getAgendaTypeIcon(t.value);
            return (
              <button key={t.value} type="button" onClick={() => fT({ type: t.value as AgendaItemType })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "var(--border)"}`, background: active ? bg + "18" : "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "var(--muted)", fontFamily: "inherit" }}>
                <TypeIcon size={15} strokeWidth={2} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity / instructions / general sub-types — multi-select (toggle on/off,
          down to zero). Shown when the top-level type carries sub-types. For
          Activities, city-matched sub-types (from the tour destination) are
          surfaced first with a "Suggested" hint. */}
      {SUBTYPES_BY_TYPE[form.type] && (() => {
        const isActivity = form.type === "activity";
        const { options, suggested } = isActivity
          ? orderedActivitySubtypes(destination)
          : { options: [...SUBTYPES_BY_TYPE[form.type]], suggested: [] as string[] };
        return (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
              {isActivity ? "Activity Types" : form.type === "food" ? "Meal" : "Sub-type"}
              {isActivity && suggested.length > 0 && destination && (
                <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0, fontWeight: 600, color: BRAND.blue }}>
                  ★ Suggested for {expandStateName(destination)} shown first
                </span>
              )}
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {options.map(st => {
                const bg = TYPE_COLORS[form.type] || "#6b7280";
                const active = form.activity_subtypes.includes(st.value);
                const SubIcon = getSubtypeIcon(form.type, st.value);
                const isSuggested = suggested.includes(st.value);
                return (
                  <button key={st.value} type="button"
                    onClick={() => f({ activity_subtypes: toggleInArray(form.activity_subtypes, st.value) })}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : isSuggested ? bg + "66" : "var(--border)"}`, background: active ? bg + "18" : "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "var(--muted)", fontFamily: "inherit" }}>
                    {SubIcon && <SubIcon size={15} strokeWidth={2} />}{st.label}{isSuggested && !active && <span style={{ color: bg, fontSize: 10 }}>★</span>}
                  </button>
                );
              })}
            </div>
            {isActivity && form.activity_subtypes.includes("other") && (
              <div style={{ marginTop: 8 }}>
                <Field label="Write in the activity type">
                  <Inp value={form.custom_type_label} onChange={e => f({ custom_type_label: e.target.value })} placeholder="e.g. Escape Room, Ropes Course, Rehearsal" autoFocus />
                </Field>
                <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>Shown as a tag on the item. The icon stays the generic activity icon.</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Travel methods — multi-select (toggle on/off, down to zero). Always
          available on every item type, so a method can be added to any item and
          any applied method can always be cleared (no more stuck tags). */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Travel Methods</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TRAVEL_SUBTYPES.map(st => {
            const bg = TYPE_COLORS.travel || "#3b82f6";
            const active = form.travel_methods.includes(st.value);
            const SubIcon = getSubtypeIcon("travel", st.value);
            return (
              <button key={st.value} type="button"
                onClick={() => fT({ travel_methods: toggleInArray(form.travel_methods, st.value) })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "var(--border)"}`, background: active ? bg + "18" : "var(--surface)", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "var(--muted)", fontFamily: "inherit" }}>
                {SubIcon && <SubIcon size={15} strokeWidth={2} />}{st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon color for THIS item, any type. An inline row (not a popover): in
          the editor it has to be impossible to miss. The itinerary list keeps
          the click-the-icon popover. */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
          Icon Color
          <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "var(--muted-2)" }}>
            also available by clicking the icon on the itinerary
          </span>
        </label>
        <IconColorRow
          type={form.type}
          travelMethod={form.travel_methods[0] ?? null}
          subtype={form.activity_subtypes[0] ?? null}
          value={form.icon_color}
          onChange={hex => f({ icon_color: hex })}
        />
      </div>

      {/* Who can see this item: one toggle chip per persona, colored with the
          persona's own color when on. The Tour Host always sees everything. */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
          Who sees this item
          <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "var(--muted-2)" }}>tap to show or hide</span>
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {activePersonas.map(key => {
            const locked = key === "tour_host";
            const on = locked || form.persona_visibility?.[key] === true;
            const meta = personaColors(key);
            return (
              <button key={key} type="button" disabled={locked}
                aria-pressed={on}
                title={locked ? "The Tour Host always sees every item" : on ? `Shown to ${personaLabel(key, personaLabels)} (tap to hide)` : `Hidden from ${personaLabel(key, personaLabels)} (tap to show)`}
                onClick={() => f({ persona_visibility: { ...form.persona_visibility, [key]: !on } })}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20, border: `2px solid ${on ? meta.color : "var(--border)"}`, background: on ? meta.bg : "var(--surface)", color: on ? meta.color : "var(--muted-2)", fontSize: 12, fontWeight: on ? 700 : 500, cursor: locked ? "default" : "pointer", fontFamily: "inherit", textDecoration: on ? "none" : "line-through" }}>
                {on ? <Check size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
                {personaLabel(key, personaLabels)}{locked && <Lock size={11} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-group tours: limit this item to one or more groups. No group
          selected = everyone on the tour. */}
      {groups.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
            Group
            <span style={{ marginLeft: 8, textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "var(--muted-2)" }}>none selected = everyone</span>
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {groups.map(g => {
              const on = form.group_tags.includes(g.id);
              return (
                <button key={g.id} type="button" onClick={() => f({ group_tags: toggleInArray(form.group_tags, g.id) })}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, border: `2px solid ${on ? BRAND.blue : "var(--border)"}`, background: on ? BRAND.blue + "18" : "var(--surface)", color: on ? BRAND.blue : "var(--muted)", fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                  <Tag size={12} />{g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-item student feedback toggle. Defaults on for Activities (set when
          the type changes), but the host can override it for any item type. */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: form.feedback_enabled ? "var(--text)" : "var(--muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={form.feedback_enabled}
            onChange={() => f({ feedback_enabled: !form.feedback_enabled })}
            style={{ accentColor: BRAND.navy, width: 15, height: 15, cursor: "pointer" }} />
          Collect student feedback for this item
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <Field label="Start Time" third>
          <TimePicker value={form.time} onChange={v => f({ time: v })} />
        </Field>
        <Field label="End Time (Optional)" third>
          <TimePicker value={form.end_time} onChange={v => f({ end_time: v })} placeholder="Add end time" />
        </Field>
        <Field label="Title">
          <Inp value={form.title} onChange={e => f({ title: e.target.value })} placeholder="Museum, flight, restaurant..." autoFocus={!isEdit} />
        </Field>
        <Field label="Address">
          <Inp value={form.address} onChange={e => f({ address: e.target.value })} placeholder="Full street address" />
        </Field>
        <Field label="Details / Notes">
          <Inp value={form.detail} onChange={e => f({ detail: e.target.value })} placeholder="Instructions, confirmation numbers..." />
        </Field>
        <Field label="Public Notes (Visible to All Roles)">
          <Tex value={form.public_note} onChange={e => f({ public_note: e.target.value })} placeholder="Directions, dress code, what to bring..." />
        </Field>
        <Field label="Google Maps Link" half>
          <Inp value={form.map_link} onChange={e => f({ map_link: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
        </Field>
        <Field label="Internal Note (Tour Host Only)">
          <Tex value={form.internal_note} onChange={e => f({ internal_note: e.target.value })} placeholder="Booking refs, reminders..." style={{ minHeight: 84 }} />
        </Field>
        <Field label="Images (visible to all roles)">
          <ImageUploader tourId={tourId} itemId={itemId} urls={form.image_urls} onChange={urls => f({ image_urls: urls })} isShared={isImageShared} />
        </Field>
        <Field label="Bus Driver Maps (host & driver only)">
          <ImageUploader tourId={tourId} itemId={itemId} urls={form.driver_map_urls} folder="driver-maps" buttonLabel="Upload Map" onChange={urls => f({ driver_map_urls: urls })} isShared={isImageShared} />
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>Parking / drop-off maps for this stop. Only tour hosts and bus drivers see these.</div>
        </Field>

        {form.type === "food" && (
          <div style={{ width: "100%", background: "var(--amber-bg-soft)", border: "1.5px solid var(--amber-border)", borderRadius: 10, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "var(--amber-text)", textTransform: "uppercase", letterSpacing: .7 }}>Meal Money</div>
            <Field label="How is this meal covered? (select any that apply)">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {MEAL_MONEY_TYPES.map(opt => {
                  const active = form.meal_money.some(e => e.type === opt.value);
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => f({
                        meal_money: active
                          ? form.meal_money.filter(e => e.type !== opt.value)
                          : [...form.meal_money, { type: opt.value as MealMoneyType, amount: "" }],
                      })}
                      style={{ flex: "1 1 110px", padding: "6px 8px", borderRadius: 8, border: `2px solid ${active ? "var(--amber-text)" : "var(--border)"}`, background: active ? "var(--amber-bg)" : "var(--surface)", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "var(--amber-text)" : "var(--muted)", fontFamily: "inherit", textAlign: "center", lineHeight: 1.3 }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            {/* One amount input per selected amount-bearing entry. Group has none. */}
            {form.meal_money.filter(e => mealMoneyHasAmount(e.type)).map(e => (
              <Field key={e.type} label={`${mealMoneyLabel(e.type)} Amount ($)`} third>
                <Inp type="number" value={e.amount} placeholder="25"
                  onChange={ev => f({ meal_money: form.meal_money.map(x => x.type === e.type ? { ...x, amount: ev.target.value } : x) })} />
              </Field>
            ))}
          </div>
        )}

        <Field label="Website" half>
          <Inp value={form.website} onChange={e => f({ website: e.target.value })} placeholder="https://venue.com" />
        </Field>
        <Field label="Elevate Your Experience link" half>
          <Inp value={form.elevate_url} onChange={e => f({ elevate_url: e.target.value })} placeholder="https://infinitytours.us/..." />
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>Shows as an &ldquo;Elevate Your Experience&rdquo; link on this item (Infinity travel assets, social media).</div>
        </Field>
        <Field label="Contact Name" half>
          <Inp value={form.contact_name} onChange={e => f({ contact_name: e.target.value })} placeholder="Jane Smith" />
        </Field>
        <Field label="Contact Phone" half>
          <Inp value={form.contact_phone} onChange={e => f({ contact_phone: e.target.value })} placeholder="(212) 555-0100" />
        </Field>
        <Field label="Contact Email">
          <Inp value={form.contact_email} onChange={e => f({ contact_email: e.target.value })} placeholder="groups@venue.com" />
        </Field>
        <Field label="Cost ($)" third>
          <Inp type="number" value={form.cost} onChange={e => f({ cost: e.target.value })} placeholder="0.00" />
        </Field>
        <Field label="Bus Driver Note">
          <Tex value={form.driver_note} onChange={e => f({ driver_note: e.target.value })} placeholder="Drop at main entrance, gate code 4821, idle in north lot..." style={{ minHeight: 52 }} />
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>Only visible to bus drivers and tour hosts.</div>
          {form.driver_note.trim() && form.persona_visibility?.bus_driver !== true && (
            <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "flex-start", background: "var(--amber-bg-soft)", border: "1px solid var(--amber-border)", borderRadius: 8, padding: "7px 10px", fontSize: 11.5, color: "var(--amber-text)" }}>
              <Bus size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>This item isn&rsquo;t visible to bus drivers yet. Turn on bus driver visibility above so they can see this note.</span>
            </div>
          )}
        </Field>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="cpaid" checked={form.cost_paid} onChange={e => f({ cost_paid: e.target.checked })} style={{ accentColor: BRAND.navy }} />
            <label htmlFor="cpaid" style={{ fontSize: 12, cursor: "pointer" }}>Cost paid / confirmed</label>
          </div>
          {/* Inline checkbox only when there's no full confirmation control
              (i.e. the New Item form). In the edit modal the control below
              owns the "no confirmation needed" status. */}
          {!confirmationControl && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="cnotreq" checked={form.confirmation_not_required} onChange={e => f({ confirmation_not_required: e.target.checked })} style={{ accentColor: BRAND.navy }} />
              <label htmlFor="cnotreq" style={{ fontSize: 12, cursor: "pointer" }}>No confirmation required</label>
            </div>
          )}
        </div>

        {confirmationControl && (
          <Field label="Confirmation">
            {confirmationControl}
          </Field>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onCancel} variant="muted" small>Cancel</Btn>
        <Btn onClick={onSave} small>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}</Btn>
      </div>
    </div>
  );
}

// ── ItemRow ────────────────────────────────────────────────────────────────────
// Day-header popover to bulk-set persona visibility for a day or the whole tour.
function DayVisibilityButton({ dayId, activePersonas, personaLabels, onApply }: {
  dayId: string;
  activePersonas: string[];
  personaLabels: Record<string, string>;
  onApply: (dayId: string | null, overrides: Record<string, boolean>) => void;
}) {
  const personas = activePersonas.filter(k => k !== "tour_host"); // Tour Host excluded from bulk
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>(() => Object.fromEntries(personas.map(k => [k, true])));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} title="Set visibility for this day"
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.7)", padding: 3, display: "flex", alignItems: "center" }}>
        <I n="eye" s={13} c="rgba(255,255,255,.7)" />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, width: 230, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.18)", padding: 12, cursor: "default", color: "var(--text)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Set visibility for items in this day:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {personas.map(k => (
              <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!sel[k]} onChange={() => setSel(s => ({ ...s, [k]: !s[k] }))} style={{ accentColor: BRAND.navy, width: 14, height: 14 }} />
                {personaLabel(k, personaLabels)}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginBottom: 10 }}>Tour Host always stays visible.</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Btn small onClick={() => { onApply(dayId, sel); setOpen(false); }}>Apply to Day</Btn>
            <Btn small variant="muted" onClick={() => { onApply(null, sel); setOpen(false); }}>Apply to Entire Tour</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// Itinerary item action button — dark navy icon at 80% opacity (clearly
// visible), with a distinct hover state (full opacity + subtle background;
// red for the destructive delete action).
function ActionButton({ title, onClick, active, danger, children }: {
  title: string; onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const color = active ? "var(--sky-text)" : danger && hover ? "#dc2626" : "var(--ink)";
  return (
    <button
      type="button" onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? "var(--sky-bg)" : hover ? "var(--border)" : "transparent",
        border: "none", cursor: "pointer", padding: 5, borderRadius: 6,
        color, opacity: active || hover ? 1 : 0.8,
        transition: "background .12s, opacity .12s, color .12s",
      }}
    >
      {children}
    </button>
  );
}

// Click-to-edit text block for an item note (detail / public / internal).
// Saves on blur or Ctrl/Cmd+Enter; Escape cancels. Rendering stays identical to
// the read-only block while not editing.
function InlineNote({ value, onSave, style, prefix }: {
  value: string; onSave: (v: string) => Promise<boolean>; style: React.CSSProperties; prefix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  async function commit() {
    if (saving) return;
    if (draft.trim() === value.trim()) { setEditing(false); return; }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  }
  if (editing) {
    return (
      <div style={{ ...style, padding: 0, background: "transparent", border: "none" }} onClick={e => e.stopPropagation()}>
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
          }}
          style={{ ...INP, minHeight: 64, resize: "vertical", fontSize: 12, lineHeight: 1.5 }} />
        <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 3 }}>{saving ? "Saving..." : "Click away or press Ctrl+Enter to save. Esc to cancel."}</div>
      </div>
    );
  }
  return (
    <div title="Click to edit" onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true); }}
      style={{ ...style, cursor: "text" }}>
      {prefix}{value}
    </div>
  );
}

function ItemRow({ item, groups, onEdit, onRemove, onDuplicate, onCopyToDays, onToggleCostPaid, onRemoveImage, onSaveField, onSaveIconColor, dragProps, isDragOver }: {
  item: AgendaItemWithFeedback;
  groups: TourGroup[];
  // Inline note edits (detail / public / internal) straight from the row.
  onSaveField: (field: "detail" | "public_note" | "internal_note", value: string) => Promise<boolean>;
  // Icon color picked from the row itself.
  onSaveIconColor: (hex: string | null) => void;
  onEdit: () => void; onRemove: () => void; onToggleCostPaid: () => void;
  // Duplicate = open a prefilled New Item form in this day; Copy to days =
  // pick other days to receive a copy (August 2026 request).
  onDuplicate: () => void; onCopyToDays: () => void;
  onRemoveImage: (url: string) => void;
  // Drag-to-reorder (within a day): handlers + handle. Optional so read-only
  // contexts can omit them.
  dragProps?: {
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  isDragOver?: boolean;
}) {
  // Authoritative multi-select arrays drive the leading icon (the legacy
  // singular columns are dormant rollback insurance and not read here).
  const travelMethods = item.travel_methods ?? [];
  const activitySubtypes = item.activity_subtypes ?? [];

  return (
    <div
      style={{ padding: "14px 16px", borderBottom: "1px solid var(--surface-2)", background: "var(--surface)", borderTop: isDragOver ? `2px solid ${BRAND.blue}` : "2px solid transparent" }}
      onClick={e => e.stopPropagation()}
      onDragOver={dragProps?.onDragOver}
      onDrop={dragProps?.onDrop}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {dragProps && (
          <div
            draggable
            onDragStart={dragProps.onDragStart}
            onDragEnd={dragProps.onDragEnd}
            title="Drag to reorder, or drop on another day to move it there"
            style={{ cursor: "grab", color: "var(--muted-3)", paddingTop: 6, flexShrink: 0, display: "flex" }}
          >
            <GripVertical size={15} />
          </div>
        )}
        {/* Times: bold, navy like the title, and a step larger so they catch
            the eye first (August 2026 request). */}
        <div style={{ width: 64, fontSize: 13, fontWeight: 700, color: "var(--ink)", flexShrink: 0, paddingTop: 5, textAlign: "right", lineHeight: 1.35 }}>
          {item.time || (item.end_time ? "" : <span style={{ color: "var(--muted-3)" }}>-</span>)}
          {item.end_time && <div style={{ fontSize: 12 }}>– {item.end_time}</div>}
        </div>
        {/* The icon is also the color picker: click it to recolor this item
            right here, no need to open the editor. */}
        <IconColorButton
          type={item.type}
          travelMethod={travelMethods[0] ?? null}
          subtype={activitySubtypes[0] ?? null}
          value={resolveIconColor(item)}
          onChange={hex => onSaveIconColor(hex)}
          size={32}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{item.title}</span>
            {/* The leading TypeDot icon conveys the item type; no redundant
                type/sub-type text tags here. Group tags do show, so a host can
                see which group an item is limited to. */}
            {item.custom_type_label?.trim() && (
              <span style={{ fontSize: 10, fontWeight: 700, color: AGENDA_TYPE_COLORS.activity, background: AGENDA_TYPE_COLORS.activity + "18", borderRadius: 5, padding: "1px 7px" }}>
                {item.custom_type_label}
              </span>
            )}
            {(item.group_tags ?? []).map(g => (
              <span key={g} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: BRAND.blue, background: BRAND.blue + "18", borderRadius: 5, padding: "1px 7px" }}>
                <Tag size={9} />{groupName(groups, g)}
              </span>
            ))}
            {/* Attached confirmations show only as compact links here; all
                uploading / status lives in the edit modal and Confirmations page. */}
            <ConfirmationFileChips urls={item.confirmation_urls ?? []} />
          </div>
          {item.address && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} style={{ flexShrink: 0 }} />{item.address}</div>}
          {item.detail && (
            <InlineNote value={item.detail} onSave={v => onSaveField("detail", v)}
              style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 3, whiteSpace: "pre-wrap", lineHeight: 1.5 }} />
          )}
          {item.public_note && (
            <InlineNote value={item.public_note} onSave={v => onSaveField("public_note", v)}
              style={{ fontSize: 12, background: "var(--sky-bg-soft)", border: "1px solid var(--sky-border)", borderRadius: 7, padding: "5px 10px", marginBottom: 5, color: "var(--sky-text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }} />
          )}
          {item.map_link?.trim() && (
            <div style={{ marginBottom: 4 }}>
              <GoogleMapsLink address={item.address} mapLink={item.map_link} style={{ color: "var(--sky-text)" }} fontSize={11} />
            </div>
          )}
          {item.type === "food" && (item.meal_money?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {item.meal_money.map((mm, i) => {
                const amt = typeof mm.amount === "number" ? mm.amount : null;
                // Every meal chip is the Dining yellow, matching the meal icon
                // (August 2026 request: no per-option colors).
                const style = MEAL_CHIP_STYLE;
                const label = mm.type === "stipend"
                  ? `Meal Stipend${amt != null ? ` - $${amt} on Till Card` : ""}`
                  : mm.type === "disney_dining"
                  ? `Disney Dining Dollars${amt != null ? ` - $${amt}` : ""}`
                  : mm.type === "cash"
                  ? `Cash${amt != null ? ` - $${amt}` : ""}`
                  : mm.type === "hotel_breakfast"
                  ? "Hotel Breakfast"
                  : mm.type === "delivered"
                  ? "Delivered Meal"
                  : "Group Meal";
                return (
                  <span key={`${mm.type}-${i}`} style={{ fontSize: 11, borderRadius: 6, padding: "2px 9px", fontWeight: 700, ...style }}>{label}</span>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            {item.website && (
              <a href={item.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--purple-text)", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", fontWeight: 600 }}>
                <I n="eye" s={10} />Website
              </a>
            )}
            {item.elevate_url?.trim() && (
              <a href={externalHref(item.elevate_url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: BRAND.blue, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", fontWeight: 700 }}>
                <Sparkles size={11} />Elevate Your Experience
              </a>
            )}
            {item.contact_name && (
              <span style={{ fontSize: 11, color: "var(--text-2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} style={{ flexShrink: 0 }} />{item.contact_name}{item.contact_phone ? ` · ${item.contact_phone}` : ""}
              </span>
            )}
            {item.cost > 0 && (
              <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "var(--amber-text)", fontWeight: 700 }}>{fmt$(item.cost)}</span>
                <button onClick={onToggleCostPaid}
                  style={{ background: item.cost_paid ? "var(--green-bg)" : "var(--red-bg)", color: item.cost_paid ? "var(--green-text)" : "var(--red-text)", border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {item.cost_paid ? "Paid" : "Unpaid"}
                </button>
              </span>
            )}
            {item.driver_note && <span style={{ fontSize: 10, background: "var(--amber-bg)", color: "var(--amber-text)", borderRadius: 5, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}><Bus size={11} style={{ flexShrink: 0 }} /><strong style={{ fontWeight: 700 }}>Bus Driver Note:</strong> {item.driver_note}</span>}
          </div>

          {/* Internal note — full text, own block (no truncation), host-only view. */}
          {item.internal_note && (
            <InlineNote value={item.internal_note} onSave={v => onSaveField("internal_note", v)}
              prefix={<strong style={{ fontWeight: 700 }}><Lock size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />Internal: </strong>}
              style={{ fontSize: 12, background: "var(--purple-bg)", color: "var(--purple-text)", borderRadius: 7, padding: "6px 10px", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }} />
          )}

          <AgendaImages urls={item.image_urls} fullWidth onRemove={onRemoveImage} />

          {(item.driver_map_urls?.length ?? 0) > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--amber-text)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Bus size={11} /> Driver Maps
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {item.driver_map_urls.map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" title="Open full size">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Driver map" style={{ width: 96, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid var(--amber-border)", display: "block" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {item.agenda_feedback?.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--surface-3)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-2)", marginBottom: 5 }}>
                FEEDBACK ({item.agenda_feedback.length}) - coordinator only
              </div>
              {item.agenda_feedback.map(fb => (
                <div key={fb.id} style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {(() => { const { Icon, color } = getSentimentIcon(fb.sentiment); return <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />; })()}
                  <span>
                    <span style={{ background: ROLES_TYPED[fb.role]?.bg || "var(--surface-3)", color: ROLES_TYPED[fb.role]?.color || "var(--text-2)", borderRadius: 4, padding: "0 5px", fontSize: 10, fontWeight: 600, marginRight: 5 }}>
                      {ROLES_TYPED[fb.role]?.label || fb.role}
                    </span>
                    {fb.text}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        <div style={{ display: "flex", gap: 2, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 64 }}>
          <ActionButton title="Edit item" onClick={onEdit}>
            <I n="edit" s={14} />
          </ActionButton>
          <ActionButton title="Duplicate in this day (opens a prefilled item to edit and save)" onClick={onDuplicate}>
            <Copy size={14} />
          </ActionButton>
          <ActionButton title="Copy to other days" onClick={onCopyToDays}>
            <CopyPlus size={14} />
          </ActionButton>
          <ActionButton title="Delete item" onClick={onRemove} danger>
            <I n="trash" s={14} />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

// ── AgendaTab ──────────────────────────────────────────────────────────────────
interface AgendaTabProps {
  tour: TourRow;
  days: AgendaDayWithItems[];
  members: { type?: string | null }[];
  isOwner: boolean;
  onDaysChange: (days: AgendaDayWithItems[]) => void;
  onTourChange: (patch: Record<string, any>) => void;
  onSaveHostPhone: (phone: string | null) => void | Promise<void>;
  recentlyAddedPersona?: string | null;
  onDismissAddedPersona?: () => void;
}

export default function AgendaTab({ tour, days, members, isOwner, onDaysChange, onTourChange, onSaveHostPhone, recentlyAddedPersona, onDismissAddedPersona }: AgendaTabProps) {
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState("");
  const [addMultiple, setAddMultiple] = useState(false);
  const [multiCount, setMultiCount] = useState(1);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [addingItemId, setAddingItemId] = useState<string>("");
  const [itemForm, setItemForm] = useState<ItemFormState>(BLANK);
  const [editCtx, setEditCtx] = useState<{ dayId: string; itemId: string } | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(BLANK);
  // Destination day for the edit modal's "Move to day" control. Initialized to the
  // item's current day each time the modal opens; on save, a different value moves
  // the item to that day (reassigns agenda_items.day_id).
  const [moveTargetDayId, setMoveTargetDayId] = useState<string>("");
  // Client-only day collapse (matches the participant/shared view): past days
  // start collapsed, current + future expanded; every day stays rendered (header
  // visible), and the host can expand any past day in place. Per-session — no
  // longer persisted to agenda_days.collapsed (that flag is now unused).
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(
    () => initialCollapsedDays(days),
  );
  const toggleDayCollapse = (id: string) =>
    setCollapsedDays(c => ({ ...c, [id]: !(c[id] ?? false) }));
  const [saving, setSaving] = useState(false);
  // Drag-to-reorder within a day: the item being dragged + the row index the
  // pointer is currently over (drop target indicator).
  const [dragCtx, setDragCtx] = useState<{ dayId: string; itemId: string } | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<{ dayId: string; index: number } | null>(null);
  const [previewPersona, setPreviewPersona] = useState<string | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayDateVal, setEditingDayDateVal] = useState("");
  const [confirmDeleteDayId, setConfirmDeleteDayId] = useState<string | null>(null);
  // Item delete: confirm first (August 2026 request), then a soft delete with
  // the same undo window days get. The Supabase delete is deferred until the
  // window elapses; Undo restores the row locally with no DB write.
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<{ dayId: string; itemId: string } | null>(null);
  const [undoItem, setUndoItem] = useState<{ dayId: string; item: AgendaItemWithFeedback } | null>(null);
  const pendingItemDeleteRef = useRef<{ dayId: string; item: AgendaItemWithFeedback } | null>(null);
  const undoItemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "Copy to days" picker for an item.
  const [copyCtx, setCopyCtx] = useState<{ dayId: string; item: AgendaItemWithFeedback } | null>(null);
  const [copyTargets, setCopyTargets] = useState<Record<string, boolean>>({});
  const [copying, setCopying] = useState(false);
  // Multi-group tours: host-side filter so a host can review one group's view.
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const tourGroups: TourGroup[] = (tour.groups ?? []).filter(g => g && g.id && (g.name ?? "").trim());
  // Soft-delete undo: the day pending a deferred Supabase delete, plus its
  // original index for restore. The ref mirrors the state so flush/commit logic
  // can read it synchronously (e.g. when a second delete preempts the first).
  const [undoDay, setUndoDay] = useState<{ day: AgendaDayWithItems; index: number } | null>(null);
  const pendingDeleteRef = useRef<{ day: AgendaDayWithItems; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-fresh mirror of `days` so the deferred commit/renumber and the unmount
  // cleanup read the latest state (incl. edits made during the undo window). All
  // reads happen in event handlers / timers (post-commit), so an effect-time sync
  // is sufficient and keeps refs out of render.
  const daysRef = useRef(days);
  useEffect(() => { daysRef.current = days; });

  // On unmount, commit any still-pending soft-delete so it isn't silently lost,
  // and renumber the survivors so the persisted order stays gap-free.
  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoItemTimerRef.current) clearTimeout(undoItemTimerRef.current);
    const pendingItem = pendingItemDeleteRef.current;
    if (pendingItem) {
      createClient().from("agenda_items").delete().eq("id", pendingItem.item.id);
      pendingItemDeleteRef.current = null;
    }
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    const supabase = createClient();
    supabase.from("agenda_days").delete().eq("id", pending.day.id);
    persistDayRenumber(supabase, daysRef.current.filter(d => d.id !== pending.day.id));
  }, []);

  // Open the print-optimized itinerary view in a new tab; it auto-triggers the
  // browser's print dialog (Save as PDF). Reliable, no server-side rendering.
  // An optional persona scopes the printout to exactly that role's view, reusing
  // the print route's ?persona= path (same visibility filter as the on-screen
  // preview). No persona = the full Tour Host itinerary.
  function openPrintView(personaKey?: string) {
    const q = personaKey ? `?persona=${encodeURIComponent(personaKey)}` : "";
    window.open(`/tour/${tour.id}/print${q}`, "_blank", "noopener");
  }

  const pastDays = days.filter(d => isDayInPast(d.date));
  const allCollapsed = days.length > 0 && days.every(d => collapsedDays[d.id] ?? false);
  // Are any past days currently collapsed? Drives the bulk expand/collapse button.
  const anyPastCollapsed = pastDays.some(d => collapsedDays[d.id] ?? false);

  const suggestedDate = suggestNextDate(days);
  const suggestedDateStr = suggestedDate ? formatAgendaDate(suggestedDate) : "";

  const openAddDay = () => {
    setNewDayDate(suggestedDateStr);
    setMultiCount(1);
    setAddMultiple(false);
    setShowAddDay(true);
  };

  // ── helpers ──────────────────────────────────────────────────────────────────
  function formToInsert(f: ItemFormState, dayId: string, sortOrder: number) {
    return {
      day_id: dayId, tour_id: tour.id, sort_order: sortOrder,
      time: f.time || null, end_time: f.end_time || null, type: f.type, title: f.title,
      detail: f.detail || null, public_note: f.public_note || null,
      address: f.address || null, map_link: f.map_link || null,
      website: f.website || null,
      // Authoritative arrays:
      travel_methods: f.travel_methods,
      activity_subtypes: f.activity_subtypes,
      // Legacy singular sync (dormant rollback insurance — first element only):
      travel_method: (f.travel_methods[0] as TravelMethod) || null,
      activity_subtype: f.activity_subtypes[0] || null,
      contact_name: f.contact_name || null, contact_phone: f.contact_phone || null,
      contact_email: f.contact_email || null, cost: parseFloat(f.cost) || 0,
      cost_paid: f.cost_paid, confirmation_not_required: f.confirmation_not_required, driver_note: f.driver_note || null,
      internal_note: f.internal_note || null,
      // Authoritative meal-money list: drop blank/invalid amounts; group carries none.
      meal_money: f.meal_money.map(e => {
        if (!mealMoneyHasAmount(e.type)) return { type: e.type };
        const n = parseFloat(e.amount);
        return { type: e.type, amount: Number.isFinite(n) ? n : null };
      }),
      // Legacy meal sync (dormant rollback insurance):
      meal_pay_type: mealLegacyType(f.meal_money),
      stipend_amount: (() => {
        const s = f.meal_money.find(e => e.type === "stipend");
        const n = s ? parseFloat(s.amount) : NaN;
        return Number.isFinite(n) ? n : null;
      })(),
      item_visibility: null,
      persona_visibility: f.persona_visibility,
      feedback_enabled: f.feedback_enabled,
      image_urls: f.image_urls,
      driver_map_urls: f.driver_map_urls,
      // Flight/bus icon colors only meaningful when the matching method is on.
      // One color for every item type. The legacy per-type columns are cleared
      // so resolveIconColor() never falls back to a stale value after an edit.
      icon_color: f.icon_color || null,
      flight_icon_color: null,
      bus_icon_color: null,
      meeting_icon_color: null,
      elevate_url: f.elevate_url.trim() || null,
      group_tags: f.group_tags,
      custom_type_label: f.type === "activity" && f.activity_subtypes.includes("other") ? (f.custom_type_label.trim() || null) : null,
    };
  }

  function itemToForm(item: AgendaItemWithFeedback): ItemFormState {
    return {
      time: item.time || "", end_time: item.end_time || "", type: item.type, title: item.title,
      // Prefer the authoritative arrays; fall back to the legacy singular only to
      // hydrate the editor for rows not yet migrated (prevents data loss on save).
      activity_subtypes: item.activity_subtypes ?? (item.activity_subtype ? [item.activity_subtype] : []),
      travel_methods: item.travel_methods ?? (item.travel_method ? [item.travel_method] : []),
      detail: item.detail || "", public_note: item.public_note || "",
      address: item.address || "", map_link: item.map_link || "",
      website: item.website || "",
      contact_name: item.contact_name || "", contact_phone: item.contact_phone || "",
      contact_email: item.contact_email || "",
      cost: item.cost > 0 ? String(item.cost) : "",
      cost_paid: item.cost_paid, confirmation_not_required: !!item.confirmation_not_required, driver_note: item.driver_note || "",
      internal_note: item.internal_note || "",
      meal_money: mealMoneyToForm(item),
      persona_visibility: item.persona_visibility ?? defaultPersonaVisibility(item.type, item.travel_methods ?? (item.travel_method ? [item.travel_method] : [])),
      feedback_enabled: item.feedback_enabled ?? isActivityType(item.type, item.activity_subtypes ?? item.activity_subtype),
      image_urls: item.image_urls || [],
      driver_map_urls: item.driver_map_urls || [],
      icon_color: resolveIconColor(item),
      elevate_url: item.elevate_url || "",
      group_tags: item.group_tags ?? [],
      custom_type_label: item.custom_type_label || "",
    };
  }

  // Icon color picked straight from the item row. Optimistic, and the legacy
  // per-type columns are cleared so the new choice is the only source.
  async function saveIconColor(dayId: string, itemId: string, hex: string | null) {
    const patch = { icon_color: hex, flight_icon_color: null, bus_icon_color: null, meeting_icon_color: null };
    const before = daysRef.current;
    onDaysChange(before.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === itemId ? { ...i, ...patch } : i) } : d));
    const { data, error } = await createClient().from("agenda_items").update(patch).eq("id", itemId).select("id");
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.icon_color] save failed", { itemId, error });
      onDaysChange(before);
      if (typeof window !== "undefined") window.alert(`Could not change the icon color: ${error?.message ?? "no row updated (permission?)"}`);
    }
  }

  // Inline note edit from the itinerary view (click the note text): writes just
  // that field and reflects it locally. Surfaces a refused write.
  async function saveItemField(dayId: string, itemId: string, field: "detail" | "public_note" | "internal_note", value: string) {
    const v = value.trim() || null;
    const { data, error } = await createClient().from("agenda_items").update({ [field]: v }).eq("id", itemId).select("id");
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.inline] save failed", { itemId, field, error });
      if (typeof window !== "undefined") window.alert(`Could not save the note: ${error?.message ?? "no row updated (permission?)"}`);
      return false;
    }
    onDaysChange(daysRef.current.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === itemId ? { ...i, [field]: v } : i) } : d));
    return true;
  }

  // Whether any OTHER item on the tour still references an image URL (copies
  // share files with their source), so removing it from one item never deletes
  // the storage object the other item still shows.
  function isImageShared(url: string, exceptItemId: string): boolean {
    return daysRef.current.some(d => d.agenda_items.some(i =>
      i.id !== exceptItemId && ((i.image_urls ?? []).includes(url) || (i.driver_map_urls ?? []).includes(url)),
    ));
  }

  // ── day mutations ─────────────────────────────────────────────────────────────
  async function addDay() {
    if (!newDayDate) return;
    const startDate = parseAgendaDate(newDayDate);
    if (!startDate) { alert("Please enter a valid date like Apr 14 or Apr 14, 2026"); return; }
    const count = addMultiple ? Math.max(1, multiCount) : 1;
    const supabase = createClient();
    const inserts = Array.from({ length: count }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return { tour_id: tour.id, day_number: days.length + i + 1, date: formatAgendaDate(d), collapsed: false, sort_order: days.length + i + 1 };
    });
    const { data } = await supabase.from("agenda_days").insert(inserts).select();
    if (data) onDaysChange([...days, ...data.map(r => ({ ...r, agenda_items: [] as AgendaItemWithFeedback[] }))]);
    setNewDayDate("");
    setShowAddDay(false);
  }

  // Soft-delete with a 5s undo window. The confirmed day is removed from local
  // state immediately (optimistic), but the Supabase delete is deferred: an undo
  // toast lets the user restore it with no DB write. If the window elapses (or a
  // second day is deleted, or the tab unmounts), the deferred delete is committed.
  // Permanently delete a day, then renumber the survivors to a contiguous 1..N so
  // sort_order and day_number stay gap-free everywhere (print / role /
  // confirmation views). `survivors` is the current local state with the day
  // already removed; only changed rows are written. Returns the renumbered array
  // so a caller can chain a follow-up optimistic update off the fresh order.
  function commitDayDelete(dayId: string, survivors: AgendaDayWithItems[], syncLocal = true): AgendaDayWithItems[] {
    const supabase = createClient();
    supabase.from("agenda_days").delete().eq("id", dayId);
    persistDayRenumber(supabase, survivors);
    const renumbered = survivors.map((d, i) => ({ ...d, sort_order: i + 1, day_number: i + 1 }));
    const changed = renumbered.some((d, i) => survivors[i].sort_order !== d.sort_order || survivors[i].day_number !== d.day_number);
    if (syncLocal && changed) onDaysChange(renumbered);
    return renumbered;
  }

  // Commit any in-flight soft-delete right now and clear the toast/timer; returns
  // the resulting (renumbered) day list, or null if nothing was pending. Reads
  // from refs so it works synchronously (e.g. when a second delete preempts).
  function flushPendingDelete(): AgendaDayWithItems[] | null {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    const pending = pendingDeleteRef.current;
    if (!pending) return null;
    const renumbered = commitDayDelete(pending.day.id, daysRef.current.filter(d => d.id !== pending.day.id));
    pendingDeleteRef.current = null;
    setUndoDay(null);
    return renumbered;
  }

  function requestDeleteDay(dayId: string) {
    // Only one undo can be pending at a time — commit the previous one first and
    // build the new removal off the order it leaves behind.
    const base = flushPendingDelete() ?? daysRef.current;
    const index = base.findIndex(d => d.id === dayId);
    if (index === -1) return;
    const day = base[index];
    // Optimistically drop the day from the UI (no renumber yet — keeps undo simple
    // and the restore exact; the renumber happens only on the permanent commit).
    onDaysChange(base.filter(d => d.id !== dayId));
    pendingDeleteRef.current = { day, index };
    setUndoDay({ day, index });
    undoTimerRef.current = setTimeout(() => {
      // Renumber against the freshest state so edits during the window survive.
      commitDayDelete(day.id, daysRef.current.filter(d => d.id !== day.id));
      pendingDeleteRef.current = null;
      undoTimerRef.current = null;
      setUndoDay(null);
    }, UNDO_WINDOW_MS);
  }

  function undoDeleteDay() {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    const pending = pendingDeleteRef.current;
    if (!pending) return;
    // Restore the day (with its items) at its original position; no DB write.
    const restored = [...daysRef.current];
    restored.splice(Math.min(pending.index, restored.length), 0, pending.day);
    onDaysChange(restored);
    pendingDeleteRef.current = null;
    setUndoDay(null);
  }

  // Move the day at `index` one slot up (dir -1) or down (dir +1). The visible
  // order is the array order, so we swap the two neighbours, then renumber to a
  // contiguous 1..N. Both sort_order (ordering) and day_number (the label other
  // views render) are kept in sync so the whole app stays consistent. Local state
  // updates first so the UI feels instant; only changed rows are persisted.
  async function moveDay(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= days.length) return;
    const reordered = [...days];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const next = reordered.map((d, i) => ({ ...d, sort_order: i + 1, day_number: i + 1 }));
    const changed = next.filter(d => {
      const prev = days.find(o => o.id === d.id);
      return prev?.sort_order !== d.sort_order || prev?.day_number !== d.day_number;
    });
    onDaysChange(next);
    const supabase = createClient();
    await Promise.all(
      changed.map(d => supabase.from("agenda_days").update({ sort_order: d.sort_order, day_number: d.day_number }).eq("id", d.id)),
    );
  }


  async function updateDayDate(dayId: string, isoDate: string) {
    if (!isoDate) return;
    const d = new Date(isoDate + "T12:00:00");
    const formatted = formatAgendaDate(d);
    const supabase = createClient();
    await supabase.from("agenda_days").update({ date: formatted }).eq("id", dayId);
    onDaysChange(days.map(dy => dy.id === dayId ? { ...dy, date: formatted } : dy));
    setEditingDayId(null);
  }

  // ── item mutations ────────────────────────────────────────────────────────────
  // Renumber a day's items to a contiguous 1..N in the given order, update local
  // state, and persist only the rows whose sort_order changed. The display order
  // is sort_order-driven (manual drag wins; time changes re-slot on save).
  function applyItemOrder(dayId: string, ordered: AgendaItemWithFeedback[]) {
    const renumbered = ordered.map((it, i) => ({ ...it, sort_order: i + 1 }));
    const changed = renumbered.filter((it, i) => ordered[i].sort_order !== i + 1);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: renumbered } : d));
    if (changed.length) {
      const supabase = createClient();
      changed.forEach(it => {
        supabase.from("agenda_items").update({ sort_order: it.sort_order }).eq("id", it.id)
          .then(({ error }) => { if (error) console.error("[agenda_items.sort_order] persist failed", error.message); });
      });
    }
    return renumbered;
  }

  async function saveItem(dayId: string) {
    if (!itemForm.title.trim()) return;
    setSaving(true);
    const day = days.find(d => d.id === dayId);
    const supabase = createClient();
    // Slot the new item by its time among the day's current display order
    // (untimed items go to the end). The whole day is renumbered after insert.
    const ordered = orderAgendaItems(day?.agenda_items ?? []);
    const insertIdx = timeInsertIndex(ordered, itemForm.time || null);
    // Insert with the pre-generated id so uploaded images already live under
    // agenda-images/[tourId]/[itemId]/ match the saved row.
    // Inspect the response — never optimistically "succeed". A bad/unknown column
    // or an RLS denial returns an error (or no row) that must surface, otherwise
    // the form looks saved while nothing persists.
    const { data, error } = await supabase.from("agenda_items")
      .insert({ id: addingItemId, ...formToInsert(itemForm, dayId, insertIdx + 1) })
      .select().single();
    setSaving(false);
    if (error || !data) {
      console.error("[agenda_items.insert] save failed", { dayId, itemId: addingItemId, error });
      if (typeof window !== "undefined") {
        window.alert(`Could not add item: ${error?.message ?? "no row inserted (permission?)"}`);
      }
      return; // keep the form open so the host can retry; nothing was persisted
    }
    const newItem = { ...data, agenda_feedback: [] } as AgendaItemWithFeedback;
    const nextOrdered = [...ordered.slice(0, insertIdx), newItem, ...ordered.slice(insertIdx)];
    applyItemOrder(dayId, nextOrdered);
    setItemForm(BLANK);
    setAddingItem(null);
    setAddingItemId("");
  }

  async function updateItem() {
    if (!editCtx || !editForm.title.trim()) return;
    setSaving(true);
    // confirmation_not_required is managed live by ItemConfirmationControl (which
    // writes immediately), so exclude it here to avoid overwriting it with the
    // form's stale value on save.
    const { day_id, tour_id, sort_order, confirmation_not_required, ...patch } = formToInsert(editForm, editCtx.dayId, 0);
    // "Move to day": if the host picked a different day, reassign the FK by adding
    // day_id back into the patch (otherwise it's deliberately excluded).
    const targetDayId = moveTargetDayId && moveTargetDayId !== editCtx.dayId ? moveTargetDayId : null;
    const updatePayload = targetDayId ? { ...patch, day_id: targetDayId } : patch;
    const supabase = createClient();
    // Inspect the response — surface errors / zero-row updates instead of
    // applying the change to local state and looking saved while nothing persists.
    const { data, error } = await supabase.from("agenda_items").update(updatePayload).eq("id", editCtx.itemId).select();
    setSaving(false);
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.update] save failed", { itemId: editCtx.itemId, error });
      if (typeof window !== "undefined") {
        window.alert(`Could not save changes: ${error?.message ?? "no row updated (permission?)"}`);
      }
      return; // keep the edit modal open; local state stays at the last-saved truth
    }
    const origItem = days.find(d => d.id === editCtx.dayId)?.agenda_items.find(i => i.id === editCtx.itemId);
    const timeChanged = (origItem?.time ?? "") !== (editForm.time ?? "");
    if (targetDayId) {
      // Move locally: drop from the current day, slot into the destination day
      // by time (display order is sort_order-driven, so we renumber there).
      const moving = origItem;
      const dest = days.find(d => d.id === targetDayId);
      const destOrdered = orderAgendaItems(dest?.agenda_items ?? []);
      const idx = timeInsertIndex(destOrdered, editForm.time || null);
      const movedItem = moving ? { ...moving, ...patch, day_id: targetDayId } as AgendaItemWithFeedback : null;
      const destRenumbered = movedItem
        ? [...destOrdered.slice(0, idx), movedItem, ...destOrdered.slice(idx)].map((it, i) => ({ ...it, sort_order: i + 1 }))
        : destOrdered;
      onDaysChange(days.map(d => {
        if (d.id === editCtx.dayId) return { ...d, agenda_items: d.agenda_items.filter(i => i.id !== editCtx.itemId) };
        if (d.id === targetDayId) return { ...d, agenda_items: destRenumbered };
        return d;
      }));
      // Persist the destination-day renumber (only rows whose position changed).
      destRenumbered.forEach(it => {
        const prev = it.id === editCtx.itemId ? null : destOrdered.find(o => o.id === it.id);
        if (!prev || prev.sort_order !== it.sort_order) {
          supabase.from("agenda_items").update({ sort_order: it.sort_order }).eq("id", it.id)
            .then(({ error: e }) => { if (e) console.error("[agenda_items.sort_order] persist failed", e.message); });
        }
      });
    } else if (timeChanged) {
      // Time changed: re-slot the item within its day by the new time (manual
      // drag order for the other items is preserved).
      const dayItems = orderAgendaItems((days.find(d => d.id === editCtx.dayId)?.agenda_items ?? []));
      const others = dayItems.filter(i => i.id !== editCtx.itemId);
      const idx = timeInsertIndex(others, editForm.time || null);
      const updated = { ...dayItems.find(i => i.id === editCtx.itemId)!, ...patch } as AgendaItemWithFeedback;
      applyItemOrder(editCtx.dayId, [...others.slice(0, idx), updated, ...others.slice(idx)]);
    } else {
      onDaysChange(days.map(d => d.id === editCtx.dayId ? {
        ...d, agenda_items: d.agenda_items.map(i => i.id === editCtx.itemId ? { ...i, ...patch } : i),
      } : d));
    }
    setEditCtx(null);
  }

  // Commit any pending item soft-delete right now (a second delete, or a
  // navigation, must not lose it).
  function flushPendingItemDelete() {
    if (undoItemTimerRef.current) { clearTimeout(undoItemTimerRef.current); undoItemTimerRef.current = null; }
    const pending = pendingItemDeleteRef.current;
    if (!pending) return;
    createClient().from("agenda_items").delete().eq("id", pending.item.id)
      .then(({ error }) => { if (error) console.error("[agenda_items.delete] failed", error.message); });
    pendingItemDeleteRef.current = null;
    setUndoItem(null);
  }

  // Runs after the confirm modal: drop the item locally, defer the DB delete.
  function requestDeleteItem(dayId: string, itemId: string) {
    flushPendingItemDelete();
    const item = daysRef.current.find(d => d.id === dayId)?.agenda_items.find(i => i.id === itemId);
    if (!item) return;
    onDaysChange(daysRef.current.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.filter(i => i.id !== itemId) } : d));
    pendingItemDeleteRef.current = { dayId, item };
    setUndoItem({ dayId, item });
    undoItemTimerRef.current = setTimeout(() => {
      const pending = pendingItemDeleteRef.current;
      if (pending) {
        createClient().from("agenda_items").delete().eq("id", pending.item.id)
          .then(({ error }) => { if (error) console.error("[agenda_items.delete] failed", error.message); });
      }
      pendingItemDeleteRef.current = null;
      undoItemTimerRef.current = null;
      setUndoItem(null);
    }, UNDO_WINDOW_MS);
  }

  function undoDeleteItem() {
    if (undoItemTimerRef.current) { clearTimeout(undoItemTimerRef.current); undoItemTimerRef.current = null; }
    const pending = pendingItemDeleteRef.current;
    if (!pending) return;
    // Restore in its day; display order is sort_order-driven so it lands back
    // where it was. If the day itself is gone, the item goes with it.
    onDaysChange(daysRef.current.map(d => d.id === pending.dayId
      ? { ...d, agenda_items: [...d.agenda_items.filter(i => i.id !== pending.item.id), pending.item] }
      : d));
    pendingItemDeleteRef.current = null;
    setUndoItem(null);
  }

  async function removeItemImage(dayId: string, item: AgendaItemWithFeedback, url: string) {
    const next = (item.image_urls || []).filter(u => u !== url);
    const supabase = createClient();
    await supabase.from("agenda_items").update({ image_urls: next }).eq("id", item.id);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === item.id ? { ...i, image_urls: next } : i) } : d));
    if (isImageShared(url, item.id)) return;
    const path = storagePathFromUrl(url);
    if (path) { try { await supabase.storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
  }

  // Duplicate: open the New Item form in the same day, prefilled from the
  // source item, so the host can tweak (e.g. the time) and save.
  function duplicateItem(dayId: string, item: AgendaItemWithFeedback) {
    setAddingItem(dayId);
    setAddingItemId(crypto.randomUUID());
    setItemForm(itemToForm(item));
    setCollapsedDays(c => ({ ...c, [dayId]: false }));
  }

  // Copy an item into several days at once (e.g. hotel breakfast every
  // morning). Each copy is a new row slotted by time; confirmations and
  // feedback are not copied (they belong to the original booking).
  async function copyItemToDays(source: AgendaItemWithFeedback, targetDayIds: string[]) {
    if (targetDayIds.length === 0) return;
    setCopying(true);
    const supabase = createClient();
    const form = itemToForm(source);
    const rows = targetDayIds.map(dayId => {
      const day = daysRef.current.find(d => d.id === dayId);
      const ordered = orderAgendaItems(day?.agenda_items ?? []);
      const idx = timeInsertIndex(ordered, source.time || null);
      return { id: crypto.randomUUID(), ...formToInsert(form, dayId, idx + 1) };
    });
    const { data, error } = await supabase.from("agenda_items").insert(rows).select();
    setCopying(false);
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.insert] copy failed", error);
      if (typeof window !== "undefined") window.alert(`Could not copy the item: ${error?.message ?? "no rows inserted (permission?)"}`);
      return;
    }
    // Slot each copy into its day locally and renumber that day (persisting
    // only rows whose position changed).
    let next = daysRef.current;
    for (const row of data as AgendaItemWithFeedback[]) {
      next = next.map(d => {
        if (d.id !== row.day_id) return d;
        const ordered = orderAgendaItems(d.agenda_items);
        const idx = timeInsertIndex(ordered, row.time || null);
        const merged = [...ordered.slice(0, idx), { ...row, agenda_feedback: [] }, ...ordered.slice(idx)]
          .map((it, i) => ({ ...it, sort_order: i + 1 }));
        merged.forEach(it => {
          const prev = ordered.find(o => o.id === it.id);
          if (it.id !== row.id && prev && prev.sort_order !== it.sort_order) {
            supabase.from("agenda_items").update({ sort_order: it.sort_order }).eq("id", it.id)
              .then(({ error: e }) => { if (e) console.error("[agenda_items.sort_order] persist failed", e.message); });
          }
        });
        return { ...d, agenda_items: merged };
      });
    }
    onDaysChange(next);
    setCopyCtx(null);
    setCopyTargets({});
  }

  async function toggleCostPaid(dayId: string, item: AgendaItemWithFeedback) {
    const supabase = createClient();
    await supabase.from("agenda_items").update({ cost_paid: !item.cost_paid }).eq("id", item.id);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === item.id ? { ...i, cost_paid: !i.cost_paid } : i) } : d));
  }

  // Reflect a confirmation change (made by ItemConfirmationControl, which has
  // already written the agenda_items row) into local state, so the row, the
  // edit modal, and the Confirmations page all stay in sync.
  function patchConfirmation(dayId: string, itemId: string, patch: ConfirmationPatch) {
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === itemId ? { ...i, ...patch } : i) } : d));
  }

  // Drop the dragged item at `targetIndex` within `dayId`'s display order.
  // Same-day drops reorder; a drop on another day MOVES the item there
  // (August 2026 request: drag items between days), reassigning day_id and
  // renumbering both days.
  function handleItemDrop(dayId: string, targetIndex: number) {
    const ctx = dragCtx;
    setDragCtx(null);
    setDragOverIdx(null);
    if (!ctx) return;
    if (ctx.dayId === dayId) {
      const ordered = orderAgendaItems(days.find(d => d.id === dayId)?.agenda_items ?? []);
      const fromIdx = ordered.findIndex(i => i.id === ctx.itemId);
      if (fromIdx === -1) return;
      const without = ordered.filter(i => i.id !== ctx.itemId);
      const insertAt = Math.max(0, Math.min(targetIndex > fromIdx ? targetIndex - 1 : targetIndex, without.length));
      if (insertAt === fromIdx) return;
      applyItemOrder(dayId, [...without.slice(0, insertAt), ordered[fromIdx], ...without.slice(insertAt)]);
      return;
    }
    const moving = days.find(d => d.id === ctx.dayId)?.agenda_items.find(i => i.id === ctx.itemId);
    if (!moving) return;
    const supabase = createClient();
    const sourceOrdered = orderAgendaItems(days.find(d => d.id === ctx.dayId)?.agenda_items ?? []).filter(i => i.id !== ctx.itemId);
    const destOrdered = orderAgendaItems(days.find(d => d.id === dayId)?.agenda_items ?? []);
    const insertAt = Math.max(0, Math.min(targetIndex, destOrdered.length));
    const movedItem = { ...moving, day_id: dayId };
    const destRenumbered = [...destOrdered.slice(0, insertAt), movedItem, ...destOrdered.slice(insertAt)].map((it, i) => ({ ...it, sort_order: i + 1 }));
    const sourceRenumbered = sourceOrdered.map((it, i) => ({ ...it, sort_order: i + 1 }));
    onDaysChange(days.map(d => {
      if (d.id === ctx.dayId) return { ...d, agenda_items: sourceRenumbered };
      if (d.id === dayId) return { ...d, agenda_items: destRenumbered };
      return d;
    }));
    // Persist: the move itself (day_id + position), then only the neighbours
    // whose position changed. The move is checked so a refused write shows.
    const movedRow = destRenumbered.find(it => it.id === ctx.itemId)!;
    supabase.from("agenda_items").update({ day_id: dayId, sort_order: movedRow.sort_order }).eq("id", ctx.itemId).select("id")
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          console.error("[agenda_items.move] failed", error);
          if (typeof window !== "undefined") window.alert(`Could not move the item: ${error?.message ?? "no row updated (permission?)"}`);
          onDaysChange(daysRef.current.map(d => {
            if (d.id === dayId) return { ...d, agenda_items: d.agenda_items.filter(i => i.id !== ctx.itemId) };
            if (d.id === ctx.dayId) return { ...d, agenda_items: [...d.agenda_items, moving] };
            return d;
          }));
        }
      });
    destRenumbered.forEach(it => {
      const prev = destOrdered.find(o => o.id === it.id);
      if (it.id !== ctx.itemId && prev && prev.sort_order !== it.sort_order) {
        supabase.from("agenda_items").update({ sort_order: it.sort_order }).eq("id", it.id)
          .then(({ error }) => { if (error) console.error("[agenda_items.sort_order] persist failed", error.message); });
      }
    });
    sourceRenumbered.forEach(it => {
      const prev = sourceOrdered.find(o => o.id === it.id);
      if (prev && prev.sort_order !== it.sort_order) {
        supabase.from("agenda_items").update({ sort_order: it.sort_order }).eq("id", it.id)
          .then(({ error }) => { if (error) console.error("[agenda_items.sort_order] persist failed", error.message); });
      }
    });
  }

  // Bulk-apply persona visibility to a day (dayId) or the whole tour (null).
  // Tour Host always stays visible.
  async function applyBulkVisibility(dayId: string | null, overrides: Record<string, boolean>) {
    const supabase = createClient();
    await supabase.rpc("bulk_set_persona_visibility", { p_tour: tour.id, p_day: dayId, p_overrides: overrides });
    const apply = (i: AgendaItemWithFeedback) => ({ ...i, persona_visibility: { ...(i.persona_visibility || {}), ...overrides, tour_host: true } });
    onDaysChange(days.map(d => (dayId === null || d.id === dayId) ? { ...d, agenda_items: d.agenda_items.map(apply) } : d));
  }

  // ── render ────────────────────────────────────────────────────────────────────
  if (previewPersona) {
    const persona = getPersona(previewPersona);
    return (
      <AgendaRoleView
        tourName={tour.name}
        tourDestination={tour.destination}
        tourDates={tour.dates}
        bannerUrl={tour.banner_image_url}
        bannerFocusX={tour.banner_focus_x ?? 50}
        bannerFocusY={tour.banner_focus_y ?? 50}
        tripInfo={buildTripInfo({
          tour,
          members,
          days,
          hostName: (tour as any).tour_hosts?.name ?? null,
          hostPhone: (tour as any).tour_hosts?.phone ?? null,
        })}
        days={days}
        confTourId={tour.id}
        role={(persona?.viewRole ?? "student") as Role}
        roleLabel={personaLabel(previewPersona, tour.persona_labels)}
        personaKey={previewPersona}
        onClose={() => setPreviewPersona(null)}
        embedded
        tourId={tour.id}
        generalFeedbackEnabled={tour.general_feedback_enabled}
        tourEndDate={tour.end_date}
      />
    );
  }

  // Trip Information (host editing view). Locate the itinerary items that
  // back the Hotel / Bus rows so the inline editor can open their edit modals.
  // Mirrors buildTripInfo's selection: prefer a "Check In - <Name>" hotel item.
  const openEditItem = (dayId: string, item: AgendaItemWithFeedback) => {
    setEditCtx({ dayId, itemId: item.id });
    setEditForm(itemToForm(item));
    setMoveTargetDayId(dayId);
  };
  const itemLocs = days.flatMap(d => (d.agenda_items ?? []).map(item => ({ dayId: d.id, item })));
  const hotelLocs = itemLocs.filter(x => x.item.type === "hotel");
  const hotelLoc = hotelLocs.find(x => /[-–]/.test(x.item.title ?? "")) ?? hotelLocs[0] ?? null;
  const busLoc = itemLocs.find(x => (x.item.travel_methods ?? []).includes("bus") && (x.item.contact_name || x.item.contact_phone))
    ?? itemLocs.find(x => (x.item.travel_methods ?? []).includes("bus")) ?? null;
  const flightLoc = itemLocs.find(x => (x.item.travel_methods ?? []).includes("flight")) ?? null;

  return (
    <div>
      {/* Persona-added review banner */}
      {recentlyAddedPersona && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--amber-bg-soft)", border: "1.5px solid var(--amber-border)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: "var(--amber-text)", flex: 1 }}>
            <strong>{personaLabel(recentlyAddedPersona, tour.persona_labels)}</strong> was added to this tour. Review item visibility to choose what they can see.
          </span>
          <button onClick={onDismissAddedPersona} title="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--amber-text)", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <I n="x" s={14} c="var(--amber-text)" />
          </button>
        </div>
      )}

      {/* Header tile (incl. banner) — gives the host a live view without
          entering a preview mode. Mirrors the preview/participant header. */}
      <ItineraryHeaderTile
        tourName={tour.name}
        tourDestination={tour.destination}
        tourDates={tour.dates}
        bannerUrl={tour.banner_image_url}
        focusX={tour.banner_focus_x ?? 50}
        focusY={tour.banner_focus_y ?? 50}
        badgeLabel={personaLabel("tour_host", tour.persona_labels)}
        badgeBg={personaColors("tour_host").bg}
        badgeColor={personaColors("tour_host").color}
      />

      {/* Preview role buttons — primary action, prominent at the top */}
      {days.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", marginBottom: 2 }}>Preview the Itinerary</div>
          <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 12 }}>See exactly what each role sees on the shared view, then share the link.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {/* One preview per active participant persona (Tour Host = the editor). */}
            {activePersonaKeys(tour.active_personas).filter(k => k !== "tour_host").map(key => {
              const meta = personaColors(key);
              return (
                <button key={key} onClick={() => setPreviewPersona(key)}
                  style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: meta.bg, color: meta.color, border: `1.5px solid ${meta.color}22`, borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <I n="eye" s={15} />Preview {personaLabel(key, tour.persona_labels)}
                </button>
              );
            })}
            <button onClick={() => setLinksOpen(true)}
              title="Open the per-role access links below"
              style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.blue, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <I n="link" s={15} />Share Links
              </button>
            {/* Print / Save as PDF — full itinerary, or scoped to one role's view
                (same visibility filter as that role's on-screen preview). */}
            <div style={{ position: "relative", flex: "1 1 140px", minWidth: 130 }}>
              <button onClick={() => setPrintMenuOpen(o => !o)}
                title="Print or save a PDF — the full itinerary or a specific role's view"
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Printer size={15} />Print / Save as PDF
                <div style={{ transform: printMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s", display: "flex" }}>
                  <I n="chevron" s={13} c="#fff" />
                </div>
              </button>
              {printMenuOpen && (
                <>
                  {/* Click-away backdrop closes the menu. */}
                  <div onClick={() => setPrintMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 41, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,.14)", overflow: "hidden", minWidth: 210 }}>
                    <button onClick={() => { setPrintMenuOpen(false); openPrintView(); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid var(--surface-3)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "left" }}>
                      <Printer size={14} />Full itinerary
                      <span style={{ color: "var(--muted-2)", fontWeight: 600, marginLeft: "auto" }}>{personaLabel("tour_host", tour.persona_labels)}</span>
                    </button>
                    {activePersonaKeys(tour.active_personas).filter(k => k !== "tour_host").map(key => {
                      const meta = personaColors(key);
                      return (
                        <button key={key} onClick={() => { setPrintMenuOpen(false); openPrintView(key); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "left" }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                          {personaLabel(key, tour.persona_labels)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Access codes — secondary, subdued and collapsed below the preview */}
      <AccessLinkManager tour={tour} onTourChange={onTourChange} open={linksOpen} setOpen={setLinksOpen} isOwner={isOwner} />

      {/* Trip Information — same card the participants see, editable by the host. */}
      <TripInformation
        info={buildTripInfo({
          tour,
          members,
          days,
          hostName: (tour as any).tour_hosts?.name ?? null,
          hostPhone: (tour as any).tour_hosts?.phone ?? null,
        })}
        isHost
        viewerPersona="tour_host"
        initiallyCollapsed={tripInfoStartsCollapsed(days)}
        tourId={tour.id}
        onSaveTour={onTourChange}
        onSaveHostPhone={onSaveHostPhone}
        onEditFlight={flightLoc ? () => openEditItem(flightLoc.dayId, flightLoc.item) : null}
        onEditHotel={hotelLoc ? () => openEditItem(hotelLoc.dayId, hotelLoc.item) : null}
        onEditBus={busLoc ? () => openEditItem(busLoc.dayId, busLoc.item) : null}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em" }}>
            {days.length} day{days.length !== 1 ? "s" : ""} planned
          </span>
          {pastDays.length > 0 && (
            // Bulk expand/collapse of past days. Past days are still rendered
            // (collapsed) — this just flips them all at once; each is also
            // expandable individually by clicking its header.
            <button onClick={() => setCollapsedDays(c => {
              const m = { ...c };
              pastDays.forEach(d => { m[d.id] = !anyPastCollapsed; });
              return m;
            })}
              style={{ background: anyPastCollapsed ? "var(--surface-3)" : "var(--sky-bg)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: anyPastCollapsed ? "var(--muted)" : "var(--sky-text)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              {anyPastCollapsed ? "Expand" : "Collapse"} {pastDays.length} past day{pastDays.length !== 1 ? "s" : ""}
            </button>
          )}
          {days.length > 1 && (
            // Collapse or expand every day at once.
            <button onClick={() => setCollapsedDays(Object.fromEntries(days.map(d => [d.id, !allCollapsed])))}
              title={allCollapsed ? "Expand all days" : "Collapse all days"}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface-3)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--muted)", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              <ChevronsUpDown size={12} />{allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Btn onClick={openAddDay} small><I n="plus" s={12} />Add Day</Btn>
        </div>
      </div>

      {/* Multi-group tours: filter the list to one group's schedule (items
          with no group always show). Groups are defined in Settings. */}
      {tourGroups.length > 0 && days.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .6, display: "inline-flex", alignItems: "center", gap: 4 }}><Tag size={11} />Show</span>
          {[{ id: null as string | null, name: "All groups" }, ...tourGroups].map(g => {
            const on = groupFilter === g.id;
            return (
              <button key={g.id ?? "all"} type="button" onClick={() => setGroupFilter(g.id)}
                style={{ padding: "4px 11px", borderRadius: 20, border: `1.5px solid ${on ? BRAND.blue : "var(--border)"}`, background: on ? BRAND.blue + "18" : "var(--surface)", color: on ? BRAND.blue : "var(--muted)", fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                {g.name}
              </button>
            );
          })}
        </div>
      )}

      {days.length === 0 && (
        <div style={{ background: "var(--surface-2)", border: "2px dashed var(--border)", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 13 }}>
          No itinerary days yet. Add your first day to get started.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {days.map((day, idx) => {
          const past = isDayInPast(day.date);
          const collapsed = collapsedDays[day.id] ?? false;
          // Weekday + date, from the shared helper so the editor, the shared
          // link, and the PDF all label days the same way. Abbreviated on screen
          // (September 2026 request: "Wed"), spelled out in print.
          return (
            <div key={day.id} style={{ background: "var(--surface)", border: `1.5px solid ${past ? "var(--border)" : "var(--border-soft)"}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div
                style={{ background: dragCtx && dragCtx.dayId !== day.id && dragOverIdx?.dayId === day.id && dragOverIdx.index === -1 ? BRAND.blue : BRAND.navy, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "background .12s" }}
                onClick={() => toggleDayCollapse(day.id)}
                // Dropping an item from another day onto this header appends it
                // to this day (works even while the day is collapsed).
                onDragOver={e => {
                  if (!dragCtx || dragCtx.dayId === day.id) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverIdx(cur => (cur?.dayId === day.id && cur.index === -1) ? cur : { dayId: day.id, index: -1 });
                }}
                onDrop={e => { e.preventDefault(); handleItemDrop(day.id, day.agenda_items.length); }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Image src="/infinity-mark-light.png" alt="" width={0} height={0} sizes="60px" style={{ height: 36, width: "auto" }} />
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.2)" }} />
                  <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", color: "#fff", fontWeight: 400, fontSize: 15 }}>Day {idx + 1}</span>
                  {editingDayId === day.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }} onClick={e => e.stopPropagation()}>
                      <input
                        type="date"
                        value={editingDayDateVal}
                        onChange={e => setEditingDayDateVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") updateDayDate(day.id, editingDayDateVal);
                          if (e.key === "Escape") setEditingDayId(null);
                        }}
                        autoFocus
                        style={{ fontSize: 12, padding: "2px 6px", borderRadius: 5, border: "1.5px solid rgba(255,255,255,.4)", background: "rgba(255,255,255,.15)", color: "#fff", fontFamily: "inherit", outline: "none", colorScheme: "dark" }}
                      />
                      <button
                        onClick={() => updateDayDate(day.id, editingDayDateVal)}
                        style={{ background: BRAND.blue, border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
                      >✓</button>
                      <button
                        onClick={() => setEditingDayId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.5)", padding: 2, display: "flex", alignItems: "center" }}
                      >
                        <I n="x" s={12} c="rgba(255,255,255,.5)" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ color: "#D1E8FF", fontSize: 13 }}>{agendaDayDateLabel(day.date)}</span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const parsed = parseAgendaDate(day.date);
                          setEditingDayDateVal(parsed ? toDateInput(parsed) : "");
                          setEditingDayId(day.id);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", padding: "0 2px", display: "flex", alignItems: "center" }}
                        title="Edit date"
                      >
                        <I n="pencil" s={12} c="rgba(255,255,255,.35)" />
                      </button>
                    </>
                  )}
                  {past && <span style={{ background: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.6)", fontSize: 10, fontWeight: 700, letterSpacing: .5, padding: "1px 7px", borderRadius: 4 }}>PAST</span>}
                  <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{day.agenda_items.length} item{day.agenda_items.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginRight: 2 }}>
                    <button onClick={e => { e.stopPropagation(); moveDay(idx, -1); }}
                      disabled={idx === 0}
                      title="Move day up"
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: "rgba(255,255,255,.45)", padding: 0, display: "flex", lineHeight: 0, visibility: idx === 0 ? "hidden" : "visible" }}>
                      <I n="chevronUp" s={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveDay(idx, 1); }}
                      disabled={idx === days.length - 1}
                      title="Move day down"
                      style={{ background: "none", border: "none", cursor: idx === days.length - 1 ? "default" : "pointer", color: "rgba(255,255,255,.45)", padding: 0, display: "flex", lineHeight: 0, visibility: idx === days.length - 1 ? "hidden" : "visible" }}>
                      <I n="chevron" s={14} />
                    </button>
                  </div>
                  <DayVisibilityButton
                    dayId={day.id}
                    activePersonas={activePersonaKeys(tour.active_personas)}
                    personaLabels={tour.persona_labels || {}}
                    onApply={applyBulkVisibility}
                  />
                  <button onClick={e => { e.stopPropagation(); setAddingItem(day.id); setAddingItemId(crypto.randomUUID()); setItemForm(BLANK); }}
                    style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
                    + Add
                  </button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteDayId(day.id); }}
                    title="Delete day"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.35)", padding: 3 }}>
                    <I n="trash" s={13} />
                  </button>
                  <div style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .2s", display: "flex" }}>
                    <I n="chevron" s={14} c="rgba(255,255,255,.5)" />
                  </div>
                </div>
              </div>

              {!collapsed && (
                <div>
                  {day.agenda_items.length === 0 && addingItem !== day.id && (
                    <div style={{ color: "var(--muted-3)", fontSize: 12, padding: "14px 16px", textAlign: "center" }}>No items yet</div>
                  )}
                  {orderAgendaItems(day.agenda_items).filter(item => itemMatchesGroup(item, groupFilter)).map(item => {
                    // Drop positions index the FULL day order, not the filtered list.
                    const itemIdx = orderAgendaItems(day.agenda_items).findIndex(i => i.id === item.id);
                    return (
                    <ItemRow
                      key={item.id}
                      item={item}
                      groups={tourGroups}
                      onEdit={() => { setEditCtx({ dayId: day.id, itemId: item.id }); setEditForm(itemToForm(item)); setMoveTargetDayId(day.id); }}
                      onRemove={() => setConfirmDeleteItem({ dayId: day.id, itemId: item.id })}
                      onDuplicate={() => duplicateItem(day.id, item)}
                      onCopyToDays={() => { setCopyCtx({ dayId: day.id, item }); setCopyTargets({}); }}
                      onToggleCostPaid={() => toggleCostPaid(day.id, item)}
                      onRemoveImage={url => removeItemImage(day.id, item, url)}
                      onSaveField={(field, v) => saveItemField(day.id, item.id, field, v)}
                      onSaveIconColor={hex => saveIconColor(day.id, item.id, hex)}
                      isDragOver={dragOverIdx?.dayId === day.id && dragOverIdx.index === itemIdx}
                      dragProps={{
                        onDragStart: e => {
                          e.dataTransfer.effectAllowed = "move";
                          try { e.dataTransfer.setData("text/plain", item.id); } catch {}
                          setDragCtx({ dayId: day.id, itemId: item.id });
                        },
                        onDragEnd: () => { setDragCtx(null); setDragOverIdx(null); },
                        onDragOver: e => {
                          // Same day = reorder; another day = move here.
                          if (!dragCtx) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverIdx(cur => (cur?.dayId === day.id && cur.index === itemIdx) ? cur : { dayId: day.id, index: itemIdx });
                        },
                        onDrop: e => { e.preventDefault(); handleItemDrop(day.id, itemIdx); },
                      }}
                    />
                    );
                  })}
                  {/* Drop zone below the last item — lets a drag land at the end
                      (of this day, or of another day when moving). */}
                  {dragCtx && (
                    <div
                      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(cur => (cur?.dayId === day.id && cur.index === day.agenda_items.length) ? cur : { dayId: day.id, index: day.agenda_items.length }); }}
                      onDrop={e => { e.preventDefault(); handleItemDrop(day.id, day.agenda_items.length); }}
                      style={{ height: 26, borderTop: dragOverIdx?.dayId === day.id && dragOverIdx.index === day.agenda_items.length ? `2px solid ${BRAND.blue}` : "2px solid transparent" }}
                    />
                  )}
                  {addingItem === day.id && (
                    <ItemForm
                      form={itemForm} setForm={setItemForm}
                      onSave={() => saveItem(day.id)}
                      onCancel={() => { setAddingItem(null); setAddingItemId(""); }}
                      saving={saving}
                      tourId={tour.id} itemId={addingItemId}
                      activePersonas={activePersonaKeys(tour.active_personas)}
                      personaLabels={tour.persona_labels || {}}
                      destination={tour.destination}
                      groups={tourGroups}
                      isImageShared={url => isImageShared(url, addingItemId)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddDay && (
        <Modal title="Add Itinerary Day(s)" onClose={() => setShowAddDay(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Start Date">
              <Inp value={newDayDate} onChange={e => setNewDayDate(e.target.value)} placeholder="Apr 14" autoFocus />
              {suggestedDateStr && newDayDate !== suggestedDateStr && (
                <button onClick={() => setNewDayDate(suggestedDateStr)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: BRAND.blue, textAlign: "left", marginTop: 3 }}>
                  Suggested: {suggestedDateStr} - tap to use
                </button>
              )}
              {suggestedDateStr && newDayDate === suggestedDateStr && (
                <div style={{ fontSize: 11, color: BRAND.blue, marginTop: 3 }}>Suggested based on existing days</div>
              )}
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 9, border: "1.5px solid var(--border)" }}>
              <input type="checkbox" id="multiday" checked={addMultiple} onChange={e => setAddMultiple(e.target.checked)} style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
              <label htmlFor="multiday" style={{ fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Add multiple consecutive days</label>
            </div>
            {addMultiple && (
              <Field label="How many days?">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setMultiCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "inherit" }}>-</button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", minWidth: 32, textAlign: "center" }}>{multiCount}</span>
                  <button onClick={() => setMultiCount(c => c + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 16, fontWeight: 700, color: "var(--ink)", fontFamily: "inherit" }}>+</button>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {multiCount > 1 && newDayDate && parseAgendaDate(newDayDate) ? (() => {
                      const end = new Date(parseAgendaDate(newDayDate)!);
                      end.setDate(end.getDate() + multiCount - 1);
                      return `${newDayDate} through ${formatAgendaDate(end)}`;
                    })() : ""}
                  </span>
                </div>
              </Field>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => setShowAddDay(false)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={addDay} style={{ flex: 1 }}>Add {addMultiple && multiCount > 1 ? `${multiCount} Days` : "Day"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {editCtx && (() => {
        const editItem = days.find(d => d.id === editCtx.dayId)?.agenda_items.find(i => i.id === editCtx.itemId);
        return (
          <Modal title="Edit Itinerary Item" onClose={() => setEditCtx(null)} wide>
            <ItemForm
              form={editForm} setForm={setEditForm}
              onSave={updateItem}
              onCancel={() => setEditCtx(null)}
              isEdit saving={saving}
              tourId={tour.id} itemId={editCtx.itemId}
              activePersonas={activePersonaKeys(tour.active_personas)}
              personaLabels={tour.persona_labels || {}}
              destination={tour.destination}
              groups={tourGroups}
              isImageShared={url => isImageShared(url, editCtx.itemId)}
              moveDayOptions={days.map((d, i) => ({ value: d.id, label: d.date ? `Day ${i + 1}, ${d.date}` : `Day ${i + 1}` }))}
              moveTargetDayId={moveTargetDayId}
              onMoveTargetChange={setMoveTargetDayId}
              confirmationControl={editItem && (
                <ItemConfirmationControl
                  tourId={tour.id}
                  itemId={editCtx.itemId}
                  urls={editItem.confirmation_urls ?? []}
                  notRequired={!!editItem.confirmation_not_required}
                  onPatch={patch => patchConfirmation(editCtx.dayId, editCtx.itemId, patch)}
                />
              )}
            />
          </Modal>
        );
      })()}

      {confirmDeleteDayId && (() => {
        const dayToDelete = days.find(d => d.id === confirmDeleteDayId);
        const itemCount = dayToDelete?.agenda_items.length ?? 0;
        return (
          <Modal title="Delete Day?" onClose={() => setConfirmDeleteDayId(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text)" }}>
                {dayToDelete
                  ? <>You&rsquo;re about to delete <strong style={{ color: "var(--ink)" }}>{dayToDelete.date}</strong>{itemCount > 0 ? <> and its {itemCount} itinerary item{itemCount !== 1 ? "s" : ""}</> : null}.</>
                  : <>You&rsquo;re about to delete this day.</>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setConfirmDeleteDayId(null)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
                <button
                  onClick={() => {
                    const id = confirmDeleteDayId;
                    setConfirmDeleteDayId(null);
                    if (id) requestDeleteDay(id);
                  }}
                  style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                >
                  Delete Day
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {confirmDeleteItem && (() => {
        const target = days.find(d => d.id === confirmDeleteItem.dayId)?.agenda_items.find(i => i.id === confirmDeleteItem.itemId);
        return (
          <Modal title="Delete Item?" onClose={() => setConfirmDeleteItem(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text)" }}>
                You&rsquo;re about to delete <strong style={{ color: "var(--ink)" }}>{target?.title || "this item"}</strong>{target?.time ? <> ({target.time})</> : null} and everything entered on it.
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>You&rsquo;ll have a few seconds to undo after deleting.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setConfirmDeleteItem(null)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
                <button
                  onClick={() => {
                    const ctx = confirmDeleteItem;
                    setConfirmDeleteItem(null);
                    if (ctx) requestDeleteItem(ctx.dayId, ctx.itemId);
                  }}
                  style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
                >
                  Delete Item
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {copyCtx && (() => {
        const others = days.filter(d => d.id !== copyCtx.dayId);
        const chosen = others.filter(d => copyTargets[d.id]).map(d => d.id);
        const allChosen = others.length > 0 && chosen.length === others.length;
        return (
          <Modal title="Copy Item to Other Days" onClose={() => setCopyCtx(null)}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                Copy <strong style={{ color: "var(--ink)" }}>{copyCtx.item.title}</strong>{copyCtx.item.time ? ` (${copyCtx.item.time})` : ""} into the days you pick. Each copy can be edited on its own afterward.
              </div>
              {others.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--muted-2)" }}>There are no other days yet. Add a day first.</div>
              ) : (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 10px", background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 9 }}>
                    <input type="checkbox" checked={allChosen}
                      onChange={() => setCopyTargets(allChosen ? {} : Object.fromEntries(others.map(d => [d.id, true])))}
                      style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
                    All other days
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                    {days.map((d, i) => {
                      const isSource = d.id === copyCtx.dayId;
                      return (
                        <label key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 10px", borderRadius: 8, cursor: isSource ? "default" : "pointer", color: isSource ? "var(--muted-2)" : "var(--text)" }}>
                          <input type="checkbox" disabled={isSource} checked={isSource ? false : !!copyTargets[d.id]}
                            onChange={() => setCopyTargets(t => ({ ...t, [d.id]: !t[d.id] }))}
                            style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
                          Day {i + 1}{d.date ? `, ${d.date}` : ""}{isSource ? " (this item's day)" : ""}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => setCopyCtx(null)} variant="muted" style={{ flex: 1 }}>Cancel</Btn>
                <Btn onClick={() => copyItemToDays(copyCtx.item, chosen)} disabled={copying || chosen.length === 0} style={{ flex: 1 }}>
                  {copying ? "Copying..." : `Copy to ${chosen.length} day${chosen.length !== 1 ? "s" : ""}`}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {undoItem && !undoDay && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", padding: "0 16px", zIndex: 1100, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", background: BRAND.navy, color: "#fff", borderRadius: 12, minWidth: 280, maxWidth: 440, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.3)", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px" }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Item deleted<span style={{ color: "rgba(255,255,255,.55)" }}> · {undoItem.item.title}</span>
              </span>
              <button
                onClick={undoDeleteItem}
                style={{ background: "none", border: "none", color: BRAND.blue, fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 13, fontWeight: 400, cursor: "pointer", padding: "2px 4px" }}
              >
                Undo
              </button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,.12)" }}>
              <div key={undoItem.item.id} style={{ height: "100%", background: BRAND.blue, transformOrigin: "left", animation: `it-undo-bar ${UNDO_WINDOW_MS}ms linear forwards` }} />
            </div>
          </div>
        </div>
      )}

      {undoDay && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", padding: "0 16px", zIndex: 1100, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", background: BRAND.navy, color: "#fff", borderRadius: 12, minWidth: 280, maxWidth: 440, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.3)", fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px" }}>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>
                Day deleted<span style={{ color: "rgba(255,255,255,.55)" }}> · {undoDay.day.date}</span>
              </span>
              <button
                onClick={undoDeleteDay}
                style={{ background: "none", border: "none", color: BRAND.blue, fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 13, fontWeight: 400, cursor: "pointer", padding: "2px 4px" }}
              >
                Undo
              </button>
            </div>
            <div style={{ height: 3, background: "rgba(255,255,255,.12)" }}>
              <div key={undoDay.day.id} style={{ height: "100%", background: BRAND.blue, transformOrigin: "left", animation: `it-undo-bar ${UNDO_WINDOW_MS}ms linear forwards` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
