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

      if (!cancelled) window.print();
    }

    settleThenPrint();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="no-print" style={{ position: "fixed", top: 12, right: 12, zIndex: 1000 }}>
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
    </div>
  );
}
