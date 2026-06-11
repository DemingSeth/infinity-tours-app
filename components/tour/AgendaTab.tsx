"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import TypeDot from "@/components/shared/TypeDot";
import {
  BRAND, ROLES, AGENDA_TYPES, TRAVEL_METHODS, TRAVEL_SUBTYPES, ACTIVITY_SUBTYPES,
  isDayInPast, parseAgendaDate, formatAgendaDate, suggestNextDate,
  toDateInput, getMapUrl, fmt$, buildTripInfo, sanitizeFilename,
  activePersonaKeys, personaLabel, personaColors, getPersona, PERSONAS, defaultPersonaVisibility,
} from "@/lib/helpers";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import TripInformation from "@/components/tour/TripInformation";
import {
  AGENDA_TYPE_COLORS, getAgendaTypeIcon, getSentimentIcon,
  TRAVEL_SUBTYPE_ICONS, ACTIVITY_SUBTYPE_ICONS,
} from "@/components/shared/agendaIcons";
import AgendaImages from "@/components/shared/AgendaImages";
import { ConfirmationStatus, NoConfirmationToggle } from "@/components/tour/ConfirmationsTab";
import ItineraryHeaderTile from "@/components/tour/ItineraryHeaderTile";
import { MapPin, Phone, Bus, Lock, Clock, ImagePlus, Download } from "lucide-react";
import type {
  TourRow, AgendaDayWithItems, AgendaItemWithFeedback,
  AgendaItemType, TravelMethod, MealPayType, Role,
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

// ── AccessCodeManager ──────────────────────────────────────────────────────────
const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

function AccessCodeManager({ tour, onTourChange }: {
  tour: TourRow; onTourChange: (patch: Record<string, any>) => void;
}) {
  const codes = (tour.access_codes as unknown as Record<string, string>) || {};
  const set = (codeKey: string, val: string) => onTourChange({ access_codes: { ...codes, [codeKey]: val } });
  const gen = (codeKey: string) => set(codeKey, Math.random().toString(36).slice(2, 8).toUpperCase());
  const [open, setOpen] = useState(false);

  // One code row per active persona, labelled with the tour's custom labels.
  const rows = activePersonaKeys(tour.active_personas).map(key => {
    const p = getPersona(key)!;
    const meta = personaColors(key);
    return { key, codeKey: p.codeKey, label: personaLabel(key, tour.persona_labels), color: meta.color, bg: meta.bg };
  });
  const setCount = rows.filter(r => codes[r.codeKey]).length;

  // Subdued, collapsed-by-default secondary card (the preview buttons above are
  // the primary action). Expands to manage the per-persona codes.
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
        <I n={open ? "chevron" : "chevronRight"} s={13} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Access Codes</span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          {setCount} of {rows.length} set · share each with the right group
        </span>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
          {rows.map(r => (
            <div key={r.key} style={{ background: r.bg, border: `1.5px solid ${r.color}22`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: .7, marginBottom: 6 }}>{r.label}</div>
              <div style={{ display: "flex", gap: 5 }}>
                <input value={codes[r.codeKey] || ""} onChange={e => set(r.codeKey, e.target.value.toUpperCase())}
                  style={{ ...INP, fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: r.color, flex: 1, padding: "5px 8px" }}
                  placeholder="CODE" maxLength={12} />
                <button onClick={() => gen(r.codeKey)} style={{ background: r.color, color: "#fff", border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>Gen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Item form ──────────────────────────────────────────────────────────────────
type ItemFormState = {
  time: string; type: AgendaItemType; activity_subtype: string; title: string; detail: string;
  public_note: string; address: string; map_link: string; website: string;
  travel_method: TravelMethod; contact_name: string; contact_phone: string;
  contact_email: string; cost: string; cost_paid: boolean;
  confirmation_not_required: boolean;
  driver_note: string; internal_note: string;
  meal_pay_type: MealPayType; stipend_amount: string;
  persona_visibility: Record<string, boolean>;
  image_urls: string[];
};

const BLANK: ItemFormState = {
  time: "", type: "activity", activity_subtype: "", title: "", detail: "", public_note: "",
  address: "", map_link: "", website: "", travel_method: "",
  contact_name: "", contact_phone: "", contact_email: "",
  cost: "", cost_paid: false, confirmation_not_required: false, driver_note: "", internal_note: "",
  meal_pay_type: "", stipend_amount: "", persona_visibility: defaultPersonaVisibility("activity", ""), image_urls: [],
};

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

function ItemForm({ form, setForm, onSave, onCancel, isEdit, saving, tourId, itemId, activePersonas, personaLabels }: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  onSave: () => void; onCancel: () => void; isEdit?: boolean; saving?: boolean;
  tourId: string; itemId: string;
  activePersonas: string[];
  personaLabels: Record<string, string>;
}) {
  const f = (v: Partial<ItemFormState>) => setForm(p => ({ ...p, ...v }));
  // For NEW items, recompute the smart visibility default when type/travel changes.
  const fT = (v: Partial<ItemFormState>) => setForm(p => {
    const next = { ...p, ...v };
    if (!isEdit && ("type" in v || "travel_method" in v)) {
      next.persona_visibility = defaultPersonaVisibility(next.type, next.travel_method);
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

      {(form.type === "travel" || form.type === "activity") && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
            {form.type === "travel" ? "Travel Method" : "Activity Sub-type"}
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(form.type === "travel" ? TRAVEL_SUBTYPES : ACTIVITY_SUBTYPES).map(st => {
              const bg = TYPE_COLORS[form.type] || "#6b7280";
              const isTravel = form.type === "travel";
              const active = isTravel ? form.travel_method === st.value : form.activity_subtype === st.value;
              const SubIcon = (isTravel ? TRAVEL_SUBTYPE_ICONS : ACTIVITY_SUBTYPE_ICONS)[st.value];
              return (
                <button key={st.value} type="button"
                  onClick={() => isTravel ? fT({ travel_method: st.value as TravelMethod }) : f({ activity_subtype: st.value })}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20, border: `2px solid ${active ? bg : "#e2e8f0"}`, background: active ? bg + "18" : "#fff", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? bg : "#64748b", fontFamily: "inherit" }}>
                  {SubIcon && <SubIcon size={15} strokeWidth={2} />}{st.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <Field label="Time" third>
          <TimePicker value={form.time} onChange={v => f({ time: v })} />
        </Field>
        <Field label="Title">
          <Inp value={form.title} onChange={e => f({ title: e.target.value })} placeholder="Museum, flight, restaurant..." autoFocus={!isEdit} />
        </Field>
        <Field label="Details / Notes">
          <Inp value={form.detail} onChange={e => f({ detail: e.target.value })} placeholder="Instructions, confirmation numbers..." />
        </Field>
        <Field label="Internal Note (Tour Host Only)">
          <Inp value={form.internal_note} onChange={e => f({ internal_note: e.target.value })} placeholder="Booking refs, reminders..." />
        </Field>
        <Field label="Public Notes (Visible to All Roles)">
          <Tex value={form.public_note} onChange={e => f({ public_note: e.target.value })} placeholder="Directions, dress code, what to bring..." />
        </Field>
        <Field label="Images (visible to all roles)">
          <ImageUploader tourId={tourId} itemId={itemId} urls={form.image_urls} onChange={urls => f({ image_urls: urls })} />
        </Field>

        {form.type === "food" && (
          <div style={{ width: "100%", background: "#fff8f0", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ width: "100%", fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: .7 }}>Meal Payment</div>
            <Field label="How is this meal paid?" half>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ value: "stipend", label: "Meal Stipend (Till Card)" }, { value: "group", label: "Group Meal (Tour Host pays)" }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => f({ meal_pay_type: opt.value as MealPayType })}
                    style={{ flex: 1, padding: "6px 8px", borderRadius: 8, border: `2px solid ${form.meal_pay_type === opt.value ? "#92400e" : "#e2e8f0"}`, background: form.meal_pay_type === opt.value ? "#fef3c7" : "#fff", cursor: "pointer", fontSize: 11, fontWeight: form.meal_pay_type === opt.value ? 700 : 400, color: form.meal_pay_type === opt.value ? "#92400e" : "#64748b", fontFamily: "inherit", textAlign: "center", lineHeight: 1.3 }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            {form.meal_pay_type === "stipend" && (
              <Field label="Stipend Amount ($)" third>
                <Inp type="number" value={form.stipend_amount} onChange={e => f({ stipend_amount: e.target.value })} placeholder="25" />
              </Field>
            )}
          </div>
        )}

        <Field label="Address">
          <Inp value={form.address} onChange={e => f({ address: e.target.value })} placeholder="Full street address" />
        </Field>
        <Field label="Google Maps Link" half>
          <Inp value={form.map_link} onChange={e => f({ map_link: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
        </Field>
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
        <Field label="Driver Note" half>
          <Inp value={form.driver_note} onChange={e => f({ driver_note: e.target.value })} placeholder="Drop at main entrance..." />
        </Field>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="cpaid" checked={form.cost_paid} onChange={e => f({ cost_paid: e.target.checked })} style={{ accentColor: BRAND.navy }} />
            <label htmlFor="cpaid" style={{ fontSize: 12, cursor: "pointer" }}>Cost paid / confirmed</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="cnotreq" checked={form.confirmation_not_required} onChange={e => f({ confirmation_not_required: e.target.checked })} style={{ accentColor: BRAND.navy }} />
            <label htmlFor="cnotreq" style={{ fontSize: 12, cursor: "pointer" }}>No confirmation required</label>
          </div>
        </div>
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

function ItemRow({ item, onEdit, onRemove, onToggleCostPaid, onToggleNotRequired, onRemoveImage }: {
  item: AgendaItemWithFeedback;
  onEdit: () => void; onRemove: () => void; onToggleCostPaid: () => void;
  onToggleNotRequired: (next: boolean) => void;
  onRemoveImage: (url: string) => void;
}) {
  const travel = TRAVEL_METHODS.find(t => t.value === item.travel_method)?.label || "";
  const mapUrl = getMapUrl(item.map_link, item.address);

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid #f8fafc", background: "#fff" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 56, fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0, paddingTop: 6, textAlign: "right" }}>
          {item.time || "-"}
        </div>
        <TypeDot type={item.type} travelMethod={item.travel_method} subtype={item.activity_subtype} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
            {travel && <span style={{ fontSize: 10, background: "#eff6ff", color: "#1e40af", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{travel}</span>}
            <ConfirmationStatus linked={(item.confirmation_urls?.length ?? 0) > 0} notRequired={item.confirmation_not_required} />
            {(item.confirmation_urls?.length ?? 0) === 0 && (
              <NoConfirmationToggle checked={!!item.confirmation_not_required} onChange={onToggleNotRequired} />
            )}
          </div>
          {item.detail && <div style={{ fontSize: 12, color: "#475569", marginBottom: 3 }}>{item.detail}</div>}
          {item.public_note && (
            <div style={{ fontSize: 12, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 7, padding: "5px 10px", marginBottom: 5, color: "#0c4a6e", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {item.public_note}
            </div>
          )}
          {item.type === "food" && item.meal_pay_type && (
            <div style={{ marginBottom: 4 }}>
              {item.meal_pay_type === "stipend"
                ? <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 9px", fontWeight: 700 }}>
                    Meal Stipend{item.stipend_amount ? ` - $${item.stipend_amount} on Till Card` : ""}
                  </span>
                : <span style={{ fontSize: 11, background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "2px 9px", fontWeight: 700 }}>Group Meal - Tour Host pays</span>
              }
            </div>
          )}
          {item.address && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} style={{ flexShrink: 0 }} />{item.address}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0369a1", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none", fontWeight: 600 }}>
                <I n="link" s={10} />Google Maps
              </a>
            )}
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
            {item.driver_note && <span style={{ fontSize: 10, background: "#fef3c7", color: "#92400e", borderRadius: 5, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 4 }}><Bus size={11} style={{ flexShrink: 0 }} />{item.driver_note}</span>}
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [editingDayDateVal, setEditingDayDateVal] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  // Server-side PDF export of the itinerary (host full view). Streams the file
  // back from the /pdf route and triggers a download.
  async function downloadPdf() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/tour/${tour.id}/pdf`);
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("Itinerary PDF generation failed:", detail || res.status);
        throw new Error(detail || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFilename(tour.name)}-Itinerary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : "";
      alert(`Sorry, the itinerary PDF could not be generated. Please try again.${msg ? `\n\n(${msg})` : ""}`);
    } finally {
      setPdfLoading(false);
    }
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
      time: f.time || null, type: f.type, activity_subtype: f.activity_subtype || null, title: f.title,
      detail: f.detail || null, public_note: f.public_note || null,
      address: f.address || null, map_link: f.map_link || null,
      website: f.website || null, travel_method: f.travel_method || null,
      contact_name: f.contact_name || null, contact_phone: f.contact_phone || null,
      contact_email: f.contact_email || null, cost: parseFloat(f.cost) || 0,
      cost_paid: f.cost_paid, confirmation_not_required: f.confirmation_not_required, driver_note: f.driver_note || null,
      internal_note: f.internal_note || null,
      meal_pay_type: f.meal_pay_type || null,
      stipend_amount: f.stipend_amount ? parseFloat(f.stipend_amount) : null,
      item_visibility: null,
      persona_visibility: f.persona_visibility,
      image_urls: f.image_urls,
    };
  }

  function itemToForm(item: AgendaItemWithFeedback): ItemFormState {
    return {
      time: item.time || "", type: item.type, activity_subtype: item.activity_subtype || "", title: item.title,
      detail: item.detail || "", public_note: item.public_note || "",
      address: item.address || "", map_link: item.map_link || "",
      website: item.website || "", travel_method: item.travel_method || "",
      contact_name: item.contact_name || "", contact_phone: item.contact_phone || "",
      contact_email: item.contact_email || "",
      cost: item.cost > 0 ? String(item.cost) : "",
      cost_paid: item.cost_paid, confirmation_not_required: !!item.confirmation_not_required, driver_note: item.driver_note || "",
      internal_note: item.internal_note || "",
      meal_pay_type: item.meal_pay_type || "",
      stipend_amount: item.stipend_amount ? String(item.stipend_amount) : "",
      persona_visibility: item.persona_visibility ?? defaultPersonaVisibility(item.type, item.travel_method),
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
    const { data } = await supabase.from("agenda_items")
      .insert({ id: addingItemId, ...formToInsert(itemForm, dayId, (day?.agenda_items.length ?? 0) + 1) })
      .select().single();
    if (data) onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: [...d.agenda_items, { ...data, agenda_feedback: [] }] } : d));
    setItemForm(BLANK);
    setAddingItem(null);
    setAddingItemId("");
    setSaving(false);
  }

  async function updateItem() {
    if (!editCtx || !editForm.title.trim()) return;
    setSaving(true);
    const { day_id, tour_id, sort_order, ...patch } = formToInsert(editForm, editCtx.dayId, 0);
    const supabase = createClient();
    await supabase.from("agenda_items").update(patch).eq("id", editCtx.itemId);
    onDaysChange(days.map(d => d.id === editCtx.dayId ? {
      ...d, agenda_items: d.agenda_items.map(i => i.id === editCtx.itemId ? { ...i, ...patch } : i),
    } : d));
    setEditCtx(null);
    setSaving(false);
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

  async function toggleNotRequired(dayId: string, item: AgendaItemWithFeedback, next: boolean) {
    const supabase = createClient();
    await supabase.from("agenda_items").update({ confirmation_not_required: next }).eq("id", item.id);
    onDaysChange(days.map(d => d.id === dayId ? { ...d, agenda_items: d.agenda_items.map(i => i.id === item.id ? { ...i, confirmation_not_required: next } : i) } : d));
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
  const busLoc = itemLocs.find(x => x.item.travel_method === "bus" && (x.item.contact_name || x.item.contact_phone))
    ?? itemLocs.find(x => x.item.travel_method === "bus") ?? null;
  const flightLoc = itemLocs.find(x => x.item.travel_method === "flight") ?? null;

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
            <button onClick={() => setShowShareModal(true)}
              style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.teal, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <I n="link" s={15} />Share View
              </button>
            <button onClick={downloadPdf} disabled={pdfLoading}
              title="Download a branded PDF of the full itinerary"
              style={{ flex: "1 1 140px", minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 700, cursor: pdfLoading ? "default" : "pointer", fontFamily: "inherit", opacity: pdfLoading ? 0.7 : 1 }}>
                <Download size={15} />{pdfLoading ? "Generating…" : "Download PDF"}
              </button>
          </div>
        </div>
      )}

      {/* Access codes — secondary, subdued and collapsed below the preview */}
      <AccessCodeManager tour={tour} onTourChange={onTourChange} />

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
                  {day.agenda_items.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onEdit={() => { setEditCtx({ dayId: day.id, itemId: item.id }); setEditForm(itemToForm(item)); }}
                      onRemove={() => removeItem(day.id, item.id)}
                      onToggleCostPaid={() => toggleCostPaid(day.id, item)}
                      onToggleNotRequired={next => toggleNotRequired(day.id, item, next)}
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

      {editCtx && (
        <Modal title="Edit Itinerary Item" onClose={() => setEditCtx(null)} wide>
          <ItemForm
            form={editForm} setForm={setEditForm}
            onSave={updateItem}
            onCancel={() => setEditCtx(null)}
            isEdit saving={saving}
            tourId={tour.id} itemId={editCtx.itemId}
            activePersonas={activePersonaKeys(tour.active_personas)}
            personaLabels={tour.persona_labels || {}}
          />
        </Modal>
      )}

      {showShareModal && (
        <Modal title="Share Itinerary" onClose={() => setShowShareModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Share this link with travelers. They select their role and enter the access code you set above.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .8 }}>Share URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/tour/${tour.id}/view` : `/tour/${tour.id}/view`}
                  style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontFamily: "inherit", color: "#1e293b", background: "#f8fafc", outline: "none" }}
                />
                <Btn variant="muted" onClick={() => {
                  const url = `${window.location.origin}/tour/${tour.id}/view`;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}>Copy</Btn>
              </div>
            </div>
            <div style={{ background: "#f0fdfa", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#065f46" }}>
              Set access codes in the Access Codes section above, then share the matching code with each person.
            </div>
            <Btn onClick={() => setShowShareModal(false)} variant="muted" style={{ alignSelf: "flex-end" }}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
