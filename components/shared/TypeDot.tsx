"use client";

import { getAgendaType } from "@/lib/helpers";

export default function TypeDot({ type, size = 28 }: { type: string; size?: number }) {
  const t = getAgendaType(type);
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
        fontSize: Math.round(size * 0.7),
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {t.emoji || "📍"}
    </div>
  );
}
