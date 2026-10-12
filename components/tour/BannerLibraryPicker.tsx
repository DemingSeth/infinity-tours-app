"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import { Modal, Btn } from "@/components/tour/ui";
import type { BannerImageLibraryRow } from "@/lib/types";

// Destination text is typed freely on both tours and library images, so the
// same place shows up as "New York, NY", "New York City, NY", "Brooklyn, NY",
// "Washington DC" vs "Washington D.C.", or "Anahiem". Match on a forgiving key:
// lowercase, punctuation dropped, a trailing "city" dropped, then a few known
// metro areas folded together (October 2026, Amy).
const METRO_ALIASES: Record<string, string> = {
  "new york": "nyc", "nyc": "nyc", "brooklyn": "nyc", "manhattan": "nyc", "queens": "nyc",
  "washington": "dc", "washington dc": "dc", "dc": "dc",
  "anaheim": "anaheim", "anahiem": "anaheim", "anaheim california": "anaheim",
  "disneyland": "anaheim", "los angeles": "anaheim", "southern california": "anaheim",
  "salt lake": "slc", "slc": "slc",
};

function placeKey(s: string | null | undefined): string {
  let city = (s ?? "").split(",")[0].toLowerCase().replace(/\./g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  city = city.replace(/ city$/, "").trim();
  return METRO_ALIASES[city] ?? city;
}

export default function BannerLibraryPicker({ tourDestination, currentUrl, onSelect, onClose }: {
  tourDestination?: string | null;
  currentUrl?: string | null;
  onSelect: (url: string | null) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<BannerImageLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(currentUrl ?? null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("banner_image_library").select("*").order("created_at", { ascending: false });
      if (active) { setImages((data ?? []) as BannerImageLibraryRow[]); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  // Matching-destination images first, then everything else.
  const tourCity = placeKey(tourDestination);
  const matches = (img: BannerImageLibraryRow) => !!tourCity && placeKey(img.destination) === tourCity;
  const ordered = [...images].sort((a, b) => Number(matches(b)) - Number(matches(a)));

  return (
    <Modal title="Choose Banner Image" onClose={onClose} wide>
      {/* Select / Cancel stay pinned to the top of the dialog while the host
          scrolls the library (October 2026, Amy: the library outgrew a button
          row at the bottom). Sticky against the modal overlay, which is the
          scroll container. */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)", margin: "-8px -24px 14px", padding: "10px 24px", borderBottom: "1px solid var(--border-soft)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--muted-2)", marginRight: "auto" }}>
          {selected ? "Photo selected" : "Pick a photo"}
        </span>
        {currentUrl && (
          <button
            type="button"
            onClick={() => { onSelect(null); onClose(); }}
            style={{ background: "none", border: "none", color: "var(--red-text)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
          >
            Remove Banner
          </button>
        )}
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { onSelect(selected); onClose(); }} disabled={!selected}>
          <Check size={13} />Select
        </Btn>
      </div>

      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted-2)", fontSize: 13 }}>Loading library…</div>
      ) : images.length === 0 ? (
        <div style={{ background: "var(--surface-2)", border: "2px dashed var(--border)", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 13 }}>
          No images in the library yet. An admin (Mike or Greta) can add approved images.
        </div>
      ) : (
        <div className="banner-picker-grid">
          {ordered.map(img => {
            const isSel = selected === img.url;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelected(img.url)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              >
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: `2px solid ${isSel ? BRAND.blue : "var(--border)"}`, background: "var(--surface-3)" }}>
                  <Image src={img.url} alt={img.label} fill sizes="200px" style={{ objectFit: "cover" }} />
                  {matches(img) && (
                    <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(46,196,182,.9)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 5, padding: "2px 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      Match
                    </span>
                  )}
                  {isSel && (
                    <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: BRAND.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginTop: 6, lineHeight: 1.3 }}>{img.label}</div>
                {img.destination && <div style={{ fontSize: 10.5, color: "var(--muted-2)", marginTop: 1 }}>{img.destination}</div>}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .banner-picker-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 560px) {
          .banner-picker-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </Modal>
  );
}
