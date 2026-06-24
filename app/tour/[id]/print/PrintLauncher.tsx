"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

// Auto-opens the browser print dialog once fonts and images have settled, so the
// print view is effectively one click. A visible button is kept as a fallback for
// browsers that block programmatic printing without a user gesture (e.g. Safari).
export default function PrintLauncher() {
  useEffect(() => {
    let cancelled = false;

    async function settleThenPrint() {
      // Wait for brand fonts so headings don't reflow after the dialog opens.
      try { await (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready; } catch { /* ignore */ }

      // Wait for every image to actually DECODE (ready to paint), not merely
      // "load". The hero banner is a large foreground <img>; printing the moment
      // it loads (before Safari has decoded/painted it) snapshots the page
      // mid-relayout and exports a blank page. img.decode() resolves only once
      // the image is decoded and paintable. Capped so we never hang on a slow or
      // broken image. Errors (e.g. a failed decode) are swallowed per-image.
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(
          imgs.map(async img => {
            try {
              if (typeof img.decode === "function") {
                await img.decode();
              } else if (!img.complete) {
                await new Promise<void>(res => {
                  img.addEventListener("load", () => res(), { once: true });
                  img.addEventListener("error", () => res(), { once: true });
                });
              }
            } catch { /* ignore: print with whatever decoded */ }
          }),
        ),
        new Promise<void>(res => setTimeout(res, 8000)),
      ]);

      // Decoded ≠ painted. Yield two animation frames so the browser commits a
      // paint of the now-decoded images before we take the print snapshot.
      await new Promise<void>(res => requestAnimationFrame(() => requestAnimationFrame(() => res())));

      if (!cancelled) window.print();
    }

    settleThenPrint();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: 260 }}>
      <button
        type="button"
        onClick={() => window.print()}
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
