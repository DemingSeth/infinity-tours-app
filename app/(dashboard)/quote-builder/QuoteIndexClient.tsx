"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2, Upload, Map as MapIcon } from "lucide-react";
import type { QuoteRow } from "@/lib/quotes/types";
import { blankQuote } from "@/lib/quotes/sampleData";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import { IMPORT_NOTES_KEY } from "@/lib/quotes/importNotes";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}


const headerBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, border: "none", borderRadius: 8,
  padding: "9px 15px", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
};

export default function QuoteIndexClient({ quotes: initialQuotes, currentUserId }: { quotes: QuoteRow[]; currentUserId: string }) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function newQuote() {
    if (creating) return;
    setCreating(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .insert({ data: blankQuote(), created_by: currentUserId })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Could not create quote", error?.message);
      alert(`Could not create a new quote${error?.message ? `: ${error.message}` : "."}`);
      setCreating(false);
      return;
    }
    router.push(`/quote-builder/${data.id}`);
  }

  async function importPdf(file: File | undefined) {
    if (!file || importing) return;
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/quote-builder/import", { method: "POST", body });
      const json = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok || !json.id) {
        alert(json.error ?? "That PDF could not be imported.");
        return;
      }
      try { sessionStorage.setItem(IMPORT_NOTES_KEY(json.id), JSON.stringify(json.unplaced ?? [])); } catch { /* optional */ }
      router.push(`/quote-builder/${json.id}`);
    } catch {
      alert("The upload did not go through. Check your connection and try again.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteQuote(q: QuoteRow) {
    const name = q.data?.group || "this quote";
    const note = q.tour_id ? " Its itinerary is not affected." : "";
    if (!window.confirm(`Delete "${name}"? This cannot be undone.${note}`)) return;
    setDeletingId(q.id);
    const supabase = createClient();
    // A refused delete returns no rows rather than an error.
    const { data, error } = await supabase.from("quotes").delete().eq("id", q.id).select("id");
    setDeletingId(null);
    if (error || !data || data.length === 0) {
      alert(`Could not delete the quote: ${error?.message ?? "only an admin can delete quotes"}`);
      return;
    }
    setQuotes(prev => prev.filter(x => x.id !== q.id));
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 26, color: BRAND.navy, margin: 0 }}>Quote Builder</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Print-ready, branded tour quotes.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={e => importPdf(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            title="Create a quote from a PDF, such as a Piktochart export"
            style={{ ...headerBtn, background: "#fff", color: BRAND.teal, border: `1px solid ${BRAND.teal}`, cursor: importing ? "default" : "pointer", opacity: importing ? 0.7 : 1 }}
          >
            <Upload size={16} /> {importing ? "Reading PDF…" : "Upload PDF"}
          </button>
          <button
            type="button"
            onClick={newQuote}
            disabled={creating}
            style={{ ...headerBtn, background: BRAND.teal, color: "#fff", cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1 }}
          >
            <Plus size={16} /> {creating ? "Creating…" : "New Quote"}
          </button>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          No quotes yet. Click <strong>New Quote</strong> to build one, or <strong>Upload PDF</strong> to start from an existing quote.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quotes.map((q) => (
            <div
              key={q.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/quote-builder/${q.id}`)}
              onKeyDown={e => { if (e.key === "Enter") router.push(`/quote-builder/${q.id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", cursor: "pointer", opacity: deletingId === q.id ? 0.5 : 1 }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eef4f4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={18} color="#3c8d9a" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.data?.group || "Untitled quote"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{[q.data?.destination, q.data?.year].filter(Boolean).join(" ") || "No destination yet"}</span>
                  {q.data?.layout !== "pricing" && (
                    <span style={{ fontSize: 10.5, color: "#64748b", background: "#f1f5f9", borderRadius: 5, padding: "1px 6px" }}>Trip sheet</span>
                  )}
                </div>
              </div>
              {q.tour_id && (
                <a
                  href={`/tour/${q.tour_id}`}
                  onClick={e => e.stopPropagation()}
                  title="Open the itinerary made from this quote"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 6, padding: "4px 9px", textDecoration: "none", flexShrink: 0 }}
                >
                  <MapIcon size={13} /> Itinerary
                </a>
              )}
              <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                Updated {formatDate(q.updated_at)}
              </div>
              <button
                type="button"
                title="Delete quote"
                aria-label={`Delete ${q.data?.group || "quote"}`}
                disabled={deletingId === q.id}
                onClick={e => { e.stopPropagation(); deleteQuote(q); }}
                style={{ flexShrink: 0, background: "none", border: "1px solid transparent", borderRadius: 6, padding: 6, cursor: "pointer", color: "#b91c1c", display: "flex" }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
