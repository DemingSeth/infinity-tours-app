"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import { I, Inp, Btn } from "@/components/tour/ui";
import type { BannerImageLibraryRow } from "@/lib/types";

const STORAGE_BUCKET = "banner-images";
const STORAGE_MARKER = `/${STORAGE_BUCKET}/`;
function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + STORAGE_MARKER.length)) : null;
}

// Admin-only management of the shared banner image library (add + delete).
export default function BannerLibraryManager({ currentHostId }: { currentHostId: string }) {
  const [images, setImages] = useState<BannerImageLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("banner_image_library").select("*").order("created_at", { ascending: false });
      if (active) { setImages((data ?? []) as BannerImageLibraryRow[]); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  async function add() {
    if (!file || !label.trim() || busy) return;
    setBusy(true);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { console.error("Banner library upload failed", upErr.message); setBusy(false); return; }
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const { data: row, error } = await supabase
      .from("banner_image_library")
      .insert({ url: pub.publicUrl, label: label.trim(), destination: destination.trim() || null, uploaded_by: currentHostId })
      .select().single();
    if (error) { console.error("Banner library insert failed", error.message); }
    else if (row) setImages(prev => [row as BannerImageLibraryRow, ...prev]);
    setFile(null); setLabel(""); setDestination(""); setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(img: BannerImageLibraryRow) {
    if (!window.confirm(`Delete "${img.label}" from the library?`)) return;
    const supabase = createClient();
    await supabase.from("banner_image_library").delete().eq("id", img.id);
    setImages(prev => prev.filter(i => i.id !== img.id));
    const p = storagePathFromUrl(img.url);
    if (p) { try { await supabase.storage.from(STORAGE_BUCKET).remove([p]); } catch { /* ignore */ } }
  }

  return (
    <div>
      {/* Add form */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Add to Library</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <Btn variant="muted" onClick={() => inputRef.current?.click()}><I n="upload" s={13} />{file ? "Change Image" : "Choose Image"}</Btn>
          {file && <span style={{ fontSize: 11, color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Inp value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Anaheim - Convention Center)" style={{ flex: "1 1 220px" }} />
          <Inp value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination tag (e.g. Anaheim, CA)" style={{ flex: "1 1 160px" }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Btn onClick={add} disabled={!file || !label.trim() || busy}><I n="plus" s={13} />{busy ? "Adding…" : "Add to Library"}</Btn>
        </div>
      </div>

      {/* Library grid */}
      {loading ? (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</div>
      ) : images.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          No images in the library yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {images.map(img => (
            <div key={img.id}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9" }}>
                <Image src={img.url} alt={img.label} fill sizes="200px" style={{ objectFit: "cover" }} />
                <button
                  type="button" title="Delete from library" onClick={() => remove(img)}
                  style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(185,28,28,.9)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: BRAND.navy, marginTop: 6, lineHeight: 1.3 }}>{img.label}</div>
              {img.destination && (
                <span style={{ display: "inline-block", fontSize: 10, color: "#475569", background: "#eef2f7", borderRadius: 5, padding: "1px 6px", marginTop: 3 }}>{img.destination}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
