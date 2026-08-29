"use client";

import { getAgendaType } from "@/lib/helpers";
import { getItemIcon, getAgendaTypeColor } from "@/components/shared/agendaIcons";

// A stored white icon color predates the tinted-chip rendering (the icon used
// to sit on a navy chip). White on a white tint is invisible, so it now means
// "default rendering".
const isUsableColor = (c?: string | null) => !!c && c.trim().toUpperCase() !== "#FFFFFF";

// 12% tint of the icon color, computed here rather than in CSS: the build's CSS
// minifier rewrites color-mix() into an @supports pair whose fallback would
// paint the chip a SOLID color (hiding the glyph) in a browser that fails the
// test. Inline rgba() works everywhere; dark mode still refines it in CSS.
function tint(hex: string, alpha: number): string {
  const m = hex.trim().replace("#", "");
  const full = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "transparent";
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// The item's icon: the type's (or sub-type's) glyph in a color, on a light tint
// of that same color. `color` is the host's choice for this item — see
// resolveIconColor() in lib/helpers — and null falls back to the type's own
// color.
export default function TypeDot({ type, travelMethod, subtype, size = 28, color }: {
  type: string;
  travelMethod?: string | null;
  subtype?: string | null;
  size?: number;
  color?: string | null;
}) {
  const t = getAgendaType(type);
  const Icon = getItemIcon(type, travelMethod, subtype);
  const typeColor = getAgendaTypeColor(type);
  const resolved = isUsableColor(color) ? color! : typeColor;
  return (
    // The color travels as a custom property so globals.css can tint the chip
    // and lighten the glyph in dark mode (an inline color would win over the
    // class rule and leave dark colors unreadable on a dark surface).
    <div
      className="type-dot"
      title={t.label}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: Math.round(size * 0.28),
        background: tint(resolved, 0.12),
        color: resolved,
        // Read by the dark-mode rule in globals.css (which uses !important so it
        // can refine these inline values).
        ["--type-dot-color" as string]: resolved,
      } as React.CSSProperties}
    >
      <Icon size={Math.round(size * 0.56)} strokeWidth={2} />
    </div>
  );
}
