"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Trash2, X, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { I, Inp, Btn } from "@/components/tour/ui";
import { imageTags } from "@/lib/bannerTags";
import type { BannerImageLibraryRow } from "@/lib/types";

// Place tags on a library photo (October 2026, Amy): several per photo, e.g.
// Disneyland, Anaheim, Southern California. The banner picker suggests a photo
// when a tag matches the tour's destination or name. Type a tag and press
// Enter or a comma; the x on a chip removes it.
function cleanTags(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.replace(/\s+/g, " ").trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const commit = (text: string) => {
    const parts = text.split(",");
    if (parts.some(p => p.trim())) onChange(cleanTags([...tags, ...parts]));
    setDraft("");
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 6px", background: "var(--surface)", minHeight: 34 }}>
      {tags.map(t => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-2)", background: "var(--border-soft)", borderRadius: 5, padding: "2px 4px 2px 7px" }}>
          {t}
          <button type="button" title={`Remove ${t}`} onClick={() => onChange(tags.filter(x => x !== t))}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)", padding: 0, display: "flex" }}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={e => { const v = e.target.value; if (v.includes(",")) commit(v); else setDraft(v); }}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); commit(draft); }
          else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => { if (draft.trim()) commit(draft); }}
        placeholder={tags.length ? "Add another" : placeholder}
        style={{ flex: "1 1 120px", minWidth: 90, border: "none", outline: "none", background: "transparent", fontSize: 12.5, color: "var(--text)", fontFamily: "inherit", padding: "3px 2px" }}
      />
    </div>
  );
}

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
  const [tags, setTags] = useState<string[]>([]);
  // Tag editing on an existing photo: which one is open, and its draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    // Label is required — banner_image_library.label is NOT NULL. Block the
    // submit and say why (rather than silently disabling the button).
    if (!file) { setError("Choose an image file to add."); return; }
    if (!label.trim()) { setError("Label is required."); return; }
    if (busy) return;

    setBusy(true);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safe}`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setBusy(false);
      return;
    }

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    // The library ROW is the source of truth for the picker. Do not treat the
    // upload as success on its own: insert the row and surface any error. If the
    // insert fails, roll back the just-uploaded object so we never leave a stored
    // image with no matching row (the exact broken state this bug produced).
    const { data: row, error: insErr } = await supabase
      .from("banner_image_library")
      .insert({
        url: pub.publicUrl,
        label: label.trim(),
        tags,
        destination: tags[0] ?? null,
        uploaded_by: currentHostId,
      })
      .select()
      .single();

    if (insErr || !row) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]).catch(() => {});
      setError(`Could not save to the library: ${insErr?.message ?? "no row was created"}`);
      setBusy(false);
      return;
    }

    setImages(prev => [row as BannerImageLibraryRow, ...prev]);
    setFile(null); setLabel(""); setTags([]); setError(null); setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveTags(img: BannerImageLibraryRow) {
    if (savingTags) return;
    setSavingTags(true);
    const next = cleanTags(editTags);
    const supabase = createClient();
    // Confirm a row actually changed: a write RLS refuses returns no error.
    const { data, error } = await supabase
      .from("banner_image_library")
      .update({ tags: next, destination: next[0] ?? null })
      .eq("id", img.id)
      .select("id");
    setSavingTags(false);
    if (error || !data || data.length === 0) {
      window.alert(`Could not save the tags: ${error?.message ?? "no row updated (only admins can edit the library)"}`);
      return;
    }
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, tags: next, destination: next[0] ?? null } : i));
    setEditingId(null);
  }

  async function remove(img: BannerImageLibraryRow) {
    if (!window.confirm(`Delete "${img.label}" from the library?`)) return;
    const supabase = createClient();
    // Only delete the file once the library row is really gone, or a refused
    // delete would leave a library entry pointing at a missing image.
    const { data, error } = await supabase.from("banner_image_library").delete().eq("id", img.id).select("id");
    if (error || !data || data.length === 0) {
      console.error("[banner_image_library.delete] failed", error);
      window.alert(`Could not delete the image: ${error?.message ?? "no row removed (permission?)"}`);
      return;
    }
    setImages(prev => prev.filter(i => i.id !== img.id));
    const p = storagePathFromUrl(img.url);
    if (p) { try { await supabase.storage.from(STORAGE_BUCKET).remove([p]); } catch { /* ignore */ } }
  }

  return (
    <div>
      {/* Add form */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", marginBottom: 8 }}>Add to Library</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <Btn variant="muted" onClick={() => inputRef.current?.click()}><I n="upload" s={13} />{file ? "Change Image" : "Choose Image"}</Btn>
          {file && <span style={{ fontSize: 11, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Inp value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Anaheim - Convention Center)" style={{ flex: "1 1 220px" }} />
        </div>
        <div style={{ marginTop: 8 }}>
          <TagInput tags={tags} onChange={setTags} placeholder="Location tags (e.g. Disneyland, Anaheim, Southern California)" />
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4, lineHeight: 1.4 }}>
            Tours whose destination or name mentions one of these tags get this photo as a suggestion.
          </div>
        </div>
        {error && (
          <div style={{ marginTop: 8, background: "var(--red-bg)", color: "var(--red-text)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, lineHeight: 1.45 }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <Btn onClick={add} disabled={busy}><I n="plus" s={13} />{busy ? "Adding…" : "Add to Library"}</Btn>
        </div>
      </div>

      {/* Library grid */}
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--muted-2)" }}>Loading…</div>
      ) : images.length === 0 ? (
        <div style={{ background: "var(--surface-2)", border: "2px dashed var(--border)", borderRadius: 10, padding: "24px 16px", textAlign: "center", color: "var(--muted-2)", fontSize: 12 }}>
          No images in the library yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {images.map(img => (
            <div key={img.id}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface-3)" }}>
                <Image src={img.url} alt={img.label} fill sizes="200px" style={{ objectFit: "cover" }} />
                <button
                  type="button" title="Delete from library" onClick={() => remove(img)}
                  style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "rgba(185,28,28,.9)", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginTop: 6, lineHeight: 1.3 }}>{img.label}</div>
              {editingId === img.id ? (
                <div style={{ marginTop: 5 }}>
                  <TagInput tags={editTags} onChange={setEditTags} placeholder="Add a tag" />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn onClick={() => saveTags(img)} disabled={savingTags}>{savingTags ? "Saving…" : "Save"}</Btn>
                    <Btn variant="muted" onClick={() => setEditingId(null)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center", marginTop: 3 }}>
                  {imageTags(img).map(t => (
                    <span key={t} style={{ fontSize: 10, color: "var(--text-2)", background: "var(--border-soft)", borderRadius: 5, padding: "1px 6px" }}>{t}</span>
                  ))}
                  <button type="button" onClick={() => { setEditingId(img.id); setEditTags(imageTags(img)); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 10.5, fontWeight: 600, padding: "1px 2px", fontFamily: "inherit" }}>
                    <Tag size={11} />{imageTags(img).length ? "Edit tags" : "Add tags"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
