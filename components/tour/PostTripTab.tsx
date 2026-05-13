"use client";

import { useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, ROLES } from "@/lib/helpers";
import { Tex, Btn } from "@/components/tour/ui";
import type { TourRow, PostTripRow, AgendaDayWithItems } from "@/lib/types";

const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

const DEBRIEF_FIELDS: { key: keyof PostTripRow; label: string; placeholder: string }[] = [
  { key: "what_worked",      label: "What Went Well",                  placeholder: "Standout moments, smooth logistics, vendor wins..." },
  { key: "what_to_improve",  label: "What to Improve",                 placeholder: "Timing issues, vendor problems, things to adjust..." },
  { key: "do_next_time",     label: "Do Next Time",                    placeholder: "Ideas, additions, upgrades worth including..." },
  { key: "do_not_repeat",    label: "Do Not Repeat",                   placeholder: "Venues, vendors, or decisions to avoid..." },
  { key: "school_feedback",  label: "School / Administrator Feedback", placeholder: "What the teacher or chaperones said after the trip..." },
  { key: "notes",            label: "General Notes",                   placeholder: "Anything else worth capturing for future reference..." },
];

interface Props {
  tour: TourRow;
  days: AgendaDayWithItems[];
  initialPostTrip: PostTripRow | null;
}

export default function PostTripTab({ tour, days, initialPostTrip }: Props) {
  const [postTrip, setPostTrip] = useState<PostTripRow | null>(initialPostTrip);
  const [draft, setDraft] = useState<Partial<PostTripRow>>(initialPostTrip ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allFeedback = days.flatMap(d =>
    d.agenda_items.flatMap(i =>
      (i.agenda_feedback || []).map(fb => ({ ...fb, itemTitle: i.title, dayDate: d.date }))
    )
  );

  const persist = useCallback(async (patch: Partial<PostTripRow>) => {
    setSaving(true);
    const supabase = createClient();
    if (postTrip?.id) {
      await supabase.from("post_trip").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", postTrip.id);
    } else {
      const { data } = await supabase.from("post_trip").insert({ tour_id: tour.id, completed: false, ...patch }).select().single();
      if (data) setPostTrip(data);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [postTrip, tour.id]);

  function update(patch: Partial<PostTripRow>) {
    setDraft(p => ({ ...p, ...patch }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(patch), 1200);
  }

  async function toggleComplete() {
    const next = !draft.completed;
    update({ completed: next });
    await persist({ ...draft, completed: next });
  }

  const isComplete = draft.completed ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Status bar */}
      <div style={{ background: isComplete ? "#f0fdf4" : "#fffbeb", border: `1.5px solid ${isComplete ? "#bbf7d0" : "#fcd34d"}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: isComplete ? "#065f46" : "#92400e" }}>
          {isComplete ? "Post-trip debrief complete" : "Post-trip debrief in progress"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(saving || saved) && <span style={{ fontSize: 11, color: "#94a3b8" }}>{saving ? "Saving..." : "Saved"}</span>}
          <Btn onClick={toggleComplete} variant={isComplete ? "muted" : undefined} small>
            {isComplete ? "Re-open" : "Mark Complete"}
          </Btn>
        </div>
      </div>

      {/* Debrief fields */}
      {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 8 }}>{label}</div>
          <Tex
            value={(draft[key] as string) || ""}
            onChange={e => update({ [key]: e.target.value })}
            placeholder={placeholder}
            style={{ minHeight: 80 }}
          />
        </div>
      ))}

      {/* Feedback aggregation */}
      {allFeedback.length > 0 && (
        <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 12 }}>
            Live Feedback from Travelers ({allFeedback.length} response{allFeedback.length !== 1 ? "s" : ""})
          </div>
          {/* Sentiment summary */}
          {(() => {
            const happy = allFeedback.filter(f => f.sentiment === "😊").length;
            const ok    = allFeedback.filter(f => f.sentiment === "😐").length;
            const poor  = allFeedback.filter(f => f.sentiment === "😞").length;
            const total = allFeedback.length;
            return (
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                {[
                  { emoji: "😊", label: "Good", count: happy, col: "#166534", bg: "#f0fdf4" },
                  { emoji: "😐", label: "OK",   count: ok,    col: "#92400e", bg: "#fef3c7" },
                  { emoji: "😞", label: "Poor", count: poor,  col: "#b91c1c", bg: "#fee2e2" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>{s.emoji}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.col }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: s.col, fontWeight: 600 }}>{s.label} · {total > 0 ? Math.round(s.count / total * 100) : 0}%</div>
                    <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "rgba(0,0,0,.08)" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: s.col, width: `${total > 0 ? s.count / total * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {allFeedback.map(fb => (
              <div key={fb.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{fb.sentiment || "😐"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 2, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: ROLES_TYPED[fb.role]?.bg || "#f1f5f9", color: ROLES_TYPED[fb.role]?.color || "#475569", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                      {ROLES_TYPED[fb.role]?.label || fb.role}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: 10 }}>{fb.dayDate} · {fb.itemTitle}</span>
                  </div>
                  {fb.text && <div style={{ color: "#1e293b" }}>{fb.text}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ paddingBottom: 8 }}>
        <Btn onClick={toggleComplete} variant={isComplete ? "muted" : undefined} style={{ width: "100%", justifyContent: "center" }}>
          {isComplete ? "Re-open Debrief" : "Save & Mark Complete"}
        </Btn>
      </div>
    </div>
  );
}
