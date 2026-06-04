"use client";

import { getAgendaType } from "@/lib/helpers";
import { getAgendaTypeIcon, getAgendaTypeColor } from "@/components/shared/agendaIcons";

export default function TypeDot({ type, size = 28 }: { type: string; size?: number }) {
  const t = getAgendaType(type);
  const Icon = getAgendaTypeIcon(type);
  const color = getAgendaTypeColor(type);
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
        background: color + "1a",
        color,
      }}
    >
      <Icon size={Math.round(size * 0.56)} strokeWidth={2} />
    </div>
  );
}
