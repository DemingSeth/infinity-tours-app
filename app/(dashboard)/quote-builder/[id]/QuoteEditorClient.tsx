"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Trash2, Copy, Map as MapIcon, X, Image as ImageIcon } from "lucide-react";
import type { QuoteData } from "@/lib/quotes/types";
import { blankQuote, blankTripQuote, sampleQuote, samplePricingQuote, withPricingDefaults, duplicateQuoteData } from "@/lib/quotes/sampleData";
import { createTourFromQuote } from "@/lib/quotes/quoteToTour";
import { IMPORT_NOTES_KEY } from "@/lib/quotes/importNotes";
import { createClient } from "@/lib/supabase/client";
import QuoteDocument from "@/components/quotes/QuoteDocument";
import BannerLibraryPicker from "@/components/tour/BannerLibraryPicker";
import BuildQuotePanel from "@/components/quotes/BuildQuotePanel";

const OSWALD = "'Fjalla One', Georgia, sans-serif";

const toolbarBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 12,
  borderRadius: 8,
  padding: "8px 13px",
  cursor: "pointer",
  boxShadow: "var(--btn-shadow)",
};

type SaveState = "idle" | "saving" | "saved" | "error";

const noopSubscribe = () => () => {};

export default function QuoteEditorClient({ quoteId, initialData, tourId, currentUserId, canEdit, ownerName }: {
  quoteId: string; initialData: QuoteData; tourId: string | null; currentUserId: string;
  /** Only the person who made a quote edits it; everyone else views and can duplicate. */
  canEdit: boolean; ownerName: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<QuoteData>(() => withPricingDefaults(initialData));
  const [linkedTourId, setLinkedTourId] = useState<string | null>(tourId);
  const [converting, setConverting] = useState(false);
  // Header photos come from the approved Banner Library (the same photos the
  // itineraries use; admins add new ones from Overview), not free uploads.
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // After a PDF import: lines the importer could not place. The note lives in
  // sessionStorage until the host dismisses it or leaves the page.
  const importRaw = useSyncExternalStore(
    noopSubscribe,
    () => { try { return sessionStorage.getItem(IMPORT_NOTES_KEY(quoteId)); } catch { return null; } },
    () => null,
  );
  const [importDismissed, setImportDismissed] = useState(false);
  let importNotes: string[] | null = null;
  if (!importDismissed && importRaw !== null) {
    try { importNotes = JSON.parse(importRaw) as string[]; } catch { importNotes = []; }
  }
  function dismissImportNotes() {
    setImportDismissed(true);
    try { sessionStorage.removeItem(IMPORT_NOTES_KEY(quoteId)); } catch { /* ignore */ }
  }
  useEffect(() => () => { try { sessionStorage.removeItem(IMPORT_NOTES_KEY(quoteId)); } catch { /* ignore */ } }, [quoteId]);

  async function deleteQuote() {
    const note = linkedTourId ? " The itinerary made from it is not affected." : "";
    if (!confirm(`Delete this quote? This cannot be undone.${note}`)) return;
    setDeleting(true);
    if (timer.current) clearTimeout(timer.current);
    const supabase = createClient();
    const { data: rows, error } = await supabase.from("quotes").delete().eq("id", quoteId).select("id");
    if (error || !rows || rows.length === 0) {
      setDeleting(false);
      alert(`Could not delete the quote: ${error?.message ?? "only an admin can delete quotes"}`);
      return;
    }
    router.push("/quote-builder");
  }

  const [copying, setCopying] = useState(false);
  async function duplicateQuote() {
    setCopying(true);
    const supabase = createClient();
    const { data: row, error } = await supabase
      .from("quotes")
      .insert({ data: duplicateQuoteData(data), created_by: currentUserId })
      .select("id")
      .single();
    if (error || !row) {
      setCopying(false);
      alert(`Could not duplicate the quote${error?.message ? `: ${error.message}` : "."}`);
      return;
    }
    router.push(`/quote-builder/${row.id}`);
  }

  async function makeItinerary() {
    if (linkedTourId) { router.push(`/tour/${linkedTourId}`); return; }
    const dayCount = data.days.filter(d => d.date.trim() || d.rows.some(r => r.text.trim())).length;
    if (!confirm(`Create an itinerary from this quote? It becomes a new tour on your pipeline, marked Signed, with ${dayCount} day${dayCount === 1 ? "" : "s"} from the quote. You can edit everything afterwards.`)) return;
    setConverting(true);
    try {
      const { tourId: newId, problems } = await createTourFromQuote(createClient(), { id: quoteId, data }, currentUserId);
      setLinkedTourId(newId);
      if (problems.length) alert(`The itinerary was created, but a few parts did not copy:\n\n${problems.join("\n")}\n\nAdd those by hand on the itinerary.`);
      router.push(`/tour/${newId}`);
    } catch (e) {
      alert(`Could not create the itinerary: ${(e as Error).message}`);
      setConverting(false);
    }
  }
  const [panelOpen, setPanelOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Debounced autosave to Supabase. The first render (hydration) must not write,
  // so skip the effect run that corresponds to the initial state.
  const skipNext = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canEdit) return; // view only: never write someone else's quote
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("quotes")
        .update({ data, updated_at: new Date().toISOString() })
        .eq("id", quoteId)
        .select("id");
      const ok = !error && !!rows && rows.length > 0;
      setSaveState(ok ? "saved" : "error");
      if (!ok) console.error("Quote autosave failed", error?.message ?? "no row updated");
    }, 700);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, quoteId, canEdit]);

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

  const isPricing = data.layout === "pricing";

  // Click a part of the document to jump to its section in the editor panel:
  // scroll it into view, flash it, and put the cursor in its first field.
  function jumpTo(key: string) {
    const go = () => {
      const target = document.getElementById(`qp-${key}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const card = target.closest("[id^='qp-day-']") as HTMLElement | null;
      const flashEl = card ?? target;
      flashEl.classList.remove("qp-flash");
      void flashEl.offsetWidth; // restart the animation on repeat clicks
      flashEl.classList.add("qp-flash");
      // The first field at or after the section heading.
      let field: Element | null = target.matches("input, textarea") ? target : target.querySelector("input, textarea");
      for (let el = target.nextElementSibling; !field && el; el = el.nextElementSibling) {
        field = el.matches("input:not([type=checkbox]), textarea") ? el : el.querySelector("input:not([type=checkbox]), textarea");
      }
      (field as HTMLInputElement | null)?.focus({ preventScroll: true });
    };
    if (!panelOpen) { setPanelOpen(true); setTimeout(go, 60); } else go();
  }

  function onDocumentClick(e: React.MouseEvent) {
    const el = (e.target as HTMLElement).closest("[data-edit]") as HTMLElement | null;
    if (!el || (e.target as HTMLElement).closest("a")) return; // links still open
    jumpTo(el.dataset.edit!);
  }

  function loadSample() {
    const name = isPricing ? "Corner Canyon" : "Cantorum";
    if (confirm(`Load the ${name} sample content? This replaces the current content.`)) {
      // Preserve any already-uploaded hero on this quote.
      setData((d) => ({ ...(isPricing ? samplePricingQuote() : sampleQuote()), heroPhotoUrl: d.heroPhotoUrl }));
    }
  }

  function newQuote() {
    if (confirm("Start a new blank quote? This clears the current content.")) {
      setData((d) => ({ ...(isPricing ? blankQuote() : blankTripQuote()), heroPhotoUrl: d.heroPhotoUrl }));
    }
  }

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";

  return (
    // Persistent two-column editor. Negative margin cancels the dashboard main's
    // 24px padding so the columns fill the area below the 56px top nav; each
    // column scrolls independently.
    <div style={{ position: "relative", display: "flex", height: "calc(100dvh - 56px)", margin: -24, overflow: "hidden", background: "var(--page)" }}>
      {pickingPhoto && (
        <BannerLibraryPicker
          tourDestination={data.destination}
          tourName={data.group}
          currentUrl={data.heroPhotoUrl || null}
          onSelect={(url) => setHero(url ?? "")}
          onClose={() => setPickingPhoto(false)}
        />
      )}

      {/* LEFT: persistent Build Quote form column (collapsible) */}
      {canEdit && panelOpen && (
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
      {canEdit && <button
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
          background: "#5784E6",
          color: "#fff",
          border: "1px solid #3f6fd0",
          borderRadius: "0 8px 8px 0",
          cursor: "pointer",
          boxShadow: "2px 0 10px rgba(0,0,0,.18)",
        }}
      >
        {panelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>}

      {/* RIGHT: live document preview on the warm-gray backdrop. alignItems
          flex-start keeps the page at its natural content height (no stretch to
          the pane), so the day columns balance instead of clipping; the pane
          scrolls to reach the whole document. */}
      <div className="inf-backdrop" style={{ flex: 1, overflow: "auto", background: "var(--page)", padding: "36px 16px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        {/* Screen-only toolbar over the document column */}
        <div className="inf-screen-only" style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, display: "flex", alignItems: "center", gap: 8 }}>
          {saveLabel && (
            <span style={{ fontFamily: OSWALD, fontSize: 10, letterSpacing: ".6px", textTransform: "uppercase", color: saveState === "error" ? "var(--red-text)" : "var(--text)", background: "var(--surface)", borderRadius: 6, padding: "6px 9px", boxShadow: "0 2px 10px rgba(0,0,0,.1)" }}>
              {saveLabel}
            </span>
          )}
          <button type="button" onClick={() => router.push("/quote-builder")} style={{ ...toolbarBtn, color: "var(--text)", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ArrowLeft size={13} /> Quotes
          </button>
          {canEdit && <button type="button" onClick={() => setPickingPhoto(true)} title="Choose the header photo from the Banner Library"
            style={{ ...toolbarBtn, color: "#5784E6", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <ImageIcon size={13} /> {data.heroPhotoUrl ? "Change Photo" : "Choose Photo"}
          </button>}
          {(canEdit || linkedTourId) && <button type="button" onClick={makeItinerary} disabled={converting}
            title={linkedTourId ? "Open the itinerary made from this quote" : "Create an itinerary (a new tour) from this quote"}
            style={{ ...toolbarBtn, color: "var(--green-text)", background: "var(--surface)", border: "1px solid var(--green-border)", opacity: converting ? 0.7 : 1 }}>
            <MapIcon size={13} /> {converting ? "Creating…" : linkedTourId ? "Open Itinerary" : "Make Itinerary"}
          </button>}
          <button type="button" onClick={() => window.open(`/quote-builder/${quoteId}/pdf`, "_blank")} style={{ ...toolbarBtn, color: "#5784E6", background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Download size={13} /> Download PDF
          </button>
          <button type="button" onClick={duplicateQuote} disabled={copying} title="Duplicate this quote"
            style={{ ...toolbarBtn, color: "#5784E6", background: "var(--surface)", border: "1px solid var(--border)", opacity: copying ? 0.7 : 1 }}>
            <Copy size={13} /> {copying ? "Copying…" : "Duplicate"}
          </button>
          {canEdit && <button type="button" onClick={deleteQuote} disabled={deleting} title="Delete this quote"
            style={{ ...toolbarBtn, color: "var(--red-text)", background: "var(--surface)", border: "1px solid var(--red-border)", padding: "8px 10px", opacity: deleting ? 0.7 : 1 }}>
            <Trash2 size={13} />
          </button>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {!canEdit && (
            <div className="inf-screen-only" style={{ width: 816, boxSizing: "border-box", background: "var(--sky-bg-soft)", border: "1px solid var(--sky-border)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--sky-text)", lineHeight: 1.5, marginTop: 34 }}>
              <strong>Viewing {ownerName}&rsquo;s quote.</strong> Only {ownerName} can change it. Use <strong>Duplicate</strong> to make your own copy as a starting point.
            </div>
          )}
          {importNotes && (
            <div className="inf-screen-only" style={{ width: 816, boxSizing: "border-box", background: "var(--amber-bg-soft)", border: "1px solid var(--amber-border)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--amber-text)", lineHeight: 1.5, position: "relative", marginTop: 34 }}>
              <button type="button" onClick={dismissImportNotes} aria-label="Dismiss"
                style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--amber-text)", display: "flex" }}>
                <X size={15} />
              </button>
              <strong>Imported from your PDF.</strong> Please check every section against the original before sending, especially prices, payment dates and the day-by-day plan. The header photo was picked from the Banner Library; use Change Photo to pick another.
              {importNotes.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  These lines could not be placed and need to be added by hand:
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {importNotes.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div data-theme="light" className={isPricing && canEdit ? "inf-editable" : undefined} onClick={isPricing && canEdit ? onDocumentClick : undefined}>
            <QuoteDocument data={data} />
          </div>
          <style>{`
            @media screen {
              .inf-editable [data-edit] { cursor: pointer; transition: outline-color .15s; outline: 2px dashed transparent; outline-offset: 3px; }
              .inf-editable [data-edit]:hover { outline-color: rgba(74,123,224,.55); }
              .inf-editable [data-edit]:hover [data-edit]:not(:hover) { outline-color: transparent; }
              .inf-editable [data-edit]:hover:has([data-edit]:hover) { outline-color: transparent; }
            }
            @keyframes qpFlash { 0% { background-color: #fff3c4; } 100% { background-color: transparent; } }
            .qp-flash { animation: qpFlash 1.4s ease-out; border-radius: 6px; }
          `}</style>
        </div>
      </div>
    </div>
  );
}
