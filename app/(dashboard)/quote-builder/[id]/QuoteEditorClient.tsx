"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
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
    // Persistent two-column editor. Negative margin cancels the dashboard main's
    // 24px padding so the columns fill the area below the 56px top nav; each
    // column scrolls independently.
    <div style={{ position: "relative", display: "flex", height: "calc(100dvh - 56px)", margin: -24, overflow: "hidden", background: "#dcdad3" }}>
      {/* LEFT: persistent Build Quote form column (collapsible) */}
      {panelOpen && (
        <BuildQuotePanel
          data={data}
          onChange={setData}
          onExport={exportJson}
          onImport={importJson}
          onSample={loadSample}
          onNew={newQuote}
        />
      )}

      {/* Collapse toggle — always rendered and pinned to the panel edge, so the
          panel can never end up closed with no way to reopen it. */}
      <button
        type="button"
        className="inf-screen-only"
        onClick={() => setPanelOpen((o) => !o)}
        title={panelOpen ? "Collapse editor" : "Expand editor"}
        aria-label={panelOpen ? "Collapse editor" : "Expand editor"}
        style={{
          position: "absolute",
          top: "50%",
          left: panelOpen ? 384 : 0,
          transform: "translateY(-50%)",
          zIndex: 1200,
          width: 24,
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3c8d9a",
          color: "#fff",
          border: "1px solid #347e8a",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          boxShadow: "2px 0 10px rgba(0,0,0,.18)",
        }}
      >
        {panelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* RIGHT: live document preview on the warm-gray backdrop */}
      <div className="inf-backdrop" style={{ flex: 1, overflow: "auto", background: "#dcdad3", padding: "36px 16px", display: "flex", justifyContent: "center" }}>
        {/* Screen-only toolbar over the document column */}
        <div className="inf-screen-only" style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, display: "flex", alignItems: "center", gap: 8 }}>
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
        </div>

        <QuoteDocument data={data} />
      </div>
    </div>
  );
}
