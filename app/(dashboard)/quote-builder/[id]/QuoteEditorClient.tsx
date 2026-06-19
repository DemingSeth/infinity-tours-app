"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, SlidersHorizontal } from "lucide-react";
import type { QuoteData } from "@/lib/quotes/types";
import { blankQuote, sampleQuote } from "@/lib/quotes/sampleData";
import { createClient } from "@/lib/supabase/client";
import QuoteDocument from "@/components/quotes/QuoteDocument";
import QuoteHeroPicker from "@/components/quotes/QuoteHeroPicker";
import BuildQuotePanel from "@/components/quotes/BuildQuotePanel";

const OSWALD = "var(--font-oswald), 'Oswald', sans-serif";

const toolbarBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: OSWALD,
  fontWeight: 600,
  fontSize: 11,
  letterSpacing: ".6px",
  textTransform: "uppercase",
  borderRadius: 6,
  padding: "8px 13px",
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(0,0,0,.14)",
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function QuoteEditorClient({ quoteId, initialData }: { quoteId: string; initialData: QuoteData }) {
  const router = useRouter();
  const [data, setData] = useState<QuoteData>(initialData);
  const [panelOpen, setPanelOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Debounced autosave to Supabase. The first render (hydration) must not write,
  // so skip the effect run that corresponds to the initial state.
  const skipNext = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("quotes")
        .update({ data, updated_at: new Date().toISOString() })
        .eq("id", quoteId);
      setSaveState(error ? "error" : "saved");
      if (error) console.error("Quote autosave failed", error.message);
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, quoteId]);

  const setHero = useCallback((heroPhotoUrl: string) => {
    setData((d) => ({ ...d, heroPhotoUrl }));
  }, []);

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(data.group || "infinity-quote").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as QuoteData;
        setData(parsed);
      } catch {
        alert("Could not read that JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function loadSample() {
    if (confirm("Load the Cantorum sample content? This replaces the current content.")) {
      // Preserve any already-uploaded hero on this quote.
      setData((d) => ({ ...sampleQuote(), heroPhotoUrl: d.heroPhotoUrl }));
    }
  }

  function newQuote() {
    if (confirm("Start a new blank quote? This clears the current content.")) {
      setData((d) => ({ ...blankQuote(), heroPhotoUrl: d.heroPhotoUrl }));
    }
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";

  return (
    <div className="inf-backdrop" style={{ minHeight: "100vh", padding: "36px 16px", display: "flex", justifyContent: "center", background: "#dcdad3" }}>
      {/* Screen-only toolbar */}
      <div className="inf-screen-only" style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", alignItems: "center", gap: 8 }}>
        {saveLabel && (
          <span style={{ fontFamily: OSWALD, fontSize: 10, letterSpacing: ".6px", textTransform: "uppercase", color: saveState === "error" ? "#9a6b5e" : "#5b6b5f", background: "rgba(255,255,255,0.9)", borderRadius: 6, padding: "6px 9px", boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>
            {saveLabel}
          </span>
        )}
        <button type="button" onClick={() => router.push("/quote-builder")} style={{ ...toolbarBtn, color: "#5b6b5f", background: "rgba(255,255,255,0.94)", border: "1px solid #d6dcd6" }}>
          <ArrowLeft size={13} /> Quotes
        </button>
        <QuoteHeroPicker heroPhotoUrl={data.heroPhotoUrl} onChange={setHero} />
        <button type="button" onClick={() => window.open(`/quote-builder/${quoteId}/pdf`, "_blank")} style={{ ...toolbarBtn, color: "#3a93a0", background: "rgba(255,255,255,0.94)", border: "1px solid #cfe3e6" }}>
          <Download size={13} /> Download PDF
        </button>
        {!panelOpen && (
          <button type="button" onClick={() => setPanelOpen(true)} style={{ ...toolbarBtn, color: "#fff", background: "#3c8d9a", border: "1px solid #347e8a" }}>
            <SlidersHorizontal size={13} /> Build Quote
          </button>
        )}
      </div>

      {panelOpen && (
        <BuildQuotePanel
          data={data}
          onChange={setData}
          onClose={() => setPanelOpen(false)}
          onExport={exportJson}
          onImport={importJson}
          onSample={loadSample}
          onNew={newQuote}
        />
      )}

      <QuoteDocument data={data} />
    </div>
  );
}
