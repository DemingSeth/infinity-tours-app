"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import type { QuoteRow } from "@/lib/quotes/types";
import { blankQuote } from "@/lib/quotes/sampleData";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function QuoteIndexClient({ quotes, currentUserId }: { quotes: QuoteRow[]; currentUserId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

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
      alert("Could not create a new quote.");
      setCreating(false);
      return;
    }
    router.push(`/quote-builder/${data.id}`);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 26, color: BRAND.navy, margin: 0 }}>Quote Builder</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Print-ready, branded tour quotes.</p>
        </div>
        <button
          type="button"
          onClick={newQuote}
          disabled={creating}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, background: BRAND.teal, color: "#fff", border: "none", borderRadius: 8, padding: "9px 15px", fontSize: 13, fontWeight: 600, cursor: creating ? "default" : "pointer", opacity: creating ? 0.7 : 1 }}
        >
          <Plus size={16} /> {creating ? "Creating…" : "New Quote"}
        </button>
      </div>

      {quotes.length === 0 ? (
        <div style={{ background: "#fff", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          No quotes yet. Click <strong>New Quote</strong> to build your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quotes.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => router.push(`/quote-builder/${q.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 14, textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", cursor: "pointer", fontFamily: "inherit" }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eef4f4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileText size={18} color="#3c8d9a" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.data?.group || "Untitled quote"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {[q.data?.destination, q.data?.year].filter(Boolean).join(" ") || "—"}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                Updated {formatDate(q.updated_at)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
