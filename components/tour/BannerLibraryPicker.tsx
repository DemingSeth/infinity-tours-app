"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import { Modal, Btn } from "@/components/tour/ui";
import { tourPhotoMatcher, photoMatchesSearch, imageTags } from "@/lib/bannerTags";
import type { BannerImageLibraryRow } from "@/lib/types";

// How many photos "All photos" shows before "Show all": two rows at the
// desktop's three columns, three rows on a phone's two.
const COLLAPSED_COUNT = 6;

export default function BannerLibraryPicker({ tourDestination, tourName, currentUrl, onSelect, onClose }: {
  tourDestination?: string | null;
  tourName?: string | null;
  currentUrl?: string | null;
  onSelect: (url: string | null) => void;
  onClose: () => void;
}) {
  const [images, setImages] = useState<BannerImageLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(currentUrl ?? null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("banner_image_library").select("*").order("created_at", { ascending: false });
      if (active) { setImages((data ?? []) as BannerImageLibraryRow[]); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  // Suggested = photos tagged for this tour's place (by destination or name).
  // Everything else goes under All photos, with the tour's current banner
  // pulled to the front so it is never hidden behind "Show all".
  const { suggested, rest } = useMemo(() => {
    const matches = tourPhotoMatcher(tourDestination, tourName);
    const suggested = images.filter(matches);
    const rest = images.filter(img => !matches(img));
    const cur = rest.findIndex(img => img.url === currentUrl);
    if (cur > 0) rest.unshift(...rest.splice(cur, 1));
    return { suggested, rest };
  }, [images, tourDestination, tourName, currentUrl]);

  const searching = query.trim().length > 0;
  const results = searching ? images.filter(img => photoMatchesSearch(img, query)) : [];
  const visibleRest = showAll ? rest : rest.slice(0, COLLAPSED_COUNT);

  const tile = (img: BannerImageLibraryRow) => {
    const isSel = selected === img.url;
    const tags = imageTags(img);
    return (
      <button
        key={img.id}
        type="button"
        onClick={() => setSelected(img.url)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: `2px solid ${isSel ? BRAND.blue : "var(--border)"}`, background: "var(--surface-3)" }}>
          <Image src={img.url} alt={img.label} fill sizes="200px" style={{ objectFit: "cover" }} />
          {isSel && (
            <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: BRAND.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}>
              <Check size={14} strokeWidth={3} />
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginTop: 6, lineHeight: 1.3 }}>{img.label}</div>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
            {tags.map(t => (
              <span key={t} style={{ fontSize: 10, color: "var(--text-2)", background: "var(--border-soft)", borderRadius: 5, padding: "1px 6px" }}>{t}</span>
            ))}
          </div>
        )}
      </button>
    );
  };

  const sectionLabel = (text: string, count: number) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 10px" }}>
      {text} <span style={{ color: "var(--muted-2)", fontWeight: 600 }}>({count})</span>
    </div>
  );

  return (
    <Modal title="Choose Banner Image" onClose={onClose} wide>
      {/* Search, Select and Cancel stay pinned to the top of the dialog while
          the host scrolls the library (October 2026, Amy). Sticky against the
          modal overlay, which is the scroll container. */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface)", margin: "-8px -24px 16px", padding: "10px 24px", borderBottom: "1px solid var(--border-soft)", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 0 }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted-2)" }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); } }}
            placeholder="Search photos (e.g. beach, Boston)"
            style={{ width: "100%", boxSizing: "border-box", padding: "7px 28px 7px 28px", fontSize: 12.5, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontFamily: "inherit" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} title="Clear search"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 2, display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>
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
          No images in the library yet. An admin can add approved images from the Banner Library on Overview.
        </div>
      ) : searching ? (
        <>
          {sectionLabel("Search results", results.length)}
          {results.length === 0 ? (
            <div style={{ padding: "18px 0", color: "var(--muted-2)", fontSize: 13 }}>No photos match &ldquo;{query.trim()}&rdquo;.</div>
          ) : (
            <div className="banner-picker-grid">{results.map(tile)}</div>
          )}
        </>
      ) : (
        <>
          {suggested.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              {sectionLabel("Suggested for this tour", suggested.length)}
              <div className="banner-picker-grid">{suggested.map(tile)}</div>
            </div>
          )}
          {rest.length > 0 && (
            <>
              {sectionLabel(suggested.length > 0 ? "All other photos" : "All photos", rest.length)}
              <div className="banner-picker-grid">{visibleRest.map(tile)}</div>
              {rest.length > COLLAPSED_COUNT && (
                <div style={{ textAlign: "center", marginTop: 14 }}>
                  <Btn variant="muted" onClick={() => setShowAll(v => !v)}>
                    {showAll ? "Show fewer" : `Show all ${rest.length} photos`}
                  </Btn>
                </div>
              )}
            </>
          )}
        </>
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
