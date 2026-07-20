"use client";

// ════════════════════════════════════════════════════════════════════════════
// Shared item-confirmation logic + UI.
//
// An itinerary item's confirmation lives ENTIRELY on the agenda_items row:
//   - confirmation_urls: string[]      (uploaded PDF/image public URLs)
//   - confirmation_not_required: bool  ("no confirmation needed")
// There is no separate per-item confirmation table, so the Confirmations page
// (ConfirmationsTab) and the item edit modal (AgendaTab → ItemForm) both read
// and write the SAME record. Editing in one is reflected in the other.
//
// Files are stored in the public `agenda-images` bucket under
// agenda-images/[tourId]/[itemId]/confirmations/. Bucket + permissions are
// unchanged here — this module just centralizes the existing upload mechanism.
// ════════════════════════════════════════════════════════════════════════════

import { useRef, useState } from "react";
import { CheckCircle2, FileText, ImageIcon, Link as LinkIcon, MinusCircle, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";

// Reuse the existing agenda-images storage bucket for confirmation documents
// (public bucket, no MIME restriction — accepts both images and PDFs).
const STORAGE_BUCKET = "agenda-images";
const STORAGE_MARKER = `/${STORAGE_BUCKET}/`;

export function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + STORAGE_MARKER.length)) : null;
}

// An external confirmation LINK (e.g. Google Drive) rather than an uploaded file.
export const isExternalLink = (url: string) => url.indexOf(STORAGE_MARKER) === -1;

// Ensure http(s) prefix so hrefs never resolve relative to the app.
export const externalHref = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Strip the "<timestamp>-" prefix we add at upload time for a friendlier label.
// External links label as their hostname (e.g. "drive.google.com").
export function fileLabel(url: string): string {
  if (isExternalLink(url)) {
    try { return new URL(externalHref(url)).hostname.replace(/^www\./, ""); } catch { return url; }
  }
  const path = storagePathFromUrl(url) ?? url;
  const base = path.split("/").pop() ?? path;
  return decodeURIComponent(base).replace(/^\d+-/, "");
}

export const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

export type ConfirmationPatch = {
  confirmation_urls?: string[];
  confirmation_not_required?: boolean;
};

// Shared upload/remove/toggle logic for a single item's confirmation. Each
// action writes the agenda_items row immediately, then calls onPatch so the
// caller can reflect the change in its local state (both entry points share
// the same record this way).
export function useItemConfirmation({ tourId, itemId, urls, onPatch }: {
  tourId: string;
  itemId: string;
  urls: string[];
  onPatch: (patch: ConfirmationPatch) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist the confirmation_urls list — and SURFACE failures. An RLS denial
  // (e.g. a consultant editing a tour they don't own) returns zero updated rows
  // with no error; before this check the upload looked successful, then silently
  // vanished on refresh ("for some consultants nothing uploads").
  async function persistUrls(next: string[]): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase.from("agenda_items")
      .update({ confirmation_urls: next }).eq("id", itemId).select("id");
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.confirmation_urls] save failed", error?.message);
      if (typeof window !== "undefined") {
        window.alert(
          error?.message
            ? `Could not save the confirmation: ${error.message}`
            : "Could not save the confirmation. Only the tour's owner can attach confirmations — if this isn't your tour, ask the owning consultant to upload it.",
        );
      }
      return false;
    }
    return true;
  }

  async function toggleNotRequired(next: boolean) {
    const { data, error } = await createClient().from("agenda_items")
      .update({ confirmation_not_required: next }).eq("id", itemId).select("id");
    if (error || !data || data.length === 0) {
      console.error("[agenda_items.confirmation_not_required] save failed", error?.message);
      if (typeof window !== "undefined") {
        window.alert("Could not update this item. Only the tour's owner can change confirmations.");
      }
      return;
    }
    onPatch({ confirmation_not_required: next });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tourId}/${itemId}/confirmations/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        console.error("Confirmation upload failed", error.message);
        failures.push(`${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) added.push(data.publicUrl);
    }
    if (failures.length && typeof window !== "undefined") {
      window.alert(`Some files did not upload:\n${failures.join("\n")}\n\nTip: files over ~50MB are too large — compress the PDF or attach a link instead.`);
    }
    if (added.length) {
      const next = [...urls, ...added];
      if (await persistUrls(next)) onPatch({ confirmation_urls: next });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Attach an external link (e.g. a Google Drive URL) as a confirmation.
  async function addLink(rawUrl: string): Promise<boolean> {
    const url = rawUrl.trim();
    if (!url) return false;
    const next = [...urls, externalHref(url)];
    const ok = await persistUrls(next);
    if (ok) onPatch({ confirmation_urls: next });
    return ok;
  }

  async function removeFile(url: string) {
    const next = urls.filter(u => u !== url);
    if (!(await persistUrls(next))) return;
    onPatch({ confirmation_urls: next });
    const path = storagePathFromUrl(url);
    if (path) { try { await createClient().storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
  }

  return { uploading, inputRef, handleFiles, addLink, removeFile, toggleNotRequired };
}

// Shared status indicator: green check when a confirmation is linked, a neutral
// gray "N/A" when the host marked it as not required, otherwise orange
// "Unconfirmed".
export function ConfirmationStatus({ linked, notRequired, size = 14 }: {
  linked: boolean; notRequired?: boolean; size?: number;
}) {
  if (linked) {
    return (
      <span title="Confirmation linked" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 11, fontWeight: 700 }}>
        <CheckCircle2 size={size} />Confirmed
      </span>
    );
  }
  if (notRequired) {
    return (
      <span title="No confirmation needed for this item" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 11, fontWeight: 700 }}>
        <MinusCircle size={size} />N/A
      </span>
    );
  }
  return (
    <span title="No confirmation linked" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#ea580c", fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: size - 6, height: size - 6, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />Unconfirmed
    </span>
  );
}

// Small inline checkbox (host-only) for marking an item as not needing a
// confirmation. Shown next to the "Unconfirmed"/"N/A" indicator.
export function NoConfirmationToggle({ checked, onChange }: {
  checked: boolean; onChange: (next: boolean) => void;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: BRAND.navy, width: 13, height: 13, cursor: "pointer" }} />
      No confirmation needed
    </label>
  );
}

// Compact, read-only chips for already-attached confirmation files. Used to show
// confirmations inline (e.g. itinerary rows) without any upload/edit chrome.
export function ConfirmationFileChips({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <>
      {urls.map(url => (
        <a key={url} href={url} target="_blank" rel="noreferrer" title={fileLabel(url)}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#15803d", textDecoration: "none", maxWidth: 200 }}>
          {isExternalLink(url) ? <LinkIcon size={12} style={{ flexShrink: 0 }} /> : isPdf(url) ? <FileText size={12} style={{ flexShrink: 0 }} /> : <ImageIcon size={12} style={{ flexShrink: 0 }} />}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileLabel(url)}</span>
        </a>
      ))}
    </>
  );
}

// Full confirmation control: status, "no confirmation needed" toggle, linked
// files (with remove), and an upload button. Reads/writes the same agenda_items
// record from anywhere it's mounted (Confirmations page and item edit modal).
export default function ItemConfirmationControl({ tourId, itemId, urls, notRequired, isOwner = true, onPatch }: {
  tourId: string;
  itemId: string;
  urls: string[];
  notRequired: boolean;
  isOwner?: boolean;
  onPatch: (patch: ConfirmationPatch) => void;
}) {
  const linked = urls.length > 0;
  const { uploading, inputRef, handleFiles, addLink, removeFile, toggleNotRequired } =
    useItemConfirmation({ tourId, itemId, urls, onPatch });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkVal, setLinkVal] = useState("");

  async function submitLink() {
    if (await addLink(linkVal)) { setLinkVal(""); setLinkOpen(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <ConfirmationStatus linked={linked} notRequired={notRequired} />
        {isOwner && !linked && (
          <NoConfirmationToggle checked={notRequired} onChange={toggleNotRequired} />
        )}
      </div>

      {/* Linked confirmation files */}
      {linked && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {urls.map(url => (
            <span key={url} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 8px", fontSize: 11, maxWidth: 240 }}>
              {isExternalLink(url) ? <LinkIcon size={13} color="#0369a1" style={{ flexShrink: 0 }} /> : isPdf(url) ? <FileText size={13} color="#dc2626" style={{ flexShrink: 0 }} /> : <ImageIcon size={13} color="#0891b2" style={{ flexShrink: 0 }} />}
              <a href={url} target="_blank" rel="noreferrer" style={{ color: "#1e293b", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fileLabel(url)}
              </a>
              {isOwner && (
                <button type="button" title="Remove confirmation" onClick={() => removeFile(url)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, lineHeight: 0, flexShrink: 0 }}>
                  <X size={12} strokeWidth={3} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Upload a file (image/PDF) — or attach an external link (e.g. Google Drive). */}
      {isOwner && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input ref={inputRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
            onChange={e => handleFiles(e.target.files)} />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#fff", cursor: uploading ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
            <Upload size={14} />{uploading ? "Uploading..." : linked ? "Add Another (PDF or image)" : "Upload Confirmation (PDF or image)"}
          </button>
          {linkOpen ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input autoFocus value={linkVal} placeholder="Paste link (e.g. Google Drive)"
                onChange={e => setLinkVal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitLink(); if (e.key === "Escape") { setLinkOpen(false); setLinkVal(""); } }}
                style={{ border: "1px solid #cbd5e1", borderRadius: 7, padding: "6px 9px", fontSize: 12, fontFamily: "inherit", width: 220 }} />
              <button type="button" onClick={submitLink}
                style={{ background: BRAND.blue, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Save
              </button>
              <button type="button" onClick={() => { setLinkOpen(false); setLinkVal(""); }}
                style={{ background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" title="Attach a link instead of a file (e.g. your Google Drive)"
              onClick={() => setLinkOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit" }}>
              <LinkIcon size={13} />Attach Link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
