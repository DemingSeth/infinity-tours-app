"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import TypeDot from "@/components/shared/TypeDot";
import AgendaImages from "@/components/shared/AgendaImages";
import ItemFeedback from "@/components/tour/ItemFeedback";
import TripInformation from "@/components/tour/TripInformation";
import ItineraryHeaderTile from "@/components/tour/ItineraryHeaderTile";
import { BRAND, ROLES, DEFAULT_VISIBILITY, getMapUrl, TRAVEL_METHODS, isItemVisibleTo, personaColors, sortAgendaItemsByTime } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, TripInfo } from "@/lib/types";

interface Props {
  tourName: string;
  tourDestination?: string | null;
  tourDates?: string | null;
  bannerUrl?: string | null;
  bannerFocusX?: number;
  bannerFocusY?: number;
  tripInfo?: TripInfo | null;
  days: AgendaDayWithItems[];
  /** Tour id for live confirmation reads in authenticated contexts (the host preview).
   *  Omitted by the public view, which carries confirmations in tripInfo instead. */
  confTourId?: string;
  role: Role;
  roleLabel?: string;
  personaKey?: string;
  onClose?: () => void;
  embedded?: boolean;
  // Print mode (PDF export): all days forced open, no interactive chrome
  // (chevrons/feedback), eager non-optimized images, and page-break hints.
  print?: boolean;
}

export default function AgendaRoleView({ tourName, tourDestination, tourDates, bannerUrl, bannerFocusX = 50, bannerFocusY = 50, tripInfo, days, confTourId, role, roleLabel, personaKey, onClose, embedded, print = false }: Props) {
  const vis = DEFAULT_VISIBILITY[role] as Record<string, boolean>;
  const roleInfo = ROLES[role];
  const label = roleLabel || roleInfo.label; // persona label override
  // Use the persona's own color (so Chaperone ≠ Student) when a persona is known.
  const colors = personaKey ? personaColors(personaKey) : { color: roleInfo.color, bg: roleInfo.bg };

  // Feedback is for participants rating activities. Show it for all participant
  // roles (student/chaperone, teacher) and hide it only for the bus driver. It's
  // collapsed by default behind an icon on each item (see ItemFeedback). In the
  // embedded admin preview it's shown too, but submitting is a no-op so previewing
  // never writes real feedback rows.
  const showFeedback = role !== "driver" && !print;

  // Days are collapsible in every view. Seed from the host's saved collapsed flag,
  // then toggle locally — participants/public never write this back to the DB.
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(
    () => Object.fromEntries(days.map(d => [d.id, !!d.collapsed])),
  );
  const toggleDay = (id: string) => setCollapsedDays(c => ({ ...c, [id]: !c[id] }));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {embedded && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: colors.bg, color: colors.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              Previewing: {label}
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>This is what {label.toLowerCase()}s see on the shared view.</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}
          >
            Close Preview
          </button>
        </div>
      )}

      <ItineraryHeaderTile
        tourName={tourName}
        tourDestination={tourDestination}
        tourDates={tourDates}
        bannerUrl={bannerUrl}
        focusX={bannerFocusX}
        focusY={bannerFocusY}
        badgeLabel={label}
        badgeBg={colors.bg}
        badgeColor={colors.color}
        print={print}
      />

      {/* Trip Information — shown to all roles, expanded by default, above Day 1. */}
      {tripInfo && <TripInformation info={tripInfo} tourId={confTourId} />}

      {days.length === 0 && (
        <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No itinerary days have been added yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {days.map(day => {
          // Strict per-persona filtering: only items where visibility[persona] === true.
          // Then order chronologically by time (sort_order is insertion order, not time).
          const items = sortAgendaItemsByTime(
            personaKey ? day.agenda_items.filter(i => isItemVisibleTo(i, personaKey)) : day.agenda_items,
          );
          if (items.length === 0) return null; // hide days with nothing visible to this persona
          const collapsed = print ? false : !!collapsedDays[day.id];
          return (
          <div key={day.id} className={print ? "print-day" : undefined} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <div
              onClick={print ? undefined : () => toggleDay(day.id)}
              role="button"
              aria-expanded={!collapsed}
              className={print ? "print-day-header" : undefined}
              style={{ background: BRAND.navy, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, cursor: print ? "default" : "pointer", breakInside: print ? "avoid" : undefined }}
            >
              {!print && (collapsed
                ? <ChevronRight size={16} color="rgba(255,255,255,.7)" style={{ flexShrink: 0 }} />
                : <ChevronDown size={16} color="rgba(255,255,255,.7)" style={{ flexShrink: 0 }} />)}
              <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontWeight: 700, fontSize: 15 }}>Day {day.day_number}</span>
              <span style={{ color: "#7dd3d8", fontSize: 13 }}>{day.date}</span>
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            {!collapsed && (
            <div>
              {items.map((item, idx) => (
                <div key={item.id} className={print ? "print-item" : undefined} style={{ padding: "12px 16px", borderTop: idx > 0 ? "1px solid #f1f5f9" : undefined, breakInside: print ? "avoid" : undefined }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {item.time && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", minWidth: 52, paddingTop: 4, flexShrink: 0 }}>{item.time}</span>
                    )}
                    <TypeDot type={item.type} travelMethod={item.travel_method} subtype={item.activity_subtype} size={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy }}>{item.title}</span>
                        {item.travel_method && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", background: "#f3f4f6", borderRadius: 4, padding: "1px 6px" }}>
                            {TRAVEL_METHODS.find(m => m.value === item.travel_method)?.label ?? item.travel_method}
                          </span>
                        )}
                        {item.type === "food" && item.meal_pay_type && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: BRAND.teal, background: "#f0fdfa", borderRadius: 4, padding: "1px 6px" }}>
                            {item.meal_pay_type === "group" ? "Group Meal" : item.stipend_amount ? `Stipend $${item.stipend_amount}` : "Stipend"}
                          </span>
                        )}
                      </div>

                      {vis.detail && item.detail && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{item.detail}</div>
                      )}

                      {item.public_note && (
                        <div style={{ fontSize: 12, color: "#1d4ed8", background: "#eff6ff", borderRadius: 6, padding: "5px 10px", marginTop: 6 }}>
                          {item.public_note}
                        </div>
                      )}

                      <AgendaImages urls={item.image_urls} fullWidth print={print} />


                      {vis.address && item.address && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                          {item.address}
                          {vis.mapLink && getMapUrl(item.map_link, item.address) && (
                            <a
                              href={getMapUrl(item.map_link, item.address)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginLeft: 8, fontSize: 11, color: BRAND.teal, textDecoration: "none", fontWeight: 600 }}
                            >
                              Map
                            </a>
                          )}
                        </div>
                      )}

                      {item.website && (
                        <div style={{ fontSize: 12, marginTop: 3 }}>
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: BRAND.teal, textDecoration: "none", fontWeight: 600 }}
                          >
                            Website
                          </a>
                        </div>
                      )}

                      {vis.contactName && item.contact_name && (
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                          {item.contact_name}
                          {vis.contactPhone && item.contact_phone && ` · ${item.contact_phone}`}
                          {vis.contactEmail && item.contact_email && ` · ${item.contact_email}`}
                        </div>
                      )}

                      {vis.cost && item.cost > 0 && (
                        <div style={{ fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: "#475569" }}>
                            ${item.cost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                          {vis.costPaid && (
                            <span style={{ color: item.cost_paid ? "#059669" : "#dc2626", fontSize: 11, fontWeight: 700 }}>
                              {item.cost_paid ? "PAID" : "UNPAID"}
                            </span>
                          )}
                        </div>
                      )}

                      {vis.driverNote && item.driver_note && (
                        <div style={{ fontSize: 12, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "5px 10px", marginTop: 6 }}>
                          Driver: {item.driver_note}
                        </div>
                      )}

                      {vis.internalNote && item.internal_note && (
                        <div style={{ fontSize: 12, color: "#5b21b6", background: "#f5f3ff", borderRadius: 6, padding: "5px 10px", marginTop: 6 }}>
                          Note: {item.internal_note}
                        </div>
                      )}
                    </div>
                  </div>
                  {showFeedback && (
                    <ItemFeedback itemId={item.id} tourId={item.tour_id} role={role} preview={!!embedded} />
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 28, paddingBottom: 20, fontSize: 11, color: "#94a3b8" }}>
        Powered by Infinity Tours + Events
      </div>
    </div>
  );
}
