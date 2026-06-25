"use client";

import Image from "next/image";
import BrandLockup from "@/components/shared/BrandLockup";
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
      {/* Lockup on the LEFT, tour info to its RIGHT, persona badge top-right.
          The info block uses minWidth:0 + flex:1 so a long tour name wraps
          cleanly (at spaces, overflow-wrap as a fallback) beside the lockup
          instead of overflowing or forcing the lockup to shrink. */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
          {print ? (
            // Print/PDF: keep the full lockup raster — live web fonts are unreliable
            // in Safari's window.print(), and raster sharpness is fine on paper.
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/infinity-lockup-light.png" alt="Infinity Tours + Events" style={{ height: 64, width: "auto", flexShrink: 0 }} />
          ) : (
            // On-screen: crisp mark PNG + live Fjalla One wordmark.
            <BrandLockup height={64} variant="light" />
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1.12, margin: "0 0 4px", overflowWrap: "break-word", textShadow }}>
              {tourName}
            </h1>
            {(tourDestination || tourDates) && (
              <div style={{ color: bannerUrl ? "#e2e8f0" : "#D1E8FF", fontSize: 13, lineHeight: 1.3, textShadow }}>
                {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <div style={bannerUrl
          ? { flexShrink: 0, background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }
          : { flexShrink: 0, background: badgeBg, color: badgeColor, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
          {badgeLabel}
        </div>
      </div>
    </div>
  );
}
