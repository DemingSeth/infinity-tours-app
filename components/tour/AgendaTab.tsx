"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import TypeDot from "@/components/shared/TypeDot";
import {
  BRAND, ROLES, AGENDA_TYPES, TRAVEL_SUBTYPES, SUBTYPES_BY_TYPE,
  isDayInPast, parseAgendaDate, formatAgendaDate, suggestNextDate,
  toDateInput, fmt$, buildTripInfo, sortAgendaItemsByTime,
  activePersonaKeys, personaLabel, personaColors, getPersona, PERSONAS, defaultPersonaVisibility, isActivityType, generateAccessCode,
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
import { MapPin, Phone, Bus, Lock, Clock, ImagePlus, Printer, Check } from "lucide-react";
import type {
  TourRow, AgendaDayWithItems, AgendaItemWithFeedback,
  AgendaItemType, TravelMethod, MealMoneyType, Role,
} from "@/lib/types";

// ── Icons ──────────────────────────────────────────────────────────────────────
const ICONS: Record<string, string> = {
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:     "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  pencil:   "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  chevron:  "M19 9l-7 7-7-7",
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
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c || "currentColor"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={ICONS[n] ?? ""} />
    </svg>
  );
}

// ── Form primitives ────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 11px",
  fontSize: 13, fontFamily: "inherit", color: "#1e293b", background: "#fff",
  outline: "none", width: "100%", boxSizing: "border-box",
};

function Field({ label, children, half, third }: { label: string; children: React.ReactNode; half?: boolean; third?: boolean }) {
  const w = third ? "calc(33.33% - 7px)" : half ? "calc(50% - 5px)" : "100%";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: w, minWidth: 0, flexShrink: 0 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>{label}</label>
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

function Btn({ children, onClick, variant, small, style }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "muted" | "ghost"; small?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
    fontFamily: "inherit", fontWeight: 600, border: "none", borderRadius: 8,
    padding: small ? "5px 11px" : "8px 16px", fontSize: small ? 11 : 12,
    background: variant === "muted" ? "#f1f5f9" : variant === "ghost" ? "transparent" : BRAND.navy,
    color: variant === "muted" ? "#64748b" : variant === "ghost" ? "#64748b" : "#fff",
  };
  return <button onClick={onClick} style={{ ...base, ...style }}>{children}</button>;
}

// ── TimePicker ─────────────────────────────────────────────────────────────────
function TimePicker({ value, onChange, placeholder = "Pick a time" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minRef = useRef<HTMLDivElement>(null);

  const parseT = (v: string) => {
    if (!v) return { h: 9, m: 0, ap: "AM" };
    const match = v.match(/^(\d+):(\d{2})\s*(AM|PM)$/i);
    return match ? { h: parseInt(match[1]), m: parseInt(match[2]), ap: match[3].toUpperCase() } : { h: 9, m: 0, ap: "AM" };
  };
  const { h, m, ap } = parseT(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      (hourRef.current?.children[h - 1] as HTMLElement)?.scrollIntoView({ block: "center" });
      (minRef.current?.children[Math.floor(m / 5)] as HTMLElement)?.scrollIntoView({ block: "center" });
    }, 60);
  }, [open]);

  const emit = (nh: number, nm: number, na: string) => onChange(`${nh}:${String(nm).padStart(2, "0")} ${na}`);
  const hours = [1,2,3,4,5,6,7,8,9,10,11,12];
  const mins  = [0,5,10,15,20,25,30,35,40,45,50,55];
  const col: React.CSSProperties = { height: 156, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1, padding: "4px 0", scrollbarWidth: "thin" };
  const btn = (active: boolean): React.CSSProperties => ({
    padding: "5px 0", borderRadius: 6, fontSize: 13, fontWeight: active ? 700 : 400,
    cursor: "pointer", background: active ? BRAND.navy : "transparent",
    color: active ? "#fff" : "#1e293b", border: "none", fontFamily: "inherit", width: "100%", textAlign: "center",
  });

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ ...INP, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
        <span style={{ color: value ? "#1e293b" : "#94a3b8" }}>{value || placeholder}</span>
        <Clock size={14} color="#94a3b8" />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 500, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,.18)", border: "1.5px solid #e2e8f0", padding: 12, width: 210 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, textAlign: "center" }}>Select Time</div>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginBottom: 3 }}>Hour</div>
              <div ref={hourRef} style={col}>{hours.map(hr => <button key={hr} style={btn(hr === h)} onClick={() => emit(hr, m, ap)}>{hr}</button>)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginBottom: 3 }}>Min</div>
              <div ref={minRef} style={col}>{mins.map(mn => <button key={mn} style={btn(mn === m)} onClick={() => emit(h, mn, ap)}>{String(mn).padStart(2, "0")}</button>)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginBottom: 3 }}>AM/PM</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
                {["AM", "PM"].map(a => <button key={a} style={{ ...btn(a === ap), padding: "8px 0" }} onClick={() => emit(h, m, a)}>{a}</button>)}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, paddingTop: 7, textAlign: "center" }}>
            <button onClick={() => setOpen(false)} style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 7, padding: "5px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
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
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: wide ? 680 : 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 16, fontWeight: 700, color: BRAND.navy }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}><I n="x" s={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── AccessLinkManager ──────────────────────────────────────────────────────────
const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

function AccessLinkManager({ tour, onTourChange, open, setOpen }: {
  tour: TourRow; onTourChange: (patch: Record<string, any>) => void;
  open: boolean; setOpen: (v: boolean) => void;
}) {
  const codes = (tour.access_codes as unknown as Record<string, string>) || {};
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Outward-facing links cover participant personas only — never the tour host /
  // coordinator. No distributable coordinator link is generated anywhere; the
  // coordinator view stays reachable only by someone who knows its code (via the
  // bare /view self-select fallback).
  const personaKeys = activePersonaKeys(tour.active_personas).filter(k => k !== "tour_host");

  // Auto-generate-and-persist a code for any participant persona missing one, so
  // every persona always has a working link. The write fires ONLY when a code is
  // actually absent: missing codes are batched into a single onTourChange (the
  // normal save path — never a direct DB write), and once persisted the effect
  // re-runs, finds nothing missing, and writes nothing. No per-render write loop.
  useEffect(() => {
    const additions: Record<string, string> = {};
    for (const key of personaKeys) {
      const codeKey = getPersona(key)!.codeKey;
      if (!(codes[codeKey] || "").trim()) additions[codeKey] = generateAccessCode();
    }
    if (Object.keys(additions).length > 0) {
      onTourChange({ access_codes: { ...codes, ...additions } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id, tour.active_personas, tour.access_codes]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (codeKey: string) => `${origin}/tour/${tour.id}/view?c=${encodeURIComponent(codes[codeKey] || "")}`;

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

  // Subdued, collapsed-by-default secondary card (the preview buttons above are
  // the primary action). Expands to one shareable link per participant persona.
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
        <I n={open ? "chevron" : "chevronRight"} s={13} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Access Links</span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          {readyCount} link{readyCount !== 1 ? "s" : ""} · send each to the right group
        </span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {rows.map(r => {
            const copied = copiedKey === r.codeKey;
            return (
              <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #eef2f7", borderRadius: 9, padding: "8px 10px" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: .7, flex: "0 0 96px" }}>{r.label}</span>
                <input readOnly value={linkFor(r.codeKey)}
                  onFocus={e => e.currentTarget.select()}
                  style={{ flex: 1, minWidth: 0, border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontFamily: "inherit", color: "#64748b", background: "#f8fafc", outline: "none" }} />
                <button onClick={() => regenerate(r.codeKey)} title="Generate a new link (the old one stops working)"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex", flexShrink: 0 }}>
                  <I n="refresh" s={13} />
                </button>
                <button onClick={() => copy(r.codeKey)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", flexShrink: 0, background: copied ? "#dcfce7" : r.color, color: copied ? "#15803d" : "#fff" }}>
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
  time: string; type: AgendaItemType; activity_subtypes: string[]; title: string; detail: string;
  public_note: string; address: string; map_link: string; website: string;
  travel_methods: string[]; contact_name: string; contact_phone: string;
  contact_email: string; cost: string; cost_paid: boolean;
  confirmation_not_required: boolean;
  driver_note: string; internal_note: string;
  meal_money: MealMoneyForm[];
  persona_visibility: Record<string, boolean>;
  feedback_enabled: boolean;
  image_urls: string[];
};

const BLANK: ItemFormState = {
  time: "", type: "activity", activity_subtypes: [], title: "", detail: "", public_note: "",
  address: "", map_link: "", website: "", travel_methods: [],
  contact_name: "", contact_phone: "", contact_email: "",
  cost: "", cost_paid: false, confirmation_not_required: false, driver_note: "", internal_note: "",
  meal_money: [], persona_visibility: defaultPersonaVisibility("activity", []),
  feedback_enabled: isActivityType("activity", []), image_urls: [],
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

const STORAGE_BUCKET = "agenda-images";
const STORAGE_MARKER = `/${STORAGE_BUCKET}/`;

// Derive the storage object path from a public URL so we can delete it.
function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + STORAGE_MARKER.length)) : null;
}

// ── ImageUploader ────────────────────────────────────────────────────────────
function ImageUploader({ tourId, itemId, urls, onChange }: {
  tourId: string; itemId: string; urls: string[]; onChange: (urls: string[]) => void;
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
      const path = `${tourId}/${itemId}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { console.error("Image upload failed", error.message); continue; }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) added.push(data.publicUrl);
    }
    if (added.length) onChange([...urls, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeImage(url: string) {
    onChange(urls.filter(u => u !== url));
    const path = storagePathFromUrl(url);
    if (path) { try { await createClient().storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
  }

  return (
    <div>
      <AgendaImages urls={urls} size={72} onRemove={removeImage} />
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        style={{ marginTop: urls.length ? 10 : 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#fff", cursor: uploading ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
        <ImagePlus size={14} />{uploading ? "Uploading..." : "Upload Image"}
      </button>
    </div>
  );
}

function ItemForm({ form, setForm, onSave, onCancel, isEdit, saving, tourId, itemId, activePersonas, personaLabels, confirmationControl }: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  onSave: () => void; onCancel: () => void; isEdit?: boolean; saving?: boolean;
  tourId: string; itemId: string;
  activePersonas: string[];
  personaLabels: Record<string, string>;
  // When provided (edit modal), confirmation upload/status is managed by this
  // control — which writes the same agenda_items record as the Confirmations
  // page — and the inline "No confirmation required" checkbox is hidden.
  confirmationControl?: React.ReactNode;
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
    <div style={{ padding: 16, background: "#f8fafc", borderTop: "1.5px solid #e2e8f0" }} onClick={e => e.stopPropagation()}>
      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 13, fontWeight: 700, color: BRAND.navy, marginBottom: 12 }}>
        {isEdit ? "Edit Item" : "New Itinerary Item"}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Type</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {AGENDA_TYPES.map(t => {
            const bg = TYPE_COLORS[t.value] || "#6b7280";
            const active = form.type === t.value;
            const TypeIcon = getAgendaTypeIcon(t.value);
            return (
              <button key={t.value} type="button" onClick={() => fT({ type: t.value as AgendaItemType })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "#e2e8f0"}`, background: active ? bg + "18" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "#64748b", fontFamily: "inherit" }}>
                <TypeIcon size={15} strokeWidth={2} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity / instructions / general sub-types — multi-select (toggle on/off,
          down to zero). Shown when the top-level type carries sub-types. */}
      {SUBTYPES_BY_TYPE[form.type] && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
            {form.type === "activity" ? "Activity Types" : "Sub-type"}
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SUBTYPES_BY_TYPE[form.type].map(st => {
              const bg = TYPE_COLORS[form.type] || "#6b7280";
              const active = form.activity_subtypes.includes(st.value);
              const SubIcon = getSubtypeIcon(form.type, st.value);
              return (
                <button key={st.value} type="button"
                  onClick={() => f({ activity_subtypes: toggleInArray(form.activity_subtypes, st.value) })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "#e2e8f0"}`, background: active ? bg + "18" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "#64748b", fontFamily: "inherit" }}>
                  {SubIcon && <SubIcon size={15} strokeWidth={2} />}{st.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Travel methods — multi-select (toggle on/off, down to zero). Always
          available on every item type, so a method can be added to any item and
          any applied method can always be cleared (no more stuck tags). */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Travel Methods</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TRAVEL_SUBTYPES.map(st => {
            const bg = TYPE_COLORS.travel || "#3b82f6";
            const active = form.travel_methods.includes(st.value);
            const SubIcon = getSubtypeIcon("travel", st.value);
            return (
              <button key={st.value} type="button"
                onClick={() => fT({ travel_methods: toggleInArray(form.travel_methods, st.value) })}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "#e2e8f0"}`, background: active ? bg + "18" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "#64748b", fontFamily: "inherit" }}>
                {SubIcon && <SubIcon size={15} strokeWidth={2} />}{st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-persona visibility for this item */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Visible To</label>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", padding: "10px 12px", background: "#fff", border: "1px solid #eef2f7", borderRadius: 9 }}>
          {activePersonas.map(key => {
            const locked = key === "tour_host";
            const checked = locked || form.persona_visibility?.[key] === true;
            return (
              <label key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: checked ? "#1e293b" : "#94a3b8", cursor: locked ? "default" : "pointer" }}>
                <input type="checkbox" checked={checked} disabled={locked}
                  onChange={() => f({ persona_visibility: { ...form.persona_visibility, [key]: !checked } })}
                  style={{ accentColor: BRAND.navy, width: 15, height: 15, cursor: locked ? "default" : "pointer" }} />
                {personaLabel(key, personaLabels)}{locked && " 🔒"}
              </label>
            );
          })}
        </div>
      </div>

      {/* Per-item student feedback toggle. Defaults on for Activities (set when
          the type changes), but the host can override it for any item type. */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: form.feedback_enabled ? "#1e293b" : "#64748b", cursor: "pointer" }}>
          <input type="checkbox" checked={form.feedback_enabled}
            onChange={() => f({ feedback_enabled: !form.feedback_enabled })}
            style={{ accentColor: BRAND.navy, width: 15, height: 15, cursor: "pointer" }} />
          Collect student feedback for this item
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <Field label="Time" third>
          <TimePicker value={form.time} onChange={v => f({ time: v })} />
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
          <Inp value={form.internal_note} onChange={e => f({ internal_note: e.target.value })} placeholder="Booking refs, reminders..." />
        </Field>
        <Field label="Images (visible to all roles)">
          <ImageUploader tourId={tourId} itemId={itemId} urls={form.image_urls} onChange={urls => f({ image_urls: urls })} />
        </Field>

        {form.type === "food" && (
          <div style={{ width: "100%", background: "#fff8f0", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: .7 }}>Meal Money</div>
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
                      style={{ flex: "1 1 110px", padding: "6px 8px", borderRadius: 8, border: `2px solid ${active ? "#92400e" : "#e2e8f0"}`, background: active ? "#fef3c7" : "#fff", cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400, color: active ? "#92400e" : "#64748b", fontFamily: "inherit", textAlign: "center", lineHeight: 1.3 }}>
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
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Only visible to bus drivers and tour hosts.</div>
          {form.driver_note.trim() && form.persona_visibility?.bus_driver !== true && (
            <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "flex-start", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "7px 10px", fontSize: 11.5, color: "#92400e" }}>
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
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, width: 230, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,.18)", padding: 12, cursor: "default", color: "#1e293b" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.navy, marginBottom: 8 }}>Set visibility for items in this day:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {personas.map(k => (
              <label key={k} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!sel[k]} onChange={() => setSel(s => ({ ...s, [k]: !s[k] }))} style={{ accentColor: BRAND.navy, width: 14, height: 14 }} />
                {personaLabel(k, personaLabels)}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 10 }}>Tour Host always stays visible.</div>
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
  const color = active ? "#0369a1" : danger && hover ? "#dc2626" : BRAND.navy;
  return (
    <button
      type="button" onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? "#e0f2fe" : hover ? "#e2e8f0" : "transparent",
        border: "none", cursor: "pointer", padding: 5, borderRadius: 6,
        color, opacity: active || hover ? 1 : 0.8,
        transition: "background .12s, opacity .12s, color .12s",
      }}
    >
      {children}
    </button>
  );
}

function ItemRow({ item, onEdit, onRemove, onToggleCostPaid, onRemoveImage }: {
  item: AgendaItemWithFeedback;
  onEdit: () => void; onRemove: () => void; onToggleCostPaid: () => void;
  onRemoveImage: (url: string) => void;
}) {
  // Authoritative multi-select arrays drive the leading icon (the legacy
  // singular columns are dormant rollback insurance and not read here).
  const travelMethods = item.travel_methods ?? [];
  const activitySubtypes = item.activity_subtypes ?? [];

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid #f8fafc", background: "#fff" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 56, fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0, paddingTop: 6, textAlign: "right" }}>
          {item.time || "-"}
        </div>
        <TypeDot type={item.type} travelMethod={travelMethods[0] ?? null} subtype={activitySubtypes[0] ?? null} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
            {/* The leading TypeDot icon conveys the item type; no redundant
                type/sub-type text tags here. */}
            {/* Attached confirmations show only as compact links here; all
                uploading / status lives in the edit modal and Confirmations page. */}
            <ConfirmationFileChips urls={item.confirmation_urls ?? []} />
          </div>
          {item.address && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} style={{ flexShrink: 0 }} />{item.address}</div>}
          {item.detail && <div style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>{item.detail}</div>}
          {item.public_note && (
            <div style={{ fontSize: 12, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 7, padding: "5px 10px", marginBottom: 5, color: "#0c4a6e", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {item.public_note}
            </div>
          )}
          {item.map_link?.trim() && (
            <div style={{ marginBottom: 4 }}>
              <GoogleMapsLink address={item.address} mapLink={item.map_link} color="#0369a1" fontSize={11} />
            </div>
          )}
          {item.type === "food" && (item.meal_money?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {item.meal_money.map((mm, i) => {
                const amt = typeof mm.amount === "number" ? mm.amount : null;
                const style = mm.type === "stipend"
                  ? { background: "#fef3c7", color: "#92400e" }
                  : mm.type === "disney_dining"
                  ? { background: "#eef2ff", color: "#4338ca" }
                  : mm.type === "cash"
                  ? { background: "#dcfce7", color: "#15803d" }
                  : mm.type === "hotel_breakfast"
                  ? { background: "#e0f2fe", color: "#0369a1" }
                  : { background: "#f0fdf4", color: "#166534" };
                const label = mm.type === "stipend"
                  ? `Meal Stipend${amt != null ? ` - $${amt} on Till Card` : ""}`
                  : mm.type === "disney_dining"
                  ? `Disney Dining Dollars${amt != null ? ` - $${amt}` : ""}`
                  : mm.type === "cash"
                  ? `Cash${amt != null ? ` - $${amt}` : ""}`
                  : mm.type === "hotel_breakfast"
                  ? "Hotel Breakfast"
                  : "Group Meal";
                return (
                  <span key={`${mm.type}-${i}`} style={{ fontSize: 11, borderRadius: 6, padding: "2px 9px", fontWeight: 700, ...style }}>{label}</span>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            {item.website && (
              <a href={item.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#5b21b6", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", fontWeight: 600 }}>
                <I n="eye" s={10} />Website
              </a>
            )}
            {item.contact_name && (
              <span style={{ fontSize: 11, color: "#475569", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Phone size={11} style={{ flexShrink: 0 }} />{item.contact_name}{item.contact_phone ? ` · ${item.contact_phone}` : ""}
              </span>
            )}
            {item.cost > 0 && (
              <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#92400e", fontWeight: 700 }}>{fmt$(item.cost)}</span>
                <button onClick={onToggleCostPaid}
                  style={{ background: item.cost_paid ? "#dcfce7" : "#fee2e2", color: item.cost_paid ? "#166534" : "#b91c1c", border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {item.cost_paid ? "Paid" : "Unpaid"}
                </button>
              </span>
            )}
            {item.driver_note && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", borderRadius: 5, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}><Bus size={11} style={{ flexShrink: 0 }} /><strong style={{ fontWeight: 700 }}>Bus Driver Note:</strong> {item.driver_note}</span>}
            {item.internal_note && <span style={{ fontSize: 10, background: "#f3e8ff", color: "#6b21a8", borderRadius: 5, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}><Lock size={11} style={{ flexShrink: 0 }} />{item.internal_note}</span>}
          </div>

          <AgendaImages urls={item.image_urls} fullWidth onRemove={onRemoveImage} />

          {item.agenda_feedback?.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 5 }}>
                FEEDBACK ({item.agenda_feedback.length}) - coordinator only
              </div>
              {item.agenda_feedback.map(fb => (
                <div key={fb.id} style={{ fontSize: 11, color: "#475569", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  {(() => { const { Icon, color } = getSentimentIcon(fb.sentiment); return <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />; })()}
                  <span>
                    <span style={{ background: ROLES_TYPED[fb.role]?.bg || "#f1f5f9", color: ROLES_TYPED[fb.role]?.color || "#475569", borderRadius: 4, padding: "0 5px", fontSize: 10, fontWeight: 600, marginRight: 5 }}>
                      {ROLES_TYPED[fb.role]?.label || fb.role}
                    </span>
                    {fb.text}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <ActionButton title="Edit item" onClick={onEdit}>
            <I n="edit" s={14} />
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

export default function AgendaTab({ tour, days, members, onDaysChange, onTourChange, onSaveHostPhone, recentlyAddedPersona, onDismissAddedPersona }: AgendaTabProps) {
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayDate, setNewDayDate] = useState("");
  const [addMultiple, setAddMultiple] = useState(false);
  const [multiCount, setMultiCount] = useState(1);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [addingItemId, setAddingItemId] = useState<string>("");
  const [itemForm, setItemForm] = useState<ItemFormState>(BLANK);
  const [editCtx, setEditCtx] = useState<{ dayId: string; itemId: string } | null>(null);
  const [editForm, setEditForm] = useState<ItemFormState>(BLANK);
  const [showPastDays, setShowPastDays] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewPersona, setPreviewPersona] = useState<string | null>(null);
  const [linksOpen, setLinksOpen] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayDateVal, setEditingDayDateVal] = useState("");

  // Open the print-optimized itinerary view in a new tab; it auto-triggers the
  // browser's print dialog (Save as PDF). Reliable, no server-side rendering.
  function openPrintView() {
    window.open(`/tour/${tour.id}/print`, "_blank", "noopener");
  }

  const pastDays = days.filter(d => isDayInPast(d.date));
  const visibleDays = showPastDays ? days : days.filter(d => !isDayInPast(d.date));

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
      time: f.time || null, type: f.type, title: f.title,
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
    };
  }

  function itemToForm(item: AgendaItemWithFeedback): ItemFormState {
    return {
      time: item.time || "", type: item.type, title: item.title,
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
    };
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

  async function removeDay(dayId: string) {
    const supabase = createClient();
    await supabase.from("agenda_days").delete().eq("id", dayId);
    onDaysChange(days.filter(d => d.id !== dayId));
  }

  async function toggleCollapsed(dayId: string) {
    const day = days.find(d => d.id === dayId);
    if (!day) return;
    const supabase = createClient();
    await supabase.from("agenda_days").update({ collapsed: !day.collapsed }).eq("id", dayId);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, collapsed: !d.collapsed } : d));
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
  async function saveItem(dayId: string) {
    if (!itemForm.title.trim()) return;
    setSaving(true);
    const day = days.find(d => d.id === dayId);
    const supabase = createClient();
    // Insert with the pre-generated id so uploaded images already live under
    // agenda-images/[tourId]/[itemId]/ match the saved row.
    // Inspect the response — never optimistically "succeed". A bad/unknown column
    // or an RLS denial returns an error (or no row) that must surface, otherwise
    // the form looks saved while nothing persists.
    const { data, error } = await supabase.from("agenda_items")
      .insert({ id: addingItemId, ...formToInsert(itemForm, dayId, (day?.agenda_items.length ?? 0) + 1) })
      .select().single();
    setSaving(false);
    if (error || !data) {
      console.error("[agenda_items.insert] save failed", { dayId, itemId: addingItemId, error });
      if (typeof window !== "undefined") {
        window.alert(`Could not add item: ${error?.message ?? "no row inserted (permission?)"}`);
      }
      return; // keep the form open so the host can retry; nothing was persisted
    }
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: [...d.agenda_items, { ...data, agenda_feedback: [] }] } : d));
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
    const supabase = createClient();
    // Inspect the response — surface errors / zero-row updates instead of
    // applying the change to local state and looking saved while nothing persists.
    const { data, error } = await supabase.from("agenda_items").update(patch).eq("id", editCtx.itemId).select();
    setSaving(false);
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.update] save failed", { itemId: editCtx.itemId, error });
      if (typeof window !== "undefined") {
        window.alert(`Could not save changes: ${error?.message ?? "no row updated (permission?)"}`);
      }
      return; // keep the edit modal open; local state stays at the last-saved truth
    }
    onDaysChange(days.map(d => d.id === editCtx.dayId ? {
      ...d, agenda_items: d.agenda_items.map(i => i.id === editCtx.itemId ? { ...i, ...patch } : i),
    } : d));
    setEditCtx(null);
  }

  async function removeItem(dayId: string, itemId: string) {
    const supabase = createClient();
    await supabase.from("agenda_items").delete().eq("id", itemId);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.filter(i => i.id !== itemId) } : d));
  }

  async function removeItemImage(dayId: string, item: AgendaItemWithFeedback, url: string) {
    const next = (item.image_urls || []).filter(u => u !== url);
    const supabase = createClient();
    await supabase.from("agenda_items").update({ image_urls: next }).eq("id", item.id);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === item.id ? { ...i, image_urls: next } : i) } : d));
    const path = storagePathFromUrl(url);
    if (path) { try { await supabase.storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: "#92400e", flex: 1 }}>
            <strong>{personaLabel(recentlyAddedPersona, tour.persona_labels)}</strong> was added to this tour. Review item visibility to choose what they can see.
          </span>
          <button onClick={onDismissAddedPersona} title="Dismiss"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <I n="x" s={14} c="#92400e" />
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
        <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 2 }}>Preview the Itinerary</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>See exactly what each role sees on the shared view, then share the link.</div>
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
              style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.teal, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <I n="link" s={15} />Share Links
              </button>
            <button onClick={openPrintView}
              title="Open a print-ready view of the full itinerary to save as PDF"
              style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <Printer size={15} />Print / Save as PDF
              </button>
          </div>
        </div>
      )}

      {/* Access codes — secondary, subdued and collapsed below the preview */}
      <AccessLinkManager tour={tour} onTourChange={onTourChange} open={linksOpen} setOpen={setLinksOpen} />

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
        tourId={tour.id}
        onSaveTour={onTourChange}
        onSaveHostPhone={onSaveHostPhone}
        onEditFlight={flightLoc ? () => openEditItem(flightLoc.dayId, flightLoc.item) : null}
        onEditHotel={hotelLoc ? () => openEditItem(hotelLoc.dayId, hotelLoc.item) : null}
        onEditBus={busLoc ? () => openEditItem(busLoc.dayId, busLoc.item) : null}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif" }}>
            {days.length} day{days.length !== 1 ? "s" : ""} planned
          </span>
          {pastDays.length > 0 && (
            <button onClick={() => setShowPastDays(s => !s)}
              style={{ background: showPastDays ? "#e0f2fe" : "#f1f5f9", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: showPastDays ? "#0369a1" : "#64748b", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>
              {showPastDays ? "Hide" : "Show"} {pastDays.length} past day{pastDays.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Btn onClick={openAddDay} small><I n="plus" s={12} />Add Day</Btn>
        </div>
      </div>

      {days.length === 0 && (
        <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No itinerary days yet. Add your first day to get started.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleDays.map(day => {
          const past = isDayInPast(day.date);
          return (
            <div key={day.id} style={{ background: "#fff", border: `1.5px solid ${past ? "#e5e7eb" : "#e8eef4"}`, borderRadius: 12, overflow: "hidden", opacity: past ? .8 : 1, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <div
                style={{ background: past ? BRAND.navy + "cc" : BRAND.navy, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => toggleCollapsed(day.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Image src="/infinity-logo.png" alt="" width={0} height={0} sizes="60px" style={{ height: 36, width: "auto" }} />
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.2)" }} />
                  <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontWeight: 700, fontSize: 15 }}>Day {day.day_number}</span>
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
                        style={{ background: BRAND.teal, border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
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
                      <span style={{ color: "#7dd3d8", fontSize: 13 }}>{day.date}</span>
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
                  <button onClick={e => { e.stopPropagation(); removeDay(day.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.35)", padding: 3 }}>
                    <I n="trash" s={13} />
                  </button>
                  <div style={{ transform: day.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .2s", display: "flex" }}>
                    <I n="chevron" s={14} c="rgba(255,255,255,.5)" />
                  </div>
                </div>
              </div>

              {!day.collapsed && (
                <div>
                  {day.agenda_items.length === 0 && addingItem !== day.id && (
                    <div style={{ color: "#cbd5e1", fontSize: 12, padding: "14px 16px", textAlign: "center" }}>No items yet</div>
                  )}
                  {sortAgendaItemsByTime(day.agenda_items).map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditCtx({ dayId: day.id, itemId: item.id }); setEditForm(itemToForm(item)); }}
                      onRemove={() => removeItem(day.id, item.id)}
                      onToggleCostPaid={() => toggleCostPaid(day.id, item)}
                      onRemoveImage={url => removeItemImage(day.id, item, url)}
                    />
                  ))}
                  {addingItem === day.id && (
                    <ItemForm
                      form={itemForm} setForm={setItemForm}
                      onSave={() => saveItem(day.id)}
                      onCancel={() => { setAddingItem(null); setAddingItemId(""); }}
                      saving={saving}
                      tourId={tour.id} itemId={addingItemId}
                      activePersonas={activePersonaKeys(tour.active_personas)}
                      personaLabels={tour.persona_labels || {}}
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
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, color: BRAND.teal, textAlign: "left", marginTop: 3 }}>
                  Suggested: {suggestedDateStr} - tap to use
                </button>
              )}
              {suggestedDateStr && newDayDate === suggestedDateStr && (
                <div style={{ fontSize: 11, color: BRAND.teal, marginTop: 3 }}>Suggested based on existing days</div>
              )}
            </Field>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 9, border: "1.5px solid #e2e8f0" }}>
              <input type="checkbox" id="multiday" checked={addMultiple} onChange={e => setAddMultiple(e.target.checked)} style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
              <label htmlFor="multiday" style={{ fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Add multiple consecutive days</label>
            </div>
            {addMultiple && (
              <Field label="How many days?">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setMultiCount(c => Math.max(1, c - 1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "inherit" }}>-</button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, minWidth: 32, textAlign: "center" }}>{multiCount}</span>
                  <button onClick={() => setMultiCount(c => c + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, color: BRAND.navy, fontFamily: "inherit" }}>+</button>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
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
    </div>
  );
}
