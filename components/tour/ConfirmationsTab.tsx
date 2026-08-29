"use client";

import { BRAND, orderAgendaItems, resolveIconColor } from "@/lib/helpers";
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
      <div style={{ background: "var(--surface-2)", border: "2px dashed var(--border)", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 13 }}>
        No itinerary items yet. Add items on the Itinerary tab to start linking confirmations.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, background: "var(--green-bg-soft)", border: "1.5px solid var(--green-border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green-text)", textTransform: "uppercase", letterSpacing: 0.5 }}>Confirmed</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: "#16a34a", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{confirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "var(--amber-bg-soft)", border: "1.5px solid var(--amber-border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amber-text)", textTransform: "uppercase", letterSpacing: 0.5 }}>Unconfirmed</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: "#ea580c", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{unconfirmed}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160, background: "var(--surface-2)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>No Confirmation Needed</div>
          <div style={{ fontSize: 24, fontWeight: 400, color: "var(--muted)", fontFamily: "'Fjalla One',Georgia,sans-serif" }}>{notRequired}</div>
        </div>
      </div>

      {days.map(day => (
        <div key={day.id} style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: BRAND.navy, padding: "9px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", color: "#fff", fontWeight: 400, fontSize: 14 }}>Day {day.day_number}</span>
            <span style={{ color: "#D1E8FF", fontSize: 12 }}>{day.date}</span>
          </div>
          {day.agenda_items.length === 0 ? (
            <div style={{ color: "var(--muted-3)", fontSize: 12, padding: "12px 16px" }}>No items</div>
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
    <div style={{ padding: "12px 16px", borderTop: topBorder ? "1px solid var(--surface-3)" : undefined, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 52, fontSize: 11, fontWeight: 700, color: "var(--muted-2)", flexShrink: 0, paddingTop: 4, textAlign: "right", lineHeight: 1.4 }}>
        {item.time || "-"}
        {item.end_time && <div style={{ fontWeight: 600 }}>– {item.end_time}</div>}
      </div>
      <TypeDot type={item.type} travelMethod={(item.travel_methods ?? [])[0] ?? null} subtype={(item.activity_subtypes ?? [])[0] ?? null} size={28} color={resolveIconColor(item)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{item.title}</span>
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
