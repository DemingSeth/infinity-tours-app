"use client";

import { useState } from "react";
import { STATUSES, BRAND } from "@/lib/helpers";
import TripCard from "./TripCard";

interface Props {
  tours: any[];
  currentHostId: string;
  currentHostName: string;
  duplicatingId: string | null;
  onSelectTour: (id: string) => void;
  onNewTour: () => void;
  onDuplicate: (id: string) => void;
}

export default function PipelineView({
  tours, currentHostId, currentHostName, duplicatingId, onSelectTour, onNewTour, onDuplicate,
}: Props) {
  const [hostFilter, setHostFilter] = useState<"mine" | "all">("mine");

  const filtered = hostFilter === "mine"
    ? tours.filter(t => t.tour_host_id === currentHostId)
    : tours;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif", margin: 0, letterSpacing: -0.5 }}>
            Tour Pipeline
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            {filtered.length} tour{filtered.length !== 1 ? "s" : ""} · logged in as <strong>{currentHostName}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 1, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
            {([{ value: "mine", label: "My Tours" }, { value: "all", label: "All Tours" }] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setHostFilter(opt.value)}
                style={{
                  padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  background: hostFilter === opt.value ? "#fff" : "transparent",
                  color: hostFilter === opt.value ? BRAND.navy : "#94a3b8",
                  boxShadow: hostFilter === opt.value ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  transition: "all .12s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={onNewTour}
            style={{
              background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            New Tour
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, alignItems: "start" }}>
        {STATUSES.map(st => {
          const col = filtered.filter(t => t.status === st.id);
          return (
            <div key={st.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.8 }}>{st.label}</span>
                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{col.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map(t => (
                  <TripCard
                    key={t.id}
                    tour={t}
                    currentHostId={currentHostId}
                    isDuplicating={duplicatingId === t.id}
                    onClick={() => onSelectTour(t.id)}
                    onDuplicate={() => onDuplicate(t.id)}
                  />
                ))}
                {col.length === 0 && (
                  <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: 18, textAlign: "center", color: "#cbd5e1", fontSize: 12 }}>
                    No tours
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
