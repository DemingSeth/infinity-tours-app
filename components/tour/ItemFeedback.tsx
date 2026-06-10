"use client";

import { useState } from "react";
import { MessageCircle, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSentimentIcon } from "@/components/shared/agendaIcons";
import { BRAND } from "@/lib/helpers";
import type { Role } from "@/lib/types";

// Sentiment options stored as the original emoji string in the DB.
const OPTIONS = [
  { v: "😊", l: "Good" },
  { v: "😐", l: "OK" },
  { v: "😞", l: "Poor" },
] as const;

type Status = "idle" | "saving" | "done" | "error";

// Compact, mobile-first feedback control shown under each itinerary item in the
// participant views. Collapsed by default to a small speech-bubble button at the
// end of the card; tapping it expands a row of three rating buttons (Good / OK /
// Poor) with an optional comment field + Submit. Once submitted it collapses to a
// green "Thanks!" indicator. The participant's role is captured alongside the
// rating so admins can later filter by role.
//
// `preview` is set in the embedded admin preview so coordinators can see the
// control without writing real feedback rows — submitting is a no-op there.
export default function ItemFeedback({ itemId, tourId, role, preview = false }: {
  itemId: string;
  tourId: string;
  role: Role;
  preview?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit() {
    if (!sentiment || status === "saving") return;
    if (preview) { setStatus("done"); return; } // don't write real rows from a preview
    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.from("agenda_feedback").insert({
      item_id: itemId,
      tour_id: tourId,
      role,            // captures the participant's access-code role for later filtering
      sentiment,
      text: text.trim() || null,
    });
    setStatus(error ? "error" : "done");
  }

  // Once submitted, replace the control with a small acknowledgement.
  if (status === "done") {
    return (
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "4px 11px" }}>
          <Check size={14} /> Thanks!
        </span>
      </div>
    );
  }

  // Collapsed: just a small icon button at the end of the card.
  if (!expanded) {
    return (
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="How was this?"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "#f8fafc",
            border: "1px solid #e2e8f0", borderRadius: 999, padding: "5px 12px", fontSize: 12,
            fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <MessageCircle size={15} /> How was this?
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
          How was this?
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-label="Close feedback"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2, display: "inline-flex", fontFamily: "inherit" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Row of three tap-friendly rating buttons — wraps-free at ~390px */}
      <div style={{ display: "flex", gap: 6 }}>
        {OPTIONS.map(opt => {
          const { Icon, color } = getSentimentIcon(opt.v);
          const active = sentiment === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => setSentiment(opt.v)}
              style={{
                flex: 1, minWidth: 0, minHeight: 46, padding: "6px 4px", borderRadius: 8,
                border: `2px solid ${active ? BRAND.teal : "#e2e8f0"}`,
                background: active ? "#f0fdfa" : "#fff", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                fontFamily: "inherit",
              }}
            >
              <Icon size={22} color={active ? color : "#94a3b8"} />
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? BRAND.teal : "#94a3b8" }}>{opt.l}</span>
            </button>
          );
        })}
      </div>

      {/* Comment field + submit expand once a rating is tapped */}
      {sentiment && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment (optional)…"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0",
              borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#1e293b",
              fontFamily: "inherit", outline: "none", resize: "vertical",
            }}
          />
          {status === "error" && (
            <div style={{ fontSize: 12, color: "#b91c1c" }}>Couldn’t save feedback. Please try again.</div>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={status === "saving"}
            style={{
              alignSelf: "flex-start", background: BRAND.navy, color: "#fff", border: "none",
              borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
              cursor: status === "saving" ? "default" : "pointer", fontFamily: "inherit",
              opacity: status === "saving" ? 0.7 : 1, minHeight: 40,
            }}
          >
            {status === "saving" ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      )}
    </div>
  );
}
