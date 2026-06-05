"use client";

import { STATUSES, BRAND } from "@/lib/helpers";
import type { TourWithHostAndMembers } from "@/lib/types";

// Future metrics — surfaced now as muted placeholders so the vision is visible.
const COMING_SOON = [
  { label: "Revenue (Total)", hint: "Billing + margins" },
  { label: "Avg Tour Size", hint: "Travelers per tour" },
  { label: "Waiver Completion", hint: "Signed vs outstanding" },
  { label: "QuickBooks Sync", hint: "Accounting integration" },
] as const;

export default function StatsRow({ tours }: { tours: TourWithHostAndMembers[] }) {
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s.id] = 0;
  for (const t of tours) if (counts[t.status] !== undefined) counts[t.status] += 1;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Primary status tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {STATUSES.map(st => (
          <div
            key={st.id}
            style={{
              background: "#fff", border: `1.5px solid ${st.dot}33`, borderRadius: 14,
              padding: "16px 18px", position: "relative", overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,.04)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: st.dot }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: st.dot }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.7 }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: BRAND.navy, lineHeight: 1, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {counts[st.id]}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              tour{counts[st.id] !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Coming-soon metric placeholders */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {COMING_SOON.map(m => (
          <div
            key={m.label}
            style={{
              background: "#f8fafc", border: "1.5px dashed #e2e8f0", borderRadius: 14,
              padding: "14px 18px", opacity: 0.85,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
                {m.label}
              </span>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: "#94a3b8", background: "#eef2f7", borderRadius: 20, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                Coming Soon
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#cbd5e1", lineHeight: 1, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              —
            </div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 5 }}>{m.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
