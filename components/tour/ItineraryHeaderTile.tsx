"use client";

import Image from "next/image";
import { BRAND, expandStateName, BANNER_OVERLAY_GRADIENT, BANNER_TEXT_SHADOW } from "@/lib/helpers";

// The dark navy / banner-photo header tile (logo, role badge, tour name,
// destination + dates). Shared by the participant/preview role view and the
// tour host's internal editing view so the banner is visible in both.
export default function ItineraryHeaderTile({
  tourName, tourDestination, tourDates, bannerUrl, focusX = 50, focusY = 50, badgeLabel, badgeBg, badgeColor, print = false,
}: {
  tourName: string;
  tourDestination?: string | null;
  tourDates?: string | null;
  bannerUrl?: string | null;
  focusX?: number;
  focusY?: number;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
  // Print mode renders plain eager <img> (no next/image optimizer) so headless
  // Chromium reliably loads the banner + logo when rasterizing the PDF.
  print?: boolean;
}) {
  const textShadow = bannerUrl ? BANNER_TEXT_SHADOW : undefined;
  // The INFINITY wordmark sits on dark navy / the photo scrim already, so it needs
  // far less shadow than the title — and a heavy blur hazes white-on-photo under
  // print-color-adjust:exact in the PDF. Keep it minimal.
  const wordmarkShadow = bannerUrl ? "0 1px 2px rgba(0,0,0,0.3)" : undefined;
  return (
    <div style={{ position: "relative", background: BRAND.navy, borderRadius: 12, padding: "20px 24px", marginBottom: 18, overflow: "hidden" }}>
      {/* Banner background photo + dark gradient overlay for text legibility */}
      {bannerUrl && (
        <>
          {print ? (
            // Print/PDF: paint the photo as a CSS background (with print-color-adjust:
            // exact) rather than an absolutely-positioned object-fit <img>, which
            // Chromium's print engine drops to PDF (same fix as the quote hero).
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${bannerUrl}')`, backgroundSize: "cover", backgroundPosition: `${focusX}% ${focusY}%`, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
          ) : (
            <Image src={bannerUrl} alt="" fill sizes="(max-width: 720px) 100vw, 680px" style={{ objectFit: "cover", objectPosition: `${focusX}% ${focusY}%` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: BANNER_OVERLAY_GRADIENT }} />
        </>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {print ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/infinity-mark-light.png" alt="Infinity Tours" style={{ height: 22, width: "auto" }} />
            ) : (
              <Image src="/infinity-mark-light.png" alt="Infinity Tours" width={0} height={0} sizes="80px" style={{ height: 22, width: "auto" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontWeight: 700, fontSize: 12, color: "#fff", letterSpacing: 0.5, textShadow: wordmarkShadow }}>INFINITY</span>
              <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 400, fontSize: 6, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>TOURS + EVENTS</span>
            </div>
          </div>
          <div style={bannerUrl
            ? { background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }
            : { background: badgeBg, color: badgeColor, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            {badgeLabel}
          </div>
        </div>
        <h1 style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px", textShadow }}>
          {tourName}
        </h1>
        {(tourDestination || tourDates) && (
          <div style={{ color: bannerUrl ? "#e2e8f0" : "#D1E8FF", fontSize: 13, textShadow }}>
            {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
