"use client";

import { getStatus } from "@/lib/helpers";

export default function StatusPill({ status }: { status: string }) {
  const s = getStatus(status);
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.dot}44`,
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 10px",
      borderRadius: 20,
      letterSpacing: 0.3,
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}
