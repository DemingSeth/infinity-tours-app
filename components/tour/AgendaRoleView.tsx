"use client";

import Image from "next/image";
import TypeDot from "@/components/shared/TypeDot";
import AgendaImages from "@/components/shared/AgendaImages";
import ItemFeedback from "@/components/tour/ItemFeedback";
import TripInformation from "@/components/tour/TripInformation";
import { BRAND, ROLES, DEFAULT_VISIBILITY, getMapUrl, TRAVEL_METHODS, expandStateName } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, TripInfo } from "@/lib/types";

interface Props {
  tourName: string;
  tourDestination?: string | null;
  tourDates?: string | null;
  bannerUrl?: string | null;
  tripInfo?: TripInfo | null;
  days: AgendaDayWithItems[];
  role: Role;
  onClose?: () => void;
  embedded?: boolean;
}

export default function AgendaRoleView({ tourName, tourDestination, tourDates, bannerUrl, tripInfo, days, role, onClose, embedded }: Props) {
  const vis = DEFAULT_VISIBILITY[role] as Record<string, boolean>;
  const roleInfo = ROLES[role];

  // Feedback is for participants rating activities. Show it for all participant
  // roles (student/chaperone, teacher, tour host) and hide it only for the bus
  // driver. Suppressed in the embedded admin preview so previewing never writes
  // real feedback rows — coordinators manage feedback from the itinerary editor.
  const showFeedback = role !== "driver" && !embedded;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {embedded && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: roleInfo.bg, color: roleInfo.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              Previewing: {roleInfo.label}
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>This is what {roleInfo.label.toLowerCase()}s see on the shared view.</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer", fontFamily: "inherit" }}
          >
            Close Preview
          </button>
        </div>
      )}

      <div style={{ position: "relative", background: BRAND.navy, borderRadius: 12, padding: "20px 24px", marginBottom: 18, overflow: "hidden" }}>
        {/* Banner background photo + dark gradient overlay for text legibility */}
        {bannerUrl && (
          <>
            <Image src={bannerUrl} alt="" fill sizes="(max-width: 720px) 100vw, 680px" style={{ objectFit: "cover", objectPosition: "center" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.70))" }} />
          </>
        )}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Image src="/infinity-logo.png" alt="Infinity Tours" width={0} height={0} sizes="80px" style={{ height: 22, width: "auto" }} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 12, color: "#fff", letterSpacing: 0.5, textShadow: bannerUrl ? "0 1px 4px rgba(0,0,0,0.7)" : undefined }}>INFINITY</span>
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, fontSize: 6, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>TOURS + EVENTS</span>
              </div>
            </div>
            <div style={bannerUrl
              ? { background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }
              : { background: roleInfo.bg, color: roleInfo.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              {roleInfo.label}
            </div>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 4px", textShadow: bannerUrl ? "0 1px 4px rgba(0,0,0,0.7)" : undefined }}>
            {tourName}
          </h1>
          {(tourDestination || tourDates) && (
            <div style={{ color: bannerUrl ? "#e2e8f0" : "#7dd3d8", fontSize: 13, textShadow: bannerUrl ? "0 1px 4px rgba(0,0,0,0.7)" : undefined }}>
              {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>

      {/* Trip Information — shown to all roles, expanded by default, above Day 1. */}
      {tripInfo && <TripInformation info={tripInfo} />}

      {days.length === 0 && (
        <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
          No itinerary days have been added yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {days.map(day => (
          <div key={day.id} style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ background: BRAND.navy, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", color: "#fff", fontWeight: 700, fontSize: 15 }}>Day {day.day_number}</span>
              <span style={{ color: "#7dd3d8", fontSize: 13 }}>{day.date}</span>
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{day.agenda_items.length} item{day.agenda_items.length !== 1 ? "s" : ""}</span>
            </div>
            <div>
              {day.agenda_items.length === 0 && (
                <div style={{ color: "#cbd5e1", fontSize: 12, padding: "14px 16px", textAlign: "center" }}>No items</div>
              )}
              {day.agenda_items.map((item, idx) => (
                <div key={item.id} style={{ padding: "12px 16px", borderTop: idx > 0 ? "1px solid #f1f5f9" : undefined }}>
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

                      <AgendaImages urls={item.image_urls} fullWidth />


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
                    <ItemFeedback itemId={item.id} tourId={item.tour_id} role={role} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 28, paddingBottom: 20, fontSize: 11, color: "#94a3b8" }}>
        Powered by Infinity Tours + Events
      </div>
    </div>
  );
}
