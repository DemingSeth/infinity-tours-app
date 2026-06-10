"use client";

import { useRef, useState, useCallback } from "react";
import { BRAND } from "@/lib/helpers";

// Draggable focal-point selector. Shows the image at natural proportions
// (capped height) with a rule-of-thirds grid and a draggable white crosshair.
// Reports the focal point as percentages (0–100) across/down the image.
export default function FocalPointPicker({ imageUrl, x, y, onChange }: {
  imageUrl: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const update = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
    const ny = Math.round(Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100)));
    onChange(nx, ny);
  }, [onChange]);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); update(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (dragging) update(e.clientX, e.clientY); }}
      onPointerUp={(e) => { setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ } }}
      style={{
        position: "relative", display: "inline-block", maxWidth: "100%", lineHeight: 0,
        borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9",
        cursor: "crosshair", touchAction: "none", userSelect: "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Banner focus"
        draggable={false}
        style={{ display: "block", maxHeight: 300, maxWidth: "100%", width: "auto", height: "auto", pointerEvents: "none" }}
      />
      {/* Rule-of-thirds grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
        backgroundSize: "33.333% 33.333%",
      }} />
      {/* Focal indicator */}
      <div style={{
        position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
        width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,0.92)",
        border: "2px solid #fff", boxShadow: "0 1px 6px rgba(0,0,0,0.55)", pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND.navy }} />
      </div>
    </div>
  );
}
