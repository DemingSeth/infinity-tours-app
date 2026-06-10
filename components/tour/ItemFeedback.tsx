"use client";

import { useState } from "react";
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
// public view. A row of three tap-friendly buttons (Good / OK / Poor); choosing
// one expands an optional comment field + Submit. The participant's role is
// captured alongside the rating so admins can later filter by role.
export default function ItemFeedback({ itemId, tourId, role }: {
  itemId: string;
  tourId: string;
  role: Role;
}) {
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function submit() {
    if (!sentiment || status === "saving") return;
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

  if (status === "done") {
    return (
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12, color: "#15803d", fontWeight: 600 }}>
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
        How was this?
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
