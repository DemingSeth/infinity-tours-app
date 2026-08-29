"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import TypeDot from "@/components/shared/TypeDot";

// Icon colors available on EVERY itinerary item (August 2026 request: colors
// used to be flight / bus / meeting only). The icon renders in the chosen color
// on a light tint of the same color, so each one stays legible in light and
// dark mode. Stored as the hex on agenda_items.icon_color; null = the item
// type's own color.
export const ICON_COLOR_CHOICES: { value: string; label: string }[] = [
  { value: "#0B1957", label: "Navy" },
  { value: "#2563EB", label: "Blue" },
  { value: "#0891B2", label: "Teal" },
  { value: "#059669", label: "Green" },
  { value: "#D97706", label: "Gold" },
  { value: "#EA580C", label: "Orange" },
  { value: "#E11D48", label: "Rose" },
  { value: "#7C3AED", label: "Purple" },
  { value: "#DB2777", label: "Pink" },
  { value: "#475569", label: "Slate" },
];

// The item's icon, as a button: click it to pick a color right there on the
// item (no separate section further down the form).
export default function IconColorButton({
  type, travelMethod, subtype, value, onChange, size = 32, disabled = false,
}: {
  type: string;
  travelMethod?: string | null;
  subtype?: string | null;
  /** Current color (hex) or null for the type's default. */
  value: string | null;
  onChange: (hex: string | null) => void;
  size?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (disabled) {
    return <TypeDot type={type} travelMethod={travelMethod} subtype={subtype} size={size} color={value} />;
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0, lineHeight: 0 }} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Click to change this icon's color"
        aria-label="Change icon color"
        aria-expanded={open}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", borderRadius: Math.round(size * 0.28), outline: open ? "2px solid var(--border-strong)" : "none", outlineOffset: 2 }}
      >
        <TypeDot type={type} travelMethod={travelMethod} subtype={subtype} size={size} color={value} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 600,
            background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 11,
            boxShadow: "0 12px 32px rgba(0,0,0,.22)", padding: 10, width: 194,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Icon color
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {ICON_COLOR_CHOICES.map(c => {
              const selected = (value || "").toUpperCase() === c.value.toUpperCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => { onChange(c.value); setOpen(false); }}
                  style={{
                    width: 28, height: 28, borderRadius: 8, cursor: "pointer", padding: 0,
                    background: c.value, border: selected ? "2px solid var(--text)" : "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {selected && <Check size={13} strokeWidth={3} color="#fff" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            style={{
              marginTop: 9, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: value ? "var(--surface-3)" : "var(--sky-bg)", border: "none", borderRadius: 7,
              padding: "6px 0", fontSize: 11.5, fontWeight: 600, color: value ? "var(--muted)" : "var(--sky-text)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {!value && <Check size={12} strokeWidth={3} />}Default color
          </button>
        </div>
      )}
    </div>
  );
}
