"use client";

import { useEffect } from "react";
import { Settings, X } from "lucide-react";
import { BRAND } from "@/lib/helpers";

// Stub entry point for future admin controls. No toggles yet — this just marks
// where host-vs-admin visibility configuration will live.
export default function VisibilitySettingsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" }}>
              <Settings size={17} />
            </div>
            <span style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em", fontSize: 17, fontWeight: 400, color: "var(--ink)" }}>
              Visibility Controls
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: "var(--surface-2)", border: "1.5px dashed var(--border)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted-2)", background: "var(--border-soft)", borderRadius: 20, padding: "3px 9px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Coming Soon
          </span>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, margin: "12px 0 0" }}>
            Admin visibility controls coming soon — configure what data hosts can see on this page.
          </p>
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 16, width: "100%", background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
