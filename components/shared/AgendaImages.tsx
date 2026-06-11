"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// Activity photos render whole (never cropped) at their natural aspect ratio,
// capped to a medium height. The `agenda-photo` class lets the print page tighten
// the cap in @media print without touching this shared component.
const AGENDA_PHOTO_CLASS = "agenda-photo";
const photoStyle: React.CSSProperties = {
  display: "block", maxWidth: "100%", maxHeight: 360, width: "auto", height: "auto",
  objectFit: "contain", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f1f5f9",
  margin: "0 auto",
};

export default function AgendaImages({
  urls,
  size = 76,
  fullWidth = false,
  onRemove,
  print = false,
}: {
  urls: string[] | null | undefined;
  size?: number;
  // Full-width mode: a capped landscape preview (width 100%, height PREVIEW_H,
  // object-fit cover) that opens a lightbox on click. Used on the itinerary
  // display in the tour host view and all participant views. The default
  // (thumbnail grid) is kept for the upload/management UI in the editor.
  fullWidth?: boolean;
  onRemove?: (url: string) => void;
  // Print mode: static, eagerly-loaded plain <img> (no next/image optimizer,
  // no lazy-loading, no lightbox) so headless Chromium renders every photo
  // into the PDF regardless of where it falls on the page.
  print?: boolean;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  if (print) {
    // Static, eagerly-loaded whole images (no lightbox / interactivity).
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {urls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${url}-${i}`} className={AGENDA_PHOTO_CLASS} src={url} alt="Itinerary item photo" loading="eager" style={photoStyle} />
        ))}
      </div>
    );
  }

  if (fullWidth) {
    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {urls.map((url, i) => (
            // Center each photo; the inline-block wrapper shrinks to the image so
            // the remove "x" sits on the image corner, not the column edge.
            <div key={`${url}-${i}`} style={{ textAlign: "center" }}>
              <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  title="View full image"
                  style={{ display: "block", padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 10, maxWidth: "100%" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={AGENDA_PHOTO_CLASS} src={url} alt="Itinerary item photo" style={photoStyle} />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    title="Remove image"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(url); }}
                    style={{
                      position: "absolute", top: 8, right: 8, width: 24, height: 24,
                      borderRadius: "50%", background: "rgba(15,33,55,.75)", color: "#fff",
                      border: "none", cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      lineHeight: 1, boxShadow: "0 1px 4px rgba(0,0,0,.35)",
                    }}
                  >
                    <X size={13} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {lightboxIndex !== null && (
          <Lightbox urls={urls} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndex={setLightboxIndex} />
        )}
      </>
    );
  }

  // Thumbnail grid (upload/management UI).
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {urls.map((url, i) => (
        <div key={`${url}-${i}`} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", position: "relative", width: "100%", height: "100%",
              borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0",
              background: "#f1f5f9",
            }}
          >
            <Image src={url} alt="Itinerary item photo" fill sizes={`${size}px`} style={{ objectFit: "cover" }} />
          </a>
          {onRemove && (
            <button
              type="button"
              title="Remove image"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(url); }}
              style={{
                position: "absolute", top: -6, right: -6, width: 20, height: 20,
                borderRadius: "50%", background: "#ef4444", color: "#fff",
                border: "2px solid #fff", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, boxShadow: "0 1px 3px rgba(0,0,0,.3)",
              }}
            >
              <X size={11} strokeWidth={3} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────────
// Full-screen overlay (rendered to <body> via portal so no ancestor clips it):
// centered full image at natural proportions, dark backdrop that dismisses on
// click, close button, and prev/next + swipe + keyboard nav for multiple images.
function Lightbox({ urls, index, onClose, onIndex }: {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const count = urls.length;
  const go = useCallback((delta: number) => {
    onIndex(((index + delta) % count + count) % count);
  }, [index, count, onIndex]);

  // Lock background scroll for the lifetime of the lightbox (mount → unmount).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Keyboard nav (re-bound when the active index changes).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  if (typeof document === "undefined") return null;

  const navBtn: React.CSSProperties = {
    position: "fixed", top: "50%", transform: "translateY(-50%)",
    width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.15)",
    color: "#fff", border: "none", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.85)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[index]}
        alt="Itinerary item photo"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ maxWidth: "95vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 50px rgba(0,0,0,.5)" }}
      />

      <button
        type="button"
        title="Close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          position: "fixed", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,.15)", color: "#fff", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <X size={22} />
      </button>

      {count > 1 && (
        <>
          <button type="button" title="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ ...navBtn, left: 12 }}>
            <ChevronLeft size={26} />
          </button>
          <button type="button" title="Next" onClick={(e) => { e.stopPropagation(); go(1); }} style={{ ...navBtn, right: 12 }}>
            <ChevronRight size={26} />
          </button>
          <div style={{
            position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)",
            color: "#fff", fontSize: 13, fontWeight: 600, background: "rgba(0,0,0,.5)",
            borderRadius: 20, padding: "4px 12px",
          }}>
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
