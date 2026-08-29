"use client";

import { getAgendaType } from "@/lib/helpers";
import { getItemIcon, getAgendaTypeColor } from "@/components/shared/agendaIcons";

// A stored white icon color predates the tinted-chip rendering (the icon used
// to sit on a navy chip). White on a white tint is invisible, so it now means
// "default rendering".
const isUsableColor = (c?: string | null) => !!c && c.trim().toUpperCase() !== "#FFFFFF";

export default function TypeDot({ type, travelMethod, subtype, size = 28, flightColor, busColor, meetingColor }: {
  type: string;
  travelMethod?: string | null;
  subtype?: string | null;
  size?: number;
  // Host-chosen flight icon color (hex). Applied only to the flight plane; null /
  // undefined keeps the default rendering.
  flightColor?: string | null;
  // Host-chosen bus icon color (hex). Applied only to the bus icon; null /
  // undefined keeps the default rendering.
  busColor?: string | null;
  // Host-chosen meeting point pin color (hex). Null / undefined keeps the default.
  meetingColor?: string | null;
}) {
  const t = getAgendaType(type);
  const Icon = getItemIcon(type, travelMethod, subtype);
  const typeColor = getAgendaTypeColor(type);
  // A host-chosen color renders exactly like every other item: the icon in that
  // color on a light tint of the same color (August 2026 request; previously a
  // navy chip).
  const isColoredFlight = type === "travel" && travelMethod === "flight" && isUsableColor(flightColor);
  const isColoredBus = type === "travel" && travelMethod === "bus" && isUsableColor(busColor);
  const isColoredMeeting = type === "meeting" && isUsableColor(meetingColor);
  const color = isColoredFlight ? flightColor! : isColoredBus ? busColor! : isColoredMeeting ? meetingColor! : typeColor;
  const background = color + "1a";
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
