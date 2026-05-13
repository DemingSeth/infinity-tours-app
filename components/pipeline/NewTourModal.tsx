"use client";

import { useState } from "react";
import { BRAND, STATUSES } from "@/lib/helpers";

interface Props {
  onClose: () => void;
  onCreate: (fields: {
    name: string; school: string; destination: string;
    dates: string; status: string; transport_type: string;
  }) => Promise<void>;
}

const inp: React.CSSProperties = {
  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "#1e293b", fontFamily: "inherit",
  background: "#fff", outline: "none", boxSizing: "border-box",
};

const TRANSPORT = [
  { value: "flight", label: "Flight" },
  { value: "bus", label: "Charter Bus" },
  { value: "both", label: "Comparing Both" },
];

export default function NewTourModal({ onClose, onCreate }: Props) {
  const [form, setForm] = useState({
    name: "", school: "", destination: "", dates: "",
    status: "bid", transport_type: "flight",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const f = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Tour name is required."); return; }
    if (!form.school.trim()) { setError("School name is required."); return; }
    setSaving(true);
    setError("");
    try {
      await onCreate(form);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(10,25,40,.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,.3)", width: "100%", maxWidth: 520, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1.5px solid #f1f5f9", background: BRAND.navy }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: 0.3 }}>New Tour</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Tour Name *</label>
            <input style={inp} value={form.name} onChange={e => f({ name: e.target.value })} placeholder="Westridge HS — NYC Spring Musical" autoFocus />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>School *</label>
            <input style={inp} value={form.school} onChange={e => f({ school: e.target.value })} placeholder="Westridge High School" />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Destination</label>
              <input style={inp} value={form.destination} onChange={e => f({ destination: e.target.value })} placeholder="New York, NY" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Dates</label>
              <input style={inp} value={form.dates} onChange={e => f({ dates: e.target.value })} placeholder="Apr 14–18, 2026" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Status</label>
              <select style={{ ...inp, background: "#fff" }} value={form.status} onChange={e => f({ status: e.target.value })}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>Transport</label>
              <select style={{ ...inp, background: "#fff" }} value={form.transport_type} onChange={e => f({ transport_type: e.target.value })}>
                {TRANSPORT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "9px 14px", fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creating..." : "Create Tour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
