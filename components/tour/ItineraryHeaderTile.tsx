"use client";

import Image from "next/image";
import { BRAND, expandStateName } from "@/lib/helpers";

// The dark navy / banner-photo header tile (logo, role badge, tour name,
// destination + dates). Shared by the participant/preview role view and the
// tour host's internal editing view so the banner is visible in both.
export default function ItineraryHeaderTile({
  tourName, tourDestination, tourDates, bannerUrl, focusX = 50, focusY = 50, badgeLabel, badgeBg, badgeColor,
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
}) {
  const textShadow = bannerUrl ? "0 1px 6px rgba(0,0,0,0.75)" : undefined;
  return (
    <div style={{ position: "relative", background: BRAND.navy, borderRadius: 12, padding: "20px 24px", marginBottom: 18, overflow: "hidden" }}>
      {/* Banner background photo + dark gradient overlay for text legibility */}
      {bannerUrl && (
        <>
          <Image src={bannerUrl} alt="" fill sizes="(max-width: 720px) 100vw, 680px" style={{ objectFit: "cover", objectPosition: `${focusX}% ${focusY}%` }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.10), rgba(0,0,0,0.45))" }} />
        </>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/infinity-logo.png" alt="Infinity Tours" width={0} height={0} sizes="80px" style={{ height: 22, width: "auto" }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 12, color: "#fff", letterSpacing: 0.5, textShadow }}>INFINITY</span>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, fontSize: 6, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>TOURS + EVENTS</span>
            </div>
          </div>
          <div style={bannerUrl
            ? { background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }
            : { background: badgeBg, color: badgeColor, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            {badgeLabel}
          </div>
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px", textShadow }}>
          {tourName}
        </h1>
        {(tourDestination || tourDates) && (
          <div style={{ color: bannerUrl ? "#e2e8f0" : "#7dd3d8", fontSize: 13, textShadow }}>
            {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
