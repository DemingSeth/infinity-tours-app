"use client";

import { BRAND, orderAgendaItems } from "@/lib/helpers";
import TypeDot from "@/components/shared/TypeDot";
import ItemConfirmationControl from "@/components/tour/itemConfirmation";
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
          <div style={{ fontSize: 24, fontWeight: 400, color: "#16a34a", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{confirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5 }}>Unconfirmed</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: "#ea580c", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{unconfirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>No Confirmation Needed</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: "#64748b", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{notRequired}</div>
        </div>
      </div>

      {days.map(day => (
        <div key={day.id} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: BRAND.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", color: "#fff", fontWeight: 400, fontSize: 14 }}>Day {day.day_number}</span>
            <span style={{ color: "#D1E8FF", fontSize: 12 }}>{day.date}</span>
          </div>
          {day.agenda_items.length === 0 ? (
            <div style={{ color: "#cbd5e1", fontSize: 12, padding: "12px 16px" }}>No items</div>
          ) : (
            orderAgendaItems(day.agenda_items).map((item, idx) => (
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
  const notRequired = !!item.confirmation_not_required;

  return (
    <div style={{ padding: "12px 16px", borderTop: topBorder ? "1px solid #f1f5f9" : undefined, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0, paddingTop: 4, textAlign: "right", lineHeight: 1.4 }}>
        {item.time || "-"}
        {item.end_time && <div style={{ fontWeight: 600 }}>– {item.end_time}</div>}
      </div>
      <TypeDot type={item.type} travelMethod={(item.travel_methods ?? [])[0] ?? null} subtype={(item.activity_subtypes ?? [])[0] ?? null} size={28} flightColor={item.flight_icon_color} busColor={item.bus_icon_color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
        </div>
        {/* Shared control: status, no-confirmation toggle, files, links, upload —
            reads/writes the same agenda_items record as the item edit modal. */}
        <ItemConfirmationControl
          tourId={tourId}
          itemId={item.id}
          urls={urls}
          notRequired={notRequired}
          isOwner={isOwner}
          onPatch={onPatch}
        />
      </div>
    </div>
  );
}
