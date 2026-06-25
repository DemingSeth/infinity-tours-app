"use client";

import { FileText, ImageIcon, Upload, X } from "lucide-react";
import { BRAND } from "@/lib/helpers";
import TypeDot from "@/components/shared/TypeDot";
import {
  ConfirmationStatus, NoConfirmationToggle, useItemConfirmation, fileLabel, isPdf,
} from "@/components/tour/itemConfirmation";
import type { AgendaDayWithItems, AgendaItemWithFeedback } from "@/lib/types";

interface Props {
  tourId: string;
  days: AgendaDayWithItems[];
  onDaysChange: (days: AgendaDayWithItems[]) => void;
  isOwner: boolean;
}

export default function ConfirmationsTab({ tourId, days, onDaysChange, isOwner }: Props) {
  const allItems = days.flatMap(d => d.agenda_items);
  const confirmed = allItems.filter(i => (i.confirmation_urls?.length ?? 0) > 0).length;
  const notRequired = allItems.filter(i => !(i.confirmation_urls?.length) && i.confirmation_not_required).length;
  // Only genuinely outstanding items — excludes those marked "no confirmation required".
  const unconfirmed = allItems.length - confirmed - notRequired;

  function patchItem(itemId: string, patch: Partial<AgendaItemWithFeedback>) {
    onDaysChange(days.map(d => ({
      ...d,
      agenda_items: d.agenda_items.map(i => i.id === itemId ? { ...i, ...patch } : i),
    })));
  }

  if (allItems.length === 0) {
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
          <div style={{ fontSize: 24, fontWeight: 800, color: "#16a34a", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{confirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5 }}>Unconfirmed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ea580c", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{unconfirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>No Confirmation Needed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#64748b", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{notRequired}</div>
        </div>
      </div>

      {days.map(day => (
        <div key={day.id} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: BRAND.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.025em", color: "#fff", fontWeight: 700, fontSize: 14 }}>Day {day.day_number}</span>
            <span style={{ color: "#D1E8FF", fontSize: 12 }}>{day.date}</span>
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
                onPatch={patch => patchItem(item.id, patch)}
              />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function ConfirmationRow({ tourId, item, isOwner, topBorder, onPatch }: {
  tourId: string;
  item: AgendaItemWithFeedback;
  isOwner: boolean;
  topBorder: boolean;
  onPatch: (patch: Partial<AgendaItemWithFeedback>) => void;
}) {
  const urls = item.confirmation_urls ?? [];
  const linked = urls.length > 0;
  const notRequired = !!item.confirmation_not_required;
  const { uploading, inputRef, handleFiles, removeFile, toggleNotRequired } =
    useItemConfirmation({ tourId, itemId: item.id, urls, onPatch });

  return (
    <div style={{ padding: "12px 16px", borderTop: topBorder ? "1px solid #f1f5f9" : undefined, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0, paddingTop: 4, textAlign: "right" }}>
        {item.time || "-"}
      </div>
      <TypeDot type={item.type} travelMethod={(item.travel_methods ?? [])[0] ?? null} subtype={(item.activity_subtypes ?? [])[0] ?? null} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
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
