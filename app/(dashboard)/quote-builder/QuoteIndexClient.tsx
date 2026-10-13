"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2, Upload, Copy, Map as MapIcon } from "lucide-react";
import type { QuoteRow } from "@/lib/quotes/types";
import { blankQuote, duplicateQuoteData } from "@/lib/quotes/sampleData";
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

// Same model as the Tour Pipeline: everyone with Quote Page access sees every
// quote and can duplicate any of them as a starting point; only the person who
// made a quote can edit or delete it.
export default function QuoteIndexClient({ quotes: initialQuotes, currentUserId, ownerNames }: {
  quotes: QuoteRow[]; currentUserId: string; ownerNames: Record<string, string>;
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initialQuotes);
  const hasOwn = initialQuotes.some(q => q.created_by === currentUserId);
  const [scope, setScope] = useState<"mine" | "all">(hasOwn ? "mine" : "all");
  const shown = scope === "mine" ? quotes.filter(q => q.created_by === currentUserId) : quotes;
  const ownerOf = (q: QuoteRow) => (q.created_by && ownerNames[q.created_by]) || "Former staff";
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
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

  // Duplicate: a new quote with the same content, owned by whoever copies it
  // and not linked to any itinerary. Opens straight into the editor.
  async function duplicateQuote(q: QuoteRow) {
    if (copyingId) return;
    setCopyingId(q.id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("quotes")
      .insert({ data: duplicateQuoteData(q.data), created_by: currentUserId })
      .select("id")
      .single();
    if (error || !data) {
      setCopyingId(null);
      alert(`Could not duplicate the quote${error?.message ? `: ${error.message}` : "."}`);
      return;
    }
    router.push(`/quote-builder/${data.id}`);
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
      alert(`Could not delete the quote: ${error?.message ?? "only the person who made it can delete it"}`);
      return;
    }
    setQuotes(prev => prev.filter(x => x.id !== q.id));
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 26, color: BRAND.navy, margin: 0 }}>Quote Page</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>The client-facing quote page for each tour, print-ready and on brand.</p>
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

      <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 8, padding: 3, marginBottom: 14 }}>
        {(["mine", "all"] as const).map(k => (
          <button key={k} type="button" onClick={() => setScope(k)}
            style={{ border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
              background: scope === k ? "#fff" : "transparent", color: scope === k ? BRAND.navy : "#64748b", boxShadow: scope === k ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {k === "mine" ? "My Quotes" : "All Quotes"}
          </button>
        ))}
      </div>

      {shown.length === 0 && quotes.length > 0 ? (
        <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          You have not made any quotes yet. Start one with <strong>New Quote</strong> or <strong>Upload PDF</strong>, or duplicate one from <button type="button" onClick={() => setScope("all")} style={{ border: "none", background: "none", padding: 0, color: BRAND.teal, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>All Quotes</button>.
        </div>
      ) : quotes.length === 0 ? (
        <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          No quotes yet. Click <strong>New Quote</strong> to build one, or <strong>Upload PDF</strong> to start from an existing quote.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((q) => {
            const mine = q.created_by === currentUserId;
            return (
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
                  {!mine && (
                    <span style={{ fontSize: 10.5, color: "#475569", background: "#eef2f7", borderRadius: 5, padding: "1px 6px" }}>by {ownerOf(q)}</span>
                  )}
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
                title="Duplicate quote"
                aria-label={`Duplicate ${q.data?.group || "quote"}`}
                disabled={copyingId === q.id}
                onClick={e => { e.stopPropagation(); duplicateQuote(q); }}
                style={{ flexShrink: 0, background: "none", border: "1px solid transparent", borderRadius: 6, padding: 6, cursor: "pointer", color: "#3c8d9a", display: "flex", opacity: copyingId === q.id ? 0.5 : 1 }}
              >
                <Copy size={15} />
              </button>
              {mine ? <button
                type="button"
                title="Delete quote"
                aria-label={`Delete ${q.data?.group || "quote"}`}
                disabled={deletingId === q.id}
                onClick={e => { e.stopPropagation(); deleteQuote(q); }}
                style={{ flexShrink: 0, background: "none", border: "1px solid transparent", borderRadius: 6, padding: 6, cursor: "pointer", color: "#b91c1c", display: "flex" }}
              >
                <Trash2 size={15} />
              </button> : <span style={{ width: 29, flexShrink: 0 }} />}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
