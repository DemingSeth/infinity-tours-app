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
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${HERO_PREFIX}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
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
