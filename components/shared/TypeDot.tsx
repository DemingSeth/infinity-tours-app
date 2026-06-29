"use client";

import { BRAND, getAgendaType } from "@/lib/helpers";
import { getItemIcon, getAgendaTypeColor } from "@/components/shared/agendaIcons";

export default function TypeDot({ type, travelMethod, subtype, size = 28, flightColor }: {
  type: string;
  travelMethod?: string | null;
  subtype?: string | null;
  size?: number;
  // Host-chosen flight icon color (hex). Applied only to the flight plane; null /
  // undefined keeps the default rendering.
  flightColor?: string | null;
}) {
  const t = getAgendaType(type);
  const Icon = getItemIcon(type, travelMethod, subtype);
  const typeColor = getAgendaTypeColor(type);
  // A colored flight renders the plane in the chosen color on a navy chip so even
  // light/neutral colors stay legible; everything else keeps the tinted style.
  const isColoredFlight = type === "travel" && travelMethod === "flight" && !!flightColor;
  const color = isColoredFlight ? flightColor! : typeColor;
  const background = isColoredFlight ? BRAND.navy : typeColor + "1a";
  return (
    <div
      title={t.label}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: Math.round(size * 0.28),
        background,
        color,
      }}
    >
      <Icon size={Math.round(size * 0.56)} strokeWidth={2} />
    </div>
  );
}
