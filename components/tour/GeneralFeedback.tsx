"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSentimentIcon } from "@/components/shared/agendaIcons";
import { BRAND } from "@/lib/helpers";
import type { Role } from "@/lib/types";

const OPTIONS = [
  { v: "😊", l: "Great" },
  { v: "😐", l: "OK" },
  { v: "😞", l: "Poor" },
] as const;

type Status = "idle" | "saving" | "error";

// Whole-tour ("general") feedback control. Stored in agenda_feedback with a null
// item_id and the tour_id set. Two visual variants share one form:
//   • "card"   — quiet card always shown at the bottom of the itinerary.
//   • "banner" — prominent end-of-tour invite shown at the top.
// `done` is owned by the parent (AgendaRoleView) and shared across both variants
// so submitting in one collapses both to a thank-you. `preview` makes submitting
// a no-op for the host's embedded preview.
export default function GeneralFeedback({
  tourId, role, variant, done, onSubmitted, preview = false,
}: {
  tourId: string;
  role: Role;
  variant: "card" | "banner";
  done: boolean;
  onSubmitted: () => void;
  preview?: boolean;
}) {
  const [expanded, setExpanded] = useState(variant === "banner");
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit() {
    if (!sentiment || status === "saving") return;
    if (preview) { onSubmitted(); return; } // never write real rows from a preview
    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.from("agenda_feedback").insert({
      item_id: null,            // null item_id + tour_id = whole-tour feedback
      tour_id: tourId,
      role,
      sentiment,
      text: text.trim() || null,
      highlight: highlight.trim() || null,
    });
    if (error) { setStatus("error"); return; }
    onSubmitted();
  }

  // ── Thank-you state ───────────────────────────────────────────────────────
  if (done) {
    if (variant === "banner") return null; // banner just disappears once submitted
    return (
      <div style={{ marginTop: 24, padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, color: "#15803d", fontWeight: 600, fontSize: 13 }}>
        <Check size={16} /> Thanks for sharing your feedback!
      </div>
    );
  }

  const isBanner = variant === "banner";

  // ── Collapsed CTA (card only — the banner opens expanded) ─────────────────
  if (!expanded) {
    return (
      <div style={{ marginTop: 24, padding: "16px 18px", background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.04)", textAlign: "center" }}>
        <div style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.025em", fontSize: 17, fontWeight: 700, color: BRAND.navy }}>How was your tour?</div>
        <div style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 12px" }}>Share your feedback with the team.</div>
        <button type="button" onClick={() => setExpanded(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, background: BRAND.blue, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <Star size={15} /> Share Feedback
        </button>
      </div>
    );
  }

  // ── Expanded form (shared by both variants) ───────────────────────────────
  return (
    <div style={{
      marginTop: isBanner ? 0 : 24,
      marginBottom: isBanner ? 18 : 0,
      padding: isBanner ? "18px 18px 16px" : "16px 18px",
      borderRadius: 14,
      background: isBanner ? "linear-gradient(135deg, #0f2137 0%, #1e3a5f 100%)" : "#fff",
      border: isBanner ? "none" : "1.5px solid #e8eef4",
      boxShadow: isBanner ? "0 6px 24px rgba(15,33,55,.25)" : "0 1px 4px rgba(0,0,0,.04)",
      color: isBanner ? "#fff" : "#1e293b",
    }}>
      <div style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", fontSize: isBanner ? 20 : 17, fontWeight: 700, color: isBanner ? "#fff" : BRAND.navy }}>
        How was your tour?
      </div>
      <div style={{ fontSize: 12.5, color: isBanner ? "rgba(255,255,255,.8)" : "#64748b", margin: "4px 0 14px" }}>
        Your trip is wrapping up — tell us how it went.
      </div>

      {/* Overall rating */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {OPTIONS.map(opt => {
          const { Icon, color } = getSentimentIcon(opt.v);
          const active = sentiment === opt.v;
          return (
            <button key={opt.v} type="button" onClick={() => setSentiment(opt.v)}
              style={{
                flex: 1, minWidth: 0, minHeight: 54, padding: "8px 4px", borderRadius: 10,
                border: `2px solid ${active ? BRAND.blue : (isBanner ? "rgba(255,255,255,.25)" : "#e2e8f0")}`,
                background: active ? "#f0fdfa" : (isBanner ? "rgba(255,255,255,.06)" : "#fff"),
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontFamily: "inherit",
              }}>
              <Icon size={24} color={active ? color : (isBanner ? "rgba(255,255,255,.8)" : "#94a3b8")} />
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? BRAND.blue : (isBanner ? "rgba(255,255,255,.85)" : "#94a3b8") }}>{opt.l}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Any comments about your tour? (optional)"
        rows={2}
        style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1e293b", fontFamily: "inherit", outline: "none", resize: "vertical", marginBottom: 8 }}
      />
      <textarea
        value={highlight}
        onChange={e => setHighlight(e.target.value)}
        placeholder="What was the highlight? (optional)"
        rows={2}
        style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1e293b", fontFamily: "inherit", outline: "none", resize: "vertical" }}
      />

      {status === "error" && (
        <div style={{ fontSize: 12, color: isBanner ? "#fecaca" : "#b91c1c", marginTop: 8 }}>Couldn’t save your feedback. Please try again.</div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" onClick={submit} disabled={!sentiment || status === "saving"}
          style={{ background: BRAND.blue, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: !sentiment || status === "saving" ? "default" : "pointer", fontFamily: "inherit", opacity: !sentiment || status === "saving" ? 0.6 : 1 }}>
          {status === "saving" ? "Submitting…" : "Submit Feedback"}
        </button>
        {!isBanner && (
          <button type="button" onClick={() => setExpanded(false)}
            style={{ background: "none", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
