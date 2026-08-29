"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

// Sticky "Saving... / All changes saved" strip for pages that persist every
// change the moment it is made (Settings, Trip Details), so nobody has to hunt
// for a Save button or wonder whether an edit took.
export default function SaveStatusBar({ saving, note = "Changes on this page save automatically." }: {
  saving: boolean;
  note?: string;
}) {
  const [justSaved, setJustSaved] = useState(false);
  // Derived-state pattern: when `saving` flips from true to false, flash the
  // confirmation for a moment.
  const [prevSaving, setPrevSaving] = useState(saving);
  if (prevSaving !== saving) {
    setPrevSaving(saving);
    if (!saving) setJustSaved(true);
  }
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 10, fontSize: 12, color: "var(--muted)", boxShadow: "var(--shadow)" }}>
      {saving ? (
        <>
          <Loader2 size={14} style={{ color: "var(--muted-2)", animation: "it-spin 1s linear infinite" }} />
          <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Saving...</span>
        </>
      ) : justSaved ? (
        <>
          <Check size={14} strokeWidth={3} style={{ color: "var(--green-text)" }} />
          <span style={{ fontWeight: 600, color: "var(--green-text)" }}>All changes saved</span>
        </>
      ) : (
        <>
          <Check size={14} style={{ color: "var(--muted-2)" }} />
          <span>{note}</span>
        </>
      )}
    </div>
  );
}
