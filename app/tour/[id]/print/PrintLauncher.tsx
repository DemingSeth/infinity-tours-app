"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

// Auto-opens the browser print dialog once fonts and images have settled, so the
// print view is effectively one click. A visible button is kept as a fallback for
// browsers that block programmatic printing without a user gesture (e.g. Safari).

// ── Fit Trip Information onto page one ───────────────────────────────────────
// September 2026 request: hosts like that the whole trip-details card lands on
// the front page, and want it to stay there as they add rows rather than
// spilling a line or two onto page two.
//
// The measurement has to happen at the PRINTED width, not the window width, or
// the numbers mean nothing. So the render root is pinned to the page's content
// box, the card is measured against the remaining height on page one, and if it
// overflows it is scaled down with `zoom` (which reflows text, unlike
// `transform: scale`, so nothing is clipped or blurred). The floor keeps the
// card readable: if it cannot fit at 65% it is left alone and simply flows onto
// the next page as before, which is the honest outcome for a very long card.
const IN = 96;                                   // CSS px per inch
const MM = IN / 25.4;
const CONTENT_W = 8.5 * IN - 2 * (10 * MM);      // @page Letter, 10mm side margins
const CONTENT_H = 11 * IN - 2 * (12 * MM);       // @page Letter, 12mm top/bottom
const MIN_ZOOM = 0.65;

function fitTripInfoToFirstPage() {
  const root = document.getElementById("print-root");
  const card = document.querySelector<HTMLElement>(".print-tripinfo");
  if (!root || !card) return;

  const previousWidth = root.style.width;
  card.style.removeProperty("zoom");
  root.style.width = `${CONTENT_W}px`;

  // Reading a rect forces the pending layout, so these are post-resize values.
  const rootTop = root.getBoundingClientRect().top;
  const rect = card.getBoundingClientRect();
  const top = rect.top - rootTop;
  const height = rect.height;
  const available = CONTENT_H - top;

  if (height > available && available > 0) {
    const zoom = available / height;
    if (zoom >= MIN_ZOOM) card.style.setProperty("zoom", String(Math.floor(zoom * 1000) / 1000));
  }

  root.style.width = previousWidth;
}

export default function PrintLauncher() {
  useEffect(() => {
    let cancelled = false;

    async function settleThenPrint() {
      // Wait for brand fonts so headings don't reflow after the dialog opens.
      try { await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready; } catch { /* ignore */ }

      // Wait for every image to finish (or error), capped so we never hang.
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(
          imgs.map(img =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>(res => {
                  img.addEventListener("load", () => res(), { once: true });
                  img.addEventListener("error", () => res(), { once: true });
                }),
          ),
        ),
        new Promise<void>(res => setTimeout(res, 4000)),
      ]);

      if (cancelled) return;
      // Measure and shrink only once everything above the card has its final
      // height, otherwise a late-loading banner throws the numbers off.
      try { fitTripInfoToFirstPage(); } catch { /* never block the print dialog */ }
      window.print();
    }

    settleThenPrint();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: 260 }}>
      <button
        type="button"
        onClick={() => {
          try { fitTripInfoToFirstPage(); } catch { /* never block the print dialog */ }
          window.print();
        }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7, background: "#0f2137", color: "#fff",
          border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", boxShadow: "0 2px 10px rgba(0,0,0,.2)",
        }}
      >
        <Printer size={15} /> Print / Save as PDF
      </button>
      <p style={{
        margin: 0, fontSize: 11, lineHeight: 1.4, color: "#475569", background: "rgba(255,255,255,.9)",
        borderRadius: 8, padding: "6px 10px", textAlign: "right", boxShadow: "0 1px 4px rgba(0,0,0,.12)",
      }}>
        For a clean copy, turn off &ldquo;Headers and footers&rdquo; in your browser&rsquo;s print dialog.
      </p>
    </div>
  );
}
