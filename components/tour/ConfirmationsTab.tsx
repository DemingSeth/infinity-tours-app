"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, ImageIcon, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import TypeDot from "@/components/shared/TypeDot";
import type { AgendaDayWithItems, AgendaItemWithFeedback } from "@/lib/types";

// Reuse the existing agenda-images storage bucket for confirmation documents
// (public bucket, no MIME restriction — accepts both images and PDFs).
const STORAGE_BUCKET = "agenda-images";
const STORAGE_MARKER = `/${STORAGE_BUCKET}/`;

function storagePathFromUrl(url: string): string | null {
  const idx = url.indexOf(STORAGE_MARKER);
  return idx >= 0 ? decodeURIComponent(url.slice(idx + STORAGE_MARKER.length)) : null;
}

// Strip the "<timestamp>-" prefix we add at upload time for a friendlier label.
function fileLabel(url: string): string {
  const path = storagePathFromUrl(url) ?? url;
  const base = path.split("/").pop() ?? path;
  return decodeURIComponent(base).replace(/^\d+-/, "");
}

const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

interface Props {
  tourId: string;
  days: AgendaDayWithItems[];
  onDaysChange: (days: AgendaDayWithItems[]) => void;
  isOwner: boolean;
}

export default function ConfirmationsTab({ tourId, days, onDaysChange, isOwner }: Props) {
  const totalItems = days.reduce((n, d) => n + d.agenda_items.length, 0);
  const confirmed = days.reduce(
    (n, d) => n + d.agenda_items.filter(i => (i.confirmation_urls?.length ?? 0) > 0).length,
    0,
  );
  const unconfirmed = totalItems - confirmed;

  function patchItem(itemId: string, confirmation_urls: string[]) {
    onDaysChange(days.map(d => ({
      ...d,
      agenda_items: d.agenda_items.map(i => i.id === itemId ? { ...i, confirmation_urls } : i),
    })));
  }

  if (totalItems === 0) {
    return (
      <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
        No itinerary items yet. Add items on the Itinerary tab to start linking confirmations.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5 }}>Confirmed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", fontFamily: "'Cormorant Garamond',Georgia,serif" }}>{confirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5 }}>Unconfirmed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ea580c", fontFamily: "'Cormorant Garamond',Georgia,serif" }}>{unconfirmed}</div>
        </div>
      </div>

      {days.map(day => (
        <div key={day.id} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: BRAND.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontWeight: 700, fontSize: 14 }}>Day {day.day_number}</span>
            <span style={{ color: "#7dd3d8", fontSize: 12 }}>{day.date}</span>
          </div>
          {day.agenda_items.length === 0 ? (
            <div style={{ color: "#cbd5e1", fontSize: 12, padding: "12px 16px" }}>No items</div>
          ) : (
            day.agenda_items.map((item, idx) => (
              <ConfirmationRow
                key={item.id}
                tourId={tourId}
                item={item}
                isOwner={isOwner}
                topBorder={idx > 0}
                onChange={urls => patchItem(item.id, urls)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function ConfirmationRow({ tourId, item, isOwner, topBorder, onChange }: {
  tourId: string;
  item: AgendaItemWithFeedback;
  isOwner: boolean;
  topBorder: boolean;
  onChange: (urls: string[]) => void;
}) {
  const urls = item.confirmation_urls ?? [];
  const linked = urls.length > 0;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${tourId}/${item.id}/confirmations/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) { console.error("Confirmation upload failed", error.message); continue; }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if (data?.publicUrl) added.push(data.publicUrl);
    }
    if (added.length) {
      const next = [...urls, ...added];
      await supabase.from("agenda_items").update({ confirmation_urls: next }).eq("id", item.id);
      onChange(next);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeFile(url: string) {
    const next = urls.filter(u => u !== url);
    const supabase = createClient();
    await supabase.from("agenda_items").update({ confirmation_urls: next }).eq("id", item.id);
    onChange(next);
    const path = storagePathFromUrl(url);
    if (path) { try { await supabase.storage.from(STORAGE_BUCKET).remove([path]); } catch {} }
  }

  return (
    <div style={{ padding: "12px 16px", borderTop: topBorder ? "1px solid #f1f5f9" : undefined, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0, paddingTop: 4, textAlign: "right" }}>
        {item.time || "-"}
      </div>
      <TypeDot type={item.type} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
          <ConfirmationStatus linked={linked} />
        </div>

        {/* Linked confirmation files */}
        {linked && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {urls.map(url => (
              <span key={url} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 8px", fontSize: 11, maxWidth: 240 }}>
                {isPdf(url) ? <FileText size={13} color="#dc2626" style={{ flexShrink: 0 }} /> : <ImageIcon size={13} color="#0891b2" style={{ flexShrink: 0 }} />}
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

        {/* Upload field — accepts both images and PDFs */}
        {isOwner && (
          <>
            <input ref={inputRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
              onChange={e => handleFiles(e.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1.5px dashed #cbd5e1", background: "#fff", cursor: uploading ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}>
              <Upload size={14} />{uploading ? "Uploading..." : "Upload Confirmation (PDF or image)"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Shared status indicator: green check when linked, orange dot when not.
export function ConfirmationStatus({ linked, size = 14 }: { linked: boolean; size?: number }) {
  if (linked) {
    return (
      <span title="Confirmation linked" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontSize: 11, fontWeight: 700 }}>
        <CheckCircle2 size={size} />Confirmed
      </span>
    );
  }
  return (
    <span title="No confirmation linked" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#ea580c", fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: size - 6, height: size - 6, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />Unconfirmed
    </span>
  );
}
