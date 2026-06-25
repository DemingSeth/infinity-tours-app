"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import { Modal, Btn } from "@/components/tour/ui";
import type { BannerImageLibraryRow } from "@/lib/types";

const cityOf = (s: string | null | undefined) => (s ?? "").split(",")[0].trim().toLowerCase();

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
  const tourCity = cityOf(tourDestination);
  const matches = (img: BannerImageLibraryRow) => !!tourCity && cityOf(img.destination) === tourCity;
  const ordered = [...images].sort((a, b) => Number(matches(b)) - Number(matches(a)));

  return (
    <Modal title="Choose Banner Image" onClose={onClose} wide>
      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading library…</div>
      ) : images.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
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
                <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: `2px solid ${isSel ? BRAND.blue : "#e2e8f0"}`, background: "#f1f5f9" }}>
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
                <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy, marginTop: 6, lineHeight: 1.3 }}>{img.label}</div>
                {img.destination && <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 1 }}>{img.destination}</div>}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 20, flexWrap: "wrap" }}>
        <Btn onClick={() => { onSelect(selected); onClose(); }} disabled={!selected}>
          <Check size={13} />Select
        </Btn>
        <Btn variant="muted" onClick={onClose}>Cancel</Btn>
        {currentUrl && (
          <button
            type="button"
            onClick={() => { onSelect(null); onClose(); }}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
          >
            Remove Banner
          </button>
        )}
      </div>

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
