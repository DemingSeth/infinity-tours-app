"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import MapFileThumb, { isPdfUrl } from "@/components/shared/MapFileThumb";

// Activity photos render whole (never cropped) at their natural aspect ratio,
// capped to a medium height. The `agenda-photo` class lets the print page tighten
// the cap in @media print without touching this shared component.
const AGENDA_PHOTO_CLASS = "agenda-photo";

// Resizable photos (October 2026, Seth): hosts drag a photo's corner to make it
// bigger or smaller. The chosen height (px) is saved per photo URL in
// agenda_items.image_sizes; photos without one keep the standard 300px cap.
export const DEFAULT_PHOTO_H = 300;
const MIN_PHOTO_H = 100;
const MAX_PHOTO_H = 900;
const clampH = (h: number) => Math.round(Math.min(MAX_PHOTO_H, Math.max(MIN_PHOTO_H, h)));
const photoStyle: React.CSSProperties = {
  display: "block", maxWidth: "100%", maxHeight: 300, width: "auto", height: "auto",
  objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-3)",
  margin: "0 auto",
};

// Print-only compact thumbnails: small, left-aligned, whole image (no crop).
const printThumbStyle: React.CSSProperties = {
  display: "block", maxHeight: 80, maxWidth: 120, width: "auto", height: "auto",
  objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-3)",
};

export default function AgendaImages({
  urls,
  size = 76,
  fullWidth = false,
  onRemove,
  print = false,
  sizes,
  onResize,
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
  /** Saved display heights by photo URL (agenda_items.image_sizes). */
  sizes?: Record<string, number> | null;
  /** When set, each full-width photo gets a corner handle to resize it.
   *  Called with the new height, or null to go back to the standard size. */
  onResize?: (url: string, height: number | null) => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!urls || urls.length === 0) return null;

  // A PDF cannot be drawn in an <img>. Photos keep their normal rendering;
  // PDFs render as a tappable file chip (see MapFileThumb).
  const pdfUrls = urls.filter(isPdfUrl);
  const pdfRow = pdfUrls.length > 0 && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {pdfUrls.map((url, i) => (
        <div key={`${url}-${i}`} style={{ position: "relative" }}>
          <MapFileThumb url={url} print={print} width={Math.max(size, 96)} height={Math.max(size, 68)} borderColor="var(--border)" />
          {onRemove && !print && <RemoveDot onClick={() => onRemove(url)} />}
        </div>
      ))}
    </div>
  );
  urls = urls.filter(u => !isPdfUrl(u));
  if (urls.length === 0) return <>{pdfRow}</>;

  if (print) {
    // Static, eagerly-loaded whole images (no lightbox / interactivity).
    // Compact print thumbnails: a tight left-aligned row of small photos so the
    // itinerary stays dense on paper. Whole image (object-fit contain) so nothing
    // is cropped — just much smaller than the on-screen view.
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
        {urls.map((url, i) => (
          // No `agenda-photo` class here: the print page's @media rule caps that
          // class at 190px, which would override this inline thumbnail size.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${url}-${i}`} src={url} alt="Itinerary item photo" loading="eager" style={printThumbFor(sizes?.[url])} />
        ))}
        {pdfRow}
      </div>
    );
  }

  if (fullWidth) {
    return (
      <>
        {/* Photos sit side by side when they fit the column and wrap to the
            next line only when they are too wide (October 2026; they used to
            always stack). Each photo keeps its own size and stays centered. */}
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
          {urls.map((url, i) => (
            <ResizablePhoto
              key={`${url}-${i}`}
              url={url}
              height={sizes?.[url]}
              onOpen={() => setLightboxIndex(i)}
              onRemove={onRemove ? () => onRemove(url) : undefined}
              onResize={onResize ? (h) => onResize(url, h) : undefined}
            />
          ))}
        </div>

        {pdfRow}
        {lightboxIndex !== null && (
          <Lightbox urls={urls} index={lightboxIndex} onClose={() => setLightboxIndex(null)} onIndex={setLightboxIndex} />
        )}
      </>
    );
  }

  // Thumbnail grid (upload/management UI).
  return (
    <>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {urls.map((url, i) => (
        <div key={`${url}-${i}`} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", position: "relative", width: "100%", height: "100%",
              borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)",
              background: "var(--surface-3)",
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
                border: "2px solid var(--surface)", cursor: "pointer", padding: 0,
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
    {pdfRow}
    </>
  );
}

// Print thumbnails follow the on-screen size: a photo made bigger on screen
// prints a little bigger too, within reason, so the PDF stays compact.
function printThumbFor(h: number | undefined): React.CSSProperties {
  if (!h) return printThumbStyle;
  const scale = Math.min(2.2, Math.max(0.6, h / DEFAULT_PHOTO_H));
  return { ...printThumbStyle, maxHeight: Math.round(80 * scale), maxWidth: Math.round(120 * scale) };
}

function ResizablePhoto({ url, height, onOpen, onRemove, onResize }: {
  url: string;
  height: number | undefined;
  onOpen: () => void;
  onRemove?: () => void;
  onResize?: (h: number | null) => void;
}) {
  // Live height while dragging; the saved one otherwise.
  const [dragH, setDragH] = useState<number | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const start = useRef<{ x: number; y: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const h = dragH ?? height;
  // A sized photo: height h at its own proportions, never wider than the column.
  // Without a size, the standard cap (300px, smaller if the photo is smaller).
  // The wrapper carries the width so the "x" and the handle stay on the corners.
  const sizedW = h && aspect ? `min(${Math.round(h * aspect)}px, 100%)` : undefined;
  const style: React.CSSProperties = h
    ? { ...photoStyle, maxHeight: "none", height: aspect ? "auto" : h, width: aspect ? "100%" : "auto" }
    : photoStyle;

  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const shown = imgRef.current?.getBoundingClientRect().height ?? height ?? DEFAULT_PHOTO_H;
    start.current = { x: e.clientX, y: e.clientY, h: shown };
    setDragH(clampH(shown));
  }
  function onPointerMove(e: React.PointerEvent<HTMLSpanElement>) {
    const s0 = start.current;
    if (!s0) return;
    // The photo is centered, so a corner moves half as far as the width grows.
    // Blend the down and across movement so either direction works.
    const dy = e.clientY - s0.y;
    const dxAsH = aspect ? ((e.clientX - s0.x) * 2) / aspect : dy;
    setDragH(clampH(s0.h + (dy + dxAsH) / 2));
  }
  function onPointerUp(e: React.PointerEvent<HTMLSpanElement>) {
    if (!start.current) return;
    start.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (dragH !== null && onResize) onResize(dragH);
    setDragH(null);
  }

  const showHandle = !!onResize && (hover || dragH !== null);

  return (
    // The inline-block wrapper shrinks to the image so the remove "x" and the
    // resize handle sit on the image corners, not the column edge.
    <div
      style={{ position: "relative", display: "inline-block", maxWidth: "100%", minWidth: 0, flex: "0 1 auto", verticalAlign: "top", width: sizedW }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onOpen}
        title="View full image"
        style={{ display: "block", padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 10, maxWidth: "100%", width: sizedW ? "100%" : undefined, boxShadow: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          className={AGENDA_PHOTO_CLASS}
          src={url}
          alt="Itinerary item photo"
          onLoad={(e) => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setAspect(im.naturalWidth / im.naturalHeight); }}
          style={{ ...style, outline: dragH !== null ? "2px solid #5784E6" : undefined, outlineOffset: 2 }}
        />
      </button>
      {onRemove && (
        <button
          type="button"
          title="Remove image"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
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
      {onResize && (
        <span
          role="slider"
          aria-label="Resize photo"
          aria-valuemin={MIN_PHOTO_H}
          aria-valuemax={MAX_PHOTO_H}
          aria-valuenow={Math.round(h ?? DEFAULT_PHOTO_H)}
          tabIndex={0}
          title="Drag to resize. Double-click for the standard size."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => { e.stopPropagation(); onResize(null); }}
          onKeyDown={(e) => {
            const cur = Math.round(imgRef.current?.getBoundingClientRect().height ?? h ?? DEFAULT_PHOTO_H);
            if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); onResize(clampH(cur + 20)); }
            else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); onResize(clampH(cur - 20)); }
          }}
          style={{
            position: "absolute", right: -7, bottom: -7, width: 22, height: 22, borderRadius: 6,
            background: "#5784E6", border: "2px solid #fff", boxShadow: "0 1px 5px rgba(0,0,0,.35)",
            cursor: "nwse-resize", touchAction: "none", opacity: showHandle ? 1 : 0.55,
            display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity .15s",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M9 1 1 9M9 5 5 9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {dragH !== null && (
        <span style={{ position: "absolute", left: "50%", bottom: 10, transform: "translateX(-50%)", background: "rgba(11,25,87,.85)", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px", pointerEvents: "none" }}>
          {dragH}px tall
        </span>
      )}
    </div>
  );
}

function RemoveDot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Remove file"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute", top: -6, right: -6, width: 20, height: 20,
        borderRadius: "50%", background: "#ef4444", color: "#fff",
        border: "2px solid var(--surface)", cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        lineHeight: 1, boxShadow: "0 1px 3px rgba(0,0,0,.3)",
      }}
    >
      <X size={11} strokeWidth={3} />
    </button>
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
