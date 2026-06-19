"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Interim hero control with a deliberately narrow interface so it can later be
// swapped for a shared "pick from approved library" picker without touching
// QuoteDocument: it only reads `heroPhotoUrl` and emits `onChange(ref)`.
//
// Uploads land in the existing public `banner-images` bucket under a
// `quote-heroes/` prefix (additive — the curated banner library is untouched).
// See supabase/20260618_quote_heroes_storage.sql for the prefix-scoped policy.
const STORAGE_BUCKET = "banner-images";
const HERO_PREFIX = "quote-heroes";

// Hero photos only need to fill an 816px-wide band, so full camera resolution
// (e.g. 6912x3456) bloats the saved PDF. Downscale in the browser so the
// longest edge is at most ~2000px and re-encode as JPEG before upload.
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

async function downscaleToJpeg(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image decode failed"));
    i.src = dataUrl;
  });
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas context");
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) throw new Error("JPEG encode failed");
  return blob;
}

const btn: React.CSSProperties = {
  fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
  fontWeight: 500,
  fontSize: 11,
  letterSpacing: ".6px",
  textTransform: "uppercase",
  borderRadius: 6,
  padding: "8px 13px",
  cursor: "pointer",
  boxShadow: "0 2px 10px rgba(0,0,0,.14)",
};

export default function QuoteHeroPicker({
  heroPhotoUrl,
  onChange,
}: {
  heroPhotoUrl: string;
  onChange: (ref: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const supabase = createClient();

      // Downscale + re-encode to JPEG; fall back to the original on any failure
      // so uploads never break on an unusual image.
      let body: Blob = file;
      try {
        body = await downscaleToJpeg(file);
      } catch (err) {
        console.warn("Hero downscale failed; uploading original", err);
        body = file;
      }

      const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_") || "hero";
      const ext = body.type === "image/jpeg" ? "jpg" : (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "img");
      const path = `${HERO_PREFIX}/${Date.now()}-${base}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, body, { cacheControl: "3600", upsert: false, contentType: body.type || undefined });
      if (upErr) {
        console.error("Quote hero upload failed", upErr.message);
        alert("Could not upload that image.");
        return;
      }
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      onChange(pub.publicUrl);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{ ...btn, color: "#3a93a0", background: "rgba(255,255,255,0.94)", border: "1px solid #cfe3e6" }}
      >
        {busy ? "Uploading…" : heroPhotoUrl ? "Replace photo" : "Add photo"}
      </button>
      {heroPhotoUrl && (
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={busy}
          style={{ ...btn, color: "#9a6b5e", background: "rgba(255,255,255,0.94)", border: "1px solid #e6d3cf" }}
        >
          Remove photo
        </button>
      )}
    </>
  );
}
