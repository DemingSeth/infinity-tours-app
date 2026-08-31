"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, calcRoster, calcRooms } from "@/lib/helpers";
import SaveStatusBar from "@/components/shared/SaveStatusBar";
import type { TourMemberRow, TourNoteRow, NotePriority } from "@/lib/types";

// ─── Shared micro-components ──────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  users:  "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  bus:    "M3 8h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm0 0V6a2 2 0 012-2h14a2 2 0 012 2v2M7 18v2m10-2v2M3 12h18",
  bed:    "M3 9v8a2 2 0 002 2h14a2 2 0 002-2V9M3 9h18M3 9a2 2 0 012-2h14a2 2 0 012 2M9 9V7a3 3 0 016 0v2",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
};
const I = ({ n, s = 16, c }: { n: string; s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: c }}>
    <path d={ICONS[n] ?? ""} />
  </svg>
);

const inp: React.CSSProperties = {
  width: "100%", border: "1.5px solid var(--border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--text)", fontFamily: "inherit",
  background: "var(--surface)", outline: "none", boxSizing: "border-box",
};

const Field = ({ label, children, half, third }: { label?: string; children: React.ReactNode; half?: boolean; third?: boolean }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: third ? "0 0 31%" : half ? "0 0 48%" : "1 1 100%" }}>
    {label && <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</label>}
    {children}
  </div>
);

// ─── Timestamped notes log ────────────────────────────────────────────────────
// Multiple dated notes per tour, each minimizable (July 2026 request). Collapsed
// entries show the date + a first-line preview; click to expand. The legacy
// free-text Notes field on the Trip Details card is unchanged.

function noteDateLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Priority tag styling (Low / Medium / High). Medium is the default and reads
// as neutral; High is red, Low is muted.
const PRIORITY_META: Record<NotePriority, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: "Low",    color: "var(--text-2)", bg: "var(--surface-3)", border: "var(--border)" },
  medium: { label: "Medium", color: "var(--sky-text)", bg: "var(--sky-bg)", border: "var(--sky-border)" },
  high:   { label: "High",   color: "var(--red-text)", bg: "var(--red-bg)", border: "var(--red-border)" },
};
const PRIORITY_ORDER: NotePriority[] = ["low", "medium", "high"];

// ── Notes autosave ────────────────────────────────────────────────────────────
// September 2026 fix. A host took a full meeting's notes here, their hotspot
// dropped, and everything typed was lost. Two independent layers now stand
// between typing and losing it:
//
//   1. Local: every keystroke is mirrored into this browser's local storage.
//      That write needs no network, so it survives a dead connection, a closed
//      laptop, and an accidental reload. It is what actually saves the work.
//   2. Server: a 30-second timer pushes the draft to Supabase. The first push
//      creates the row and later pushes update that same row, so a long note
//      never turns into a pile of fragments. While the composer still holds
//      that row it is hidden from the list below (it is already on screen in
//      the box), and it appears in the log as soon as the note is saved or the
//      page is reloaded.
//
// Cancel deletes the autosaved row and clears local storage, so an abandoned
// draft leaves nothing behind.
const AUTOSAVE_MS = 30000;

const draftKey = (tourId: string) => `infinity.notes.draft.${tourId}`;
const editKey = (noteId: string) => `infinity.notes.edit.${noteId}`;

type StoredDraft = { text: string; priority: NotePriority; autoNoteId: string | null };

// Storage can throw outright (Safari private mode, blocked site data), so every
// access is guarded and a failure just means this layer is unavailable.
function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStored(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch { /* storage unavailable; the 30-second server autosave still runs */ }
}
function readDraft(tourId: string): StoredDraft | null {
  const raw = readStored(draftKey(tourId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed?.text !== "string") return null;
    return {
      text: parsed.text,
      priority: (parsed.priority ?? "medium") as NotePriority,
      autoNoteId: parsed.autoNoteId ?? null,
    };
  } catch { return null; }
}

function savedAtLabel(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function NotesLog({ tourId, isOwner }: { tourId: string; isOwner: boolean }) {
  const [notes, setNotes] = useState<TourNoteRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [draftPriority, setDraftPriority] = useState<NotePriority>("medium");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  // Edit an existing note's text in place (August 2026 request).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Autosave: the row the timer created for the open composer, plus the state
  // the status line reports.
  const [autoNoteId, setAutoNoteId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);

  // Load the log, and in the same pass recover anything this browser was still
  // holding from a previous visit — a dropped connection, a closed tab, a reload
  // mid-sentence. Recovery runs inside the async body so it happens after the
  // effect commits rather than cascading a second render synchronously.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await createClient()
        .from("tour_notes").select("*").eq("tour_id", tourId)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (data) setNotes(data as TourNoteRow[]);
      const stored = readDraft(tourId);
      if (stored && stored.text.trim()) {
        setDraft(stored.text);
        setDraftPriority(stored.priority);
        setAutoNoteId(stored.autoNoteId);
        setAdding(true);
        setRecovered(true);
      }
    })();
    return () => { active = false; };
  }, [tourId]);

  // Mirror the composer into local storage on every keystroke. No network.
  useEffect(() => {
    if (!adding) return;
    if (!draft.trim() && !autoNoteId) { writeStored(draftKey(tourId), null); return; }
    writeStored(draftKey(tourId), JSON.stringify({ text: draft, priority: draftPriority, autoNoteId }));
  }, [draft, draftPriority, adding, autoNoteId, tourId]);

  // Same for an in-place edit of an existing note.
  useEffect(() => {
    if (!editingId) return;
    writeStored(editKey(editingId), editText);
  }, [editText, editingId]);

  // The 30-second timer reads through a ref, so it always sees the latest text
  // without being torn down and rebuilt on every keystroke. The ref is filled in
  // an effect (never during render) so React stays in charge of the ordering.
  const liveRef = useRef({ adding, draft, draftPriority, autoNoteId, editingId, editText, notes });
  useEffect(() => {
    liveRef.current = { adding, draft, draftPriority, autoNoteId, editingId, editText, notes };
  });

  // One pass of the server autosave. Silent on success apart from the status
  // line; a failure (offline) is reported and simply retried on the next tick,
  // with local storage still holding the text in the meantime.
  const autosave = useCallback(async () => {
    const { adding, draft, draftPriority, autoNoteId, editingId, editText, notes } = liveRef.current;
    const supabase = createClient();

    // An open in-place edit: only write when the text actually changed.
    if (editingId) {
      const text = editText.trim();
      const original = notes.find(n => n.id === editingId)?.text ?? "";
      if (text && text !== original.trim()) {
        const { error } = await supabase
          .from("tour_notes").update({ text, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) { setSaveError("Not saved yet, still trying"); return; }
        setNotes(prev => prev.map(n => n.id === editingId ? { ...n, text } : n));
        setSaveError(null);
        setSavedAt(new Date());
      }
      return;
    }

    if (!adding) return;
    const text = draft.trim();
    if (!text) return;

    if (autoNoteId) {
      const { error } = await supabase
        .from("tour_notes").update({ text, priority: draftPriority, updated_at: new Date().toISOString() }).eq("id", autoNoteId);
      if (error) { setSaveError("Not saved yet, still trying"); return; }
      setSaveError(null);
      setSavedAt(new Date());
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tour_notes")
      .insert({ tour_id: tourId, text, priority: draftPriority, created_by: user?.id ?? null })
      .select().single();
    if (error || !data) { setSaveError("Not saved yet, still trying"); return; }
    setAutoNoteId((data as TourNoteRow).id);
    setNotes(prev => [data as TourNoteRow, ...prev]);
    setSaveError(null);
    setSavedAt(new Date());
  }, [tourId]);

  useEffect(() => {
    if (!isOwner) return;
    const timer = window.setInterval(() => { void autosave(); }, AUTOSAVE_MS);
    return () => window.clearInterval(timer);
  }, [isOwner, autosave]);

  // Everything the composer was holding is done with: drop the local copy and
  // reset the status line.
  function clearComposer() {
    writeStored(draftKey(tourId), null);
    setDraft("");
    setDraftPriority("medium");
    setAutoNoteId(null);
    setAdding(false);
    setRecovered(false);
    setSavedAt(null);
    setSaveError(null);
  }

  // Cancel throws the draft away, including any row the autosave already
  // created, so nothing half-written is left in the log.
  async function cancelDraft() {
    const id = autoNoteId;
    clearComposer();
    if (id) {
      setNotes(prev => prev.filter(n => n.id !== id));
      const { error } = await createClient().from("tour_notes").delete().eq("id", id);
      if (error) console.error("[tour_notes.discardAutosave] failed", error.message);
    }
  }

  async function addNote() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const supabase = createClient();

    // The 30-second autosave may already have created this note. Finish that
    // row instead of inserting a duplicate.
    if (autoNoteId) {
      const { data, error } = await supabase
        .from("tour_notes")
        .update({ text, priority: draftPriority, updated_at: new Date().toISOString() })
        .eq("id", autoNoteId).select().single();
      setSaving(false);
      if (error || !data) {
        console.error("[tour_notes.update] failed", error?.message);
        if (typeof window !== "undefined") window.alert(`Could not save note: ${error?.message ?? "permission denied"}`);
        return;
      }
      setNotes(prev => prev.map(n => n.id === autoNoteId ? (data as TourNoteRow) : n));
      setExpanded(prev => ({ ...prev, [autoNoteId]: true }));
      clearComposer();
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tour_notes")
      .insert({ tour_id: tourId, text, priority: draftPriority, created_by: user?.id ?? null })
      .select().single();
    setSaving(false);
    if (error || !data) {
      console.error("[tour_notes.insert] failed", error?.message);
      if (typeof window !== "undefined") window.alert(`Could not save note: ${error?.message ?? "permission denied"}`);
      return;
    }
    setNotes(prev => [data as TourNoteRow, ...prev]);
    setExpanded(prev => ({ ...prev, [(data as TourNoteRow).id]: true }));
    clearComposer();
  }

  async function changePriority(id: string, priority: NotePriority) {
    const prev = notes;
    setNotes(cur => cur.map(n => n.id === id ? { ...n, priority } : n));
    const { error } = await createClient().from("tour_notes").update({ priority }).eq("id", id);
    if (error) {
      console.error("[tour_notes.priority] failed", error.message);
      setNotes(prev); // roll back
    }
  }

  function startEdit(n: TourNoteRow) {
    // Prefer an unsaved local edit of this note over the stored text, so a
    // dropped connection mid-edit does not quietly discard the rewrite.
    const stored = readStored(editKey(n.id));
    setEditingId(n.id);
    setEditText(stored && stored.trim() && stored !== n.text ? stored : n.text);
    setExpanded(prev => ({ ...prev, [n.id]: true }));
    setSavedAt(null);
    setSaveError(null);
  }

  function cancelEdit(id: string) {
    writeStored(editKey(id), null);
    setEditingId(null);
    setSavedAt(null);
    setSaveError(null);
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text || editSaving) return;
    setEditSaving(true);
    const { data, error } = await createClient()
      .from("tour_notes").update({ text, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    setEditSaving(false);
    if (error || !data) {
      console.error("[tour_notes.update] failed", error?.message);
      if (typeof window !== "undefined") window.alert(`Could not save the note: ${error?.message ?? "permission denied"}`);
      return;
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...(data as TourNoteRow) } : n));
    writeStored(editKey(id), null);
    setEditingId(null);
    setSavedAt(null);
    setSaveError(null);
  }

  async function deleteNote(id: string) {
    writeStored(editKey(id), null);
    const { error } = await createClient().from("tour_notes").delete().eq("id", id);
    if (error) {
      console.error("[tour_notes.delete] failed", error.message);
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>
          Notes Log
        </span>
        {isOwner && !adding && (
          <button onClick={() => setAdding(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", color: "var(--ink)", border: `1.5px solid ${"var(--ink)"}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Plus size={12} /> Add Note
          </button>
        )}
      </div>

      {adding && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {recovered && (
            <div style={{ fontSize: 12, color: "var(--sky-text)", background: "var(--sky-bg)", border: "1px solid var(--sky-border)", borderRadius: 8, padding: "7px 11px" }}>
              Recovered an unsaved note from this browser. Save it or cancel to discard it.
            </div>
          )}
          <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="What happened / what to remember (a timestamp is added automatically)…"
            style={{ ...inp, resize: "vertical", minHeight: 140 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.6 }}>Priority</span>
              {PRIORITY_ORDER.map(p => {
                const m = PRIORITY_META[p];
                const active = draftPriority === p;
                return (
                  <button key={p} type="button" onClick={() => setDraftPriority(p)}
                    style={{ padding: "4px 12px", borderRadius: 999, border: `1.5px solid ${active ? m.color : "var(--border)"}`, background: active ? m.bg : "var(--surface)", color: active ? m.color : "var(--muted-2)", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 11, color: saveError ? "var(--red-text)" : "var(--muted-2)" }}>
              {saveError
                ? saveError
                : savedAt
                  ? `Autosaved ${savedAtLabel(savedAt)}`
                  : "Autosaves every 30 seconds, and keeps a copy in this browser"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={cancelDraft}
              style={{ background: "var(--surface-3)", color: "var(--muted)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button onClick={addNote} disabled={saving || !draft.trim()}
              style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: saving || !draft.trim() ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "var(--muted-2)" }}>
          No dated notes yet. Notes added here keep their timestamp so you can track when each one was entered.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* While the composer still holds the row the autosave created, it is
            already on screen in the box above; showing it twice reads as a bug. */}
        {notes.filter(n => !(adding && n.id === autoNoteId)).map(n => {
          const isOpen = !!expanded[n.id];
          const firstLine = (n.text.split("\n")[0] || "").slice(0, 80);
          const pr = PRIORITY_META[(n.priority ?? "medium") as NotePriority] ?? PRIORITY_META.medium;
          return (
            <div key={n.id} style={{ border: "1px solid var(--border-soft)", borderRadius: 9, overflow: "hidden", borderLeft: `3px solid ${pr.color}` }}>
              <div
                onClick={() => setExpanded(prev => ({ ...prev, [n.id]: !isOpen }))}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--surface-2)", cursor: "pointer" }}
              >
                {isOpen ? <ChevronDown size={14} style={{ flexShrink: 0, color: "var(--muted-2)" }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: "var(--muted-2)" }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: BRAND.blue, flexShrink: 0 }}>{noteDateLabel(n.created_at)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: pr.bg, border: `1px solid ${pr.border}`, borderRadius: 999, padding: "1px 8px", flexShrink: 0, textTransform: "uppercase", letterSpacing: 0.4 }}>{pr.label}</span>
                {!isOpen && (
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {firstLine}
                  </span>
                )}
                {isOwner && (
                  <button title="Delete note" onClick={e => { e.stopPropagation(); deleteNote(n.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-3)", padding: 2, display: "flex", marginLeft: "auto", flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {isOpen && (
                <div style={{ padding: "10px 14px" }}>
                  {editingId === n.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <textarea autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Escape") cancelEdit(n.id); }}
                        style={{ ...inp, resize: "vertical", minHeight: 80 }} />
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <span style={{ marginRight: "auto", fontSize: 11, color: saveError ? "var(--red-text)" : "var(--muted-2)" }}>
                          {saveError ? saveError : savedAt ? `Autosaved ${savedAtLabel(savedAt)}` : "Autosaves every 30 seconds"}
                        </span>
                        <button onClick={() => cancelEdit(n.id)}
                          style={{ background: "var(--surface-3)", color: "var(--muted)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          Cancel
                        </button>
                        <button onClick={() => saveEdit(n.id)} disabled={editSaving || !editText.trim()}
                          style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: editSaving || !editText.trim() ? 0.6 : 1 }}>
                          {editSaving ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {n.text}
                      {n.updated_at && n.created_at && new Date(n.updated_at).getTime() - new Date(n.created_at).getTime() > 60000 && (
                        <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 6 }}>Edited {noteDateLabel(n.updated_at)}</div>
                      )}
                    </div>
                  )}
                  {isOwner && editingId !== n.id && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--surface-3)", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => startEdit(n)} title="Edit this note"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--surface)", color: "var(--ink)", border: `1.5px solid ${"var(--ink)"}`, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginRight: 6 }}>
                        <Pencil size={11} /> Edit
                      </button>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.6 }}>Priority</span>
                      {PRIORITY_ORDER.map(p => {
                        const m = PRIORITY_META[p];
                        const active = (n.priority ?? "medium") === p;
                        return (
                          <button key={p} type="button" onClick={() => changePriority(n.id, p)}
                            style={{ padding: "3px 10px", borderRadius: 999, border: `1.5px solid ${active ? m.color : "var(--border)"}`, background: active ? m.bg : "var(--surface)", color: active ? m.color : "var(--muted-2)", fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  tour: any;
  members: TourMemberRow[];
  isOwner: boolean;
  onChange: (patch: Record<string, any>) => void;
  saving?: boolean;
}

export default function OverviewTab({ tour, members, isOwner, onChange, saving = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const f = (patch: Record<string, any>) => setForm(p => ({ ...p, ...patch }));

  const startEdit = () => {
    setForm({
      name: tour.name ?? "",
      school: tour.school ?? "",
      contact_name: tour.contact_name ?? "",
      contact_email: tour.contact_email ?? "",
      contact_phone: tour.contact_phone ?? "",
      destination: tour.destination ?? "",
      alt_destination: tour.alt_destination ?? "",
      dates: tour.dates ?? "",
      start_date: tour.start_date ?? "",
      end_date: tour.end_date ?? "",
      date_flexible: tour.date_flexible ?? false,
      bus_company: tour.bus_company ?? "",
      bus_driver_contact: { name: tour.bus_driver_contact?.name ?? "", phone: tour.bus_driver_contact?.phone ?? "" },
      bus_capacity: tour.bus_capacity ?? 55,
      room_config: { boysPerRoom: tour.room_config?.boysPerRoom ?? 4, girlsPerRoom: tour.room_config?.girlsPerRoom ?? 4 },
      activities: tour.activities ?? [],
      notes: tour.notes ?? "",
      planning_tour_host: tour.planning_tour_host ?? "",
      traveling_tour_host: tour.traveling_tour_host ?? "",
    });
    setEditing(true);
  };

  const save = () => {
    // Normalize the bus fields: empty → null so Trip Information shows a dash and
    // never stores empty objects/strings.
    const driverName = (form.bus_driver_contact?.name || "").trim();
    const driverPhone = (form.bus_driver_contact?.phone || "").trim();
    onChange({
      ...form,
      bus_company: (form.bus_company || "").trim() || null,
      bus_driver_contact: driverName || driverPhone ? { name: driverName || null, phone: driverPhone || null } : null,
    });
    setEditing(false);
  };

  const calc  = calcRoster(members, tour.bus_capacity ?? 55);
  const rooms = calcRooms(members, tour.room_config ?? { boysPerRoom: 4, girlsPerRoom: 4 });

  const stats = [
    { l: "Students",     v: calc.students.length,   icon: "users", col: "var(--ink)" },
    { l: "Chaperones",   v: calc.chaperones.length,  icon: "users", col: "#0d9488" },
    { l: "Tour Hosts",   v: calc.hosts.length,        icon: "star",  col: "var(--amber-text)" },
    { l: "Buses Needed", v: calc.busesNeeded,         icon: "bus",   col: "#6366f1" },
    { l: "Hotel Rooms",  v: rooms.totalRooms,         icon: "bed",   col: "var(--sky-text)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isOwner && <SaveStatusBar saving={saving} note="Notes save as you add them; Trip Details save when you press Save." />}

      {/* Timestamped, minimizable notes log */}
      <NotesLog tourId={tour.id} isOwner={isOwner} />

      {/* Stat cards */}
      <div className="tour-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
        {stats.map(s => (
          <div key={s.l} style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 12, padding: "14px 12px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <I n={s.icon} s={16} c={s.col} />
            <div style={{ fontSize: 20, fontWeight: 700, color: s.col, marginTop: 5 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: "var(--muted-2)", marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Trip details card */}
      <div style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)", fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em" }}>Trip Details</span>
          {isOwner && !editing && (
            <button onClick={startEdit} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "transparent", color: "var(--ink)", border: `1.5px solid ${"var(--ink)"}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <I n="edit" s={12} />Edit
            </button>
          )}
          {editing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing(false)} style={{ background: "var(--surface-3)", color: "var(--muted)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={save} style={{ background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="trip-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", fontSize: 13 }}>
            {[
              ["Tour Name",        tour.name],
              ["School",           tour.school],
              ["Contact",          tour.contact_name],
              ["Email",            tour.contact_email],
              ["Phone",            tour.contact_phone],
              ["Destination",      tour.destination],
              ["Alt Destination",  tour.alt_destination || "—"],
              ["Dates",            tour.dates],
              ["Start Date",       tour.start_date || "—"],
              ["End Date",         tour.end_date || "—"],
              ["Date Flexible",    tour.date_flexible ? "Yes" : "No"],
              ["Tour Consultant",  tour.planning_tour_host || "—"],
              ["Tour Host",        tour.traveling_tour_host || "—"],
              ["Bus Company",      tour.bus_company || "—"],
              ["Bus Driver Contact", [tour.bus_driver_contact?.name, tour.bus_driver_contact?.phone].filter(Boolean).join(" · ") || "—"],
              ["Bus Capacity",     `${tour.bus_capacity ?? 55} seats`],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div style={{ fontSize: 10, color: "var(--muted-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
                <div style={{ color: "var(--text)", marginTop: 1 }}>{v ?? "—"}</div>
              </div>
            ))}
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 10, color: "var(--muted-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Activities</div>
              <div style={{ color: "var(--text)" }}>{tour.activities?.join(", ") || "—"}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 10, color: "var(--muted-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Notes</div>
              <div style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}>{tour.notes || "—"}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Field label="Tour Name">
              <input style={inp} value={form.name} onChange={e => f({ name: e.target.value })} />
            </Field>
            <Field label="School Name">
              <input style={inp} value={form.school} onChange={e => f({ school: e.target.value })} />
            </Field>
            <Field label="Contact Name" half>
              <input style={inp} value={form.contact_name} onChange={e => f({ contact_name: e.target.value })} />
            </Field>
            <Field label="Contact Email" half>
              <input style={inp} value={form.contact_email} onChange={e => f({ contact_email: e.target.value })} />
            </Field>
            <Field label="Contact Phone" half>
              <input style={inp} value={form.contact_phone} onChange={e => f({ contact_phone: e.target.value })} />
            </Field>
            <Field label="Destination" half>
              <input style={inp} value={form.destination} onChange={e => f({ destination: e.target.value })} />
            </Field>
            <Field label="Alt. Destination" half>
              <input style={inp} value={form.alt_destination} onChange={e => f({ alt_destination: e.target.value })} />
            </Field>
            <Field label="Dates" half>
              <input style={inp} value={form.dates} onChange={e => f({ dates: e.target.value })} />
            </Field>
            <Field label="Start Date" half>
              <input style={inp} type="date" value={form.start_date || ""} onChange={e => f({ start_date: e.target.value || null })} />
            </Field>
            <Field label="End Date" half>
              <input style={inp} type="date" value={form.end_date || ""} onChange={e => f({ end_date: e.target.value || null })} />
            </Field>
            <Field label="Tour Consultant" half>
              <input style={inp} value={form.planning_tour_host} onChange={e => f({ planning_tour_host: e.target.value })} />
            </Field>
            <Field label="Tour Host" half>
              <input style={inp} value={form.traveling_tour_host} onChange={e => f({ traveling_tour_host: e.target.value })} />
            </Field>
            <Field label="Bus Company" half>
              <input style={inp} value={form.bus_company} onChange={e => f({ bus_company: e.target.value })} placeholder="e.g. Holiday Motor Coach, LLC" />
            </Field>
            <Field label="Bus Driver Contact — Name" half>
              <input style={inp} value={form.bus_driver_contact?.name ?? ""} onChange={e => f({ bus_driver_contact: { ...form.bus_driver_contact, name: e.target.value } })} placeholder="Driver name (host-only)" />
            </Field>
            <Field label="Bus Driver Contact — Phone" half>
              <input style={inp} type="tel" value={form.bus_driver_contact?.phone ?? ""} onChange={e => f({ bus_driver_contact: { ...form.bus_driver_contact, phone: e.target.value } })} placeholder="Driver phone (host-only)" />
            </Field>
            <Field label="Bus Capacity" third>
              <input style={inp} type="number" value={form.bus_capacity} onChange={e => f({ bus_capacity: parseInt(e.target.value) || 1 })} />
            </Field>
            <Field label="Boys per Room" third>
              <input style={inp} type="number" value={form.room_config?.boysPerRoom ?? 4} onChange={e => f({ room_config: { ...form.room_config, boysPerRoom: parseInt(e.target.value) || 1 } })} />
            </Field>
            <Field label="Girls per Room" third>
              <input style={inp} type="number" value={form.room_config?.girlsPerRoom ?? 4} onChange={e => f({ room_config: { ...form.room_config, girlsPerRoom: parseInt(e.target.value) || 1 } })} />
            </Field>
            <Field label="Date Flexible">
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={form.date_flexible} onChange={e => f({ date_flexible: e.target.checked })} style={{ accentColor: BRAND.navy, width: 15, height: 15 }} />
                Dates are flexible
              </label>
            </Field>
            <Field label="Activities (one per line)">
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 72 }}
                value={form.activities?.join("\n") ?? ""}
                onChange={e => f({ activities: e.target.value.split("\n").filter(Boolean) })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                style={{ ...inp, resize: "vertical", minHeight: 72 }}
                value={form.notes}
                onChange={e => f({ notes: e.target.value })}
              />
            </Field>
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: "var(--surface-3)", color: "var(--muted)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={save} style={{ flex: 1, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
