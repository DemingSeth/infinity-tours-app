"use client";

import { useState, useCallback, useRef } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, ROLES } from "@/lib/helpers";
import { getSentimentIcon } from "@/components/shared/agendaIcons";
import { Tex, Btn } from "@/components/tour/ui";
import type { TourRow, PostTripRow, PostTripReviewRow, AgendaDayWithItems } from "@/lib/types";

const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

// Map the stored sentiment emoji to a human rating label.
const SENTIMENT_LABEL: Record<string, string> = { "😊": "Good", "😐": "OK", "😞": "Poor" };

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
  initialReview: PostTripReviewRow | null;
  currentUserId: string;
}

const cardStyle: React.CSSProperties = { background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, padding: 16 };
const headingStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 12 };

export default function PostTripTab({ tour, days, initialPostTrip, initialReview, currentUserId }: Props) {
  const [postTrip, setPostTrip] = useState<PostTripRow | null>(initialPostTrip);
  const [draft, setDraft] = useState<Partial<PostTripRow>>(initialPostTrip ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-item participant feedback, grouped by itinerary item (only items that
  // actually received responses).
  const feedbackByItem = days.flatMap(d =>
    d.agenda_items
      .map(i => ({ itemTitle: i.title, dayDate: d.date, feedback: i.agenda_feedback || [] }))
      .filter(g => g.feedback.length > 0)
  );
  const totalFeedback = feedbackByItem.reduce((n, g) => n + g.feedback.length, 0);

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

      {/* Debrief fields (host working notes) */}
      {DEBRIEF_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 8 }}>{label}</div>
          <Tex
            value={(draft[key] as string) || ""}
            onChange={e => update({ [key]: e.target.value })}
            placeholder={placeholder}
            style={{ minHeight: 80 }}
          />
        </div>
      ))}

      <div>
        <Btn onClick={toggleComplete} variant={isComplete ? "muted" : undefined} style={{ width: "100%", justifyContent: "center" }}>
          {isComplete ? "Re-open Debrief" : "Save & Mark Complete"}
        </Btn>
      </div>

      {/* 1. Participant Feedback — per-item responses grouped by itinerary item */}
      <div style={cardStyle}>
        <div style={headingStyle}>
          Participant Feedback{totalFeedback > 0 ? ` (${totalFeedback} response${totalFeedback !== 1 ? "s" : ""})` : ""}
        </div>

        {totalFeedback === 0 ? (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            No participant feedback has been submitted yet. Students, teachers, and chaperones can rate items from the shared itinerary view.
          </div>
        ) : (
          <>
            {/* Sentiment summary across all responses */}
            {(() => {
              const all = feedbackByItem.flatMap(g => g.feedback);
              const total = all.length;
              return (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {[
                    { sentiment: "😊", label: "Good", col: "#166534", bg: "#f0fdf4" },
                    { sentiment: "😐", label: "OK",   col: "#92400e", bg: "#fef3c7" },
                    { sentiment: "😞", label: "Poor", col: "#b91c1c", bg: "#fee2e2" },
                  ].map(s => {
                    const count = all.filter(f => f.sentiment === s.sentiment).length;
                    const { Icon } = getSentimentIcon(s.sentiment);
                    return (
                      <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Icon size={26} color={s.col} /></div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: s.col }}>{count}</div>
                        <div style={{ fontSize: 10, color: s.col, fontWeight: 600 }}>{s.label} · {total > 0 ? Math.round(count / total * 100) : 0}%</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Grouped by itinerary item */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {feedbackByItem.map((group, gi) => (
                <div key={gi}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: BRAND.navy, marginBottom: 6, display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    {group.itemTitle}
                    <span style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 500 }}>{group.dayDate}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.feedback.map(fb => {
                      const { Icon, color } = getSentimentIcon(fb.sentiment);
                      return (
                        <div key={fb.id} style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <Icon size={17} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 2, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ background: ROLES_TYPED[fb.role]?.bg || "#f1f5f9", color: ROLES_TYPED[fb.role]?.color || "#475569", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                                {ROLES_TYPED[fb.role]?.label || fb.role}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>{SENTIMENT_LABEL[fb.sentiment] || fb.sentiment}</span>
                            </div>
                            {fb.text && <div style={{ color: "#1e293b" }}>{fb.text}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 2 & 3. Post-Trip Survey — host-submitted, read-only once saved (with Edit) */}
      <PostTripSurvey tourId={tour.id} hostId={currentUserId} initialReview={initialReview} />

      {/* 4. Social / Share placeholder */}
      <div style={{ background: "#f8fafc", border: "1.5px dashed #e2e8f0", borderRadius: 12, padding: 16, opacity: 0.85 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8", fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 4 }}>
          Social / Share
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1" }}>Post-trip social sharing coming soon.</div>
      </div>
    </div>
  );
}

// ── Post-Trip Survey ───────────────────────────────────────────────────────────
function PostTripSurvey({ tourId, hostId, initialReview }: {
  tourId: string;
  hostId: string;
  initialReview: PostTripReviewRow | null;
}) {
  const [review, setReview] = useState<PostTripReviewRow | null>(initialReview);
  const [editing, setEditing] = useState(!initialReview);
  const [rating, setRating] = useState<number>(initialReview?.overall_rating ?? 0);
  const [wentWell, setWentWell] = useState(initialReview?.went_well ?? "");
  const [toImprove, setToImprove] = useState(initialReview?.to_improve ?? "");
  const [vendorNotes, setVendorNotes] = useState(initialReview?.vendor_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("post_trip_reviews")
      .upsert(
        {
          tour_id: tourId,
          host_id: hostId,
          overall_rating: rating || null,
          went_well: wentWell.trim() || null,
          to_improve: toImprove.trim() || null,
          vendor_notes: vendorNotes.trim() || null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "tour_id" },
      )
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      setError("Couldn't save the survey. Please try again.");
      return;
    }
    setReview(data);
    setEditing(false);
  }

  function startEdit() {
    setRating(review?.overall_rating ?? 0);
    setWentWell(review?.went_well ?? "");
    setToImprove(review?.to_improve ?? "");
    setVendorNotes(review?.vendor_notes ?? "");
    setEditing(true);
  }

  // Read-only view of a submitted survey.
  if (review && !editing) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={headingStyle as React.CSSProperties}>Post-Trip Survey</div>
          <Btn onClick={startEdit} variant="muted" small>Edit</Btn>
        </div>
        <ReadRow label="Overall Rating"><Stars value={review.overall_rating ?? 0} readOnly /></ReadRow>
        <ReadRow label="What Went Well"><ReadText text={review.went_well} /></ReadRow>
        <ReadRow label="What to Improve"><ReadText text={review.to_improve} /></ReadRow>
        <ReadRow label="Notes for the Database"><ReadText text={review.vendor_notes} /></ReadRow>
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6 }}>
          Submitted {new Date(review.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
    );
  }

  // Blank / editable form.
  return (
    <div style={cardStyle}>
      <div style={headingStyle as React.CSSProperties}>Post-Trip Survey</div>

      <div style={{ marginBottom: 14 }}>
        <Label>Overall Tour Rating</Label>
        <Stars value={rating} onChange={setRating} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>What Went Well</Label>
        <Tex value={wentWell} onChange={e => setWentWell(e.target.value)} placeholder="Highlights, wins, what to keep doing..." style={{ minHeight: 70 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>What to Improve</Label>
        <Tex value={toImprove} onChange={e => setToImprove(e.target.value)} placeholder="Pain points, fixes for next time..." style={{ minHeight: 70 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <Label>Notes for the database — flag anything that should update pricing or vendor info</Label>
        <Tex value={vendorNotes} onChange={e => setVendorNotes(e.target.value)} placeholder="Vendor pricing changes, new contacts, quality issues to record..." style={{ minHeight: 70 }} />
      </div>

      {error && <div style={{ fontSize: 12, color: "#b91c1c", marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : review ? "Update Survey" : "Submit Survey"}</Btn>
        {review && <Btn onClick={() => setEditing(false)} variant="muted">Cancel</Btn>}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond',Georgia,serif", marginBottom: 8 }}>{children}</div>;
}

function ReadRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function ReadText({ text }: { text: string | null }) {
  return <div style={{ fontSize: 13, color: text ? "#1e293b" : "#cbd5e1", whiteSpace: "pre-wrap" }}>{text || "—"}</div>;
}

function Stars({ value, onChange, readOnly }: { value: number; onChange?: (n: number) => void; readOnly?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            style={{ background: "none", border: "none", padding: 0, cursor: readOnly ? "default" : "pointer", lineHeight: 0 }}
          >
            <Star size={24} color={filled ? "#f59e0b" : "#cbd5e1"} fill={filled ? "#f59e0b" : "none"} />
          </button>
        );
      })}
    </div>
  );
}
