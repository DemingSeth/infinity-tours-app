"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Bus, Sparkles, Tag } from "lucide-react";
import TypeDot from "@/components/shared/TypeDot";
import AgendaImages from "@/components/shared/AgendaImages";
import ItemFeedback from "@/components/tour/ItemFeedback";
import GeneralFeedback from "@/components/tour/GeneralFeedback";
import TripInformation from "@/components/tour/TripInformation";
import ItineraryHeaderTile from "@/components/tour/ItineraryHeaderTile";
import GoogleMapsLink from "@/components/shared/GoogleMapsLink";
import { BRAND, ROLES, DEFAULT_VISIBILITY, isItemVisibleTo, personaColors, orderAgendaItems, parseAgendaDate, initialCollapsedDays, tripInfoStartsCollapsed, itemMatchesGroup, resolveIconColor } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, TripInfo, TourGroup } from "@/lib/types";

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
  // Whole-tour feedback: the tour id (to write rows), whether the host has it
  // enabled, and the tour end date (for the end-of-tour banner timing).
  tourId?: string;
  generalFeedbackEnabled?: boolean;
  tourEndDate?: string | null;
  // Multi-group tours: the tour's groups (filter chips) and the group a
  // shared link pre-selected (?group=). Items with no group always show.
  groups?: TourGroup[];
  initialGroup?: string | null;
}

export default function AgendaRoleView({ tourName, tourDestination, tourDates, bannerUrl, bannerFocusX = 50, bannerFocusY = 50, tripInfo, days, confTourId, role, roleLabel, personaKey, onClose, embedded, print = false, tourId, generalFeedbackEnabled = false, tourEndDate, groups = [], initialGroup = null }: Props) {
  const tourGroups = groups.filter(g => g && g.id && (g.name ?? "").trim());
  const [groupFilter, setGroupFilter] = useState<string | null>(
    () => (initialGroup && tourGroups.some(g => g.id === initialGroup) ? initialGroup : null),
  );
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

  // Print/compact mode: a denser, paper-saving layout (same content, less white
  // space). `mt` halves the on-screen vertical rhythm only when printing so the
  // itinerary consolidates onto fewer pages; on-screen/preview keep their values.
  const mt = (n: number) => (print ? Math.max(2, Math.round(n / 2)) : n);

  // Days are collapsible in every view. Initial state is DATE-DRIVEN: past days
  // collapsed, current + future expanded (see initialCollapsedDays). Purely
  // client-side React state — it never affects what's in the rendered markup
  // (every day's header + body stay in the DOM; collapse only hides the body),
  // so a future server PDF render is unaffected. The viewer can expand any day,
  // which overrides the auto state for the session. In print, collapse is forced
  // off below, so the PDF/print output is fully expanded.
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>(
    () => initialCollapsedDays(days),
  );
  const toggleDay = (id: string) => setCollapsedDays(c => ({ ...c, [id]: !c[id] }));

  // ── Whole-tour ("general") feedback ─────────────────────────────────────────
  // Shown to participants (not the bus driver, not in print) when the host has it
  // enabled and we have a tour id to write against. The bottom card always shows;
  // the top banner appears only on/after the final day and only until submitted.
  const showGeneral = !!tourId && generalFeedbackEnabled && role !== "driver" && !print;

  // "Final day or later": prefer the tour end date, else the last itinerary day.
  const finalDate = (() => {
    if (tourEndDate) return new Date(`${tourEndDate}T00:00:00`);
    const lastDay = days[days.length - 1];
    return lastDay ? parseAgendaDate(lastDay.date) : null;
  })();
  const isFinalDayOrAfter = (() => {
    if (!finalDate) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fd = new Date(finalDate.getFullYear(), finalDate.getMonth(), finalDate.getDate());
    return today >= fd;
  })();

  // `done` drives both variants to a thank-you; `doneAtMount` decides whether the
  // banner is shown at all (so it never returns after a submit this session).
  const [done, setDone] = useState(false);
  const [doneAtMount, setDoneAtMount] = useState(false);
  const sessionKey = tourId ? `general-feedback:${tourId}` : null;
  useEffect(() => {
    if (!sessionKey) return;
    try {
      if (sessionStorage.getItem(sessionKey) === "1") { setDone(true); setDoneAtMount(true); }
    } catch { /* sessionStorage unavailable */ }
  }, [sessionKey]);
  const markGeneralDone = () => {
    setDone(true);
    if (!embedded && sessionKey) { try { sessionStorage.setItem(sessionKey, "1"); } catch { /* ignore */ } }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {embedded && (
        <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: colors.bg, color: colors.color, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              Previewing: {label}
            </div>
            <span style={{ fontSize: 11, color: "var(--muted-2)" }}>This is what {label.toLowerCase()}s see on the shared view.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Print this persona's copy. Reuses the role-aware print page, scoped
                to the previewed persona via ?persona= — so the printout shows
                exactly the items this persona sees here (same visibility filter)
                and is labeled with the persona on the header. */}
            {tourId && personaKey && (
              <a
                href={`/tour/${tourId}/print?persona=${encodeURIComponent(personaKey)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: colors.bg, color: colors.color, border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}
              >
                Print {label} Copy
              </a>
            )}
            <button
              onClick={onClose}
              style={{ background: "var(--surface-3)", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Close Preview
            </button>
          </div>
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

      {/* End-of-tour feedback banner — prominent, only on/after the final day and
          only until the viewer has submitted this session. */}
      {showGeneral && isFinalDayOrAfter && !doneAtMount && tourId && (
        <GeneralFeedback variant="banner" tourId={tourId} role={role} done={done} onSubmitted={markGeneralDone} preview={!!embedded} />
      )}

      {/* Trip Information — shown to all roles, expanded by default, above Day 1.
          viewerRole lets role-gated rows (e.g. the bus-driver map) render for the
          right audience. */}
      {tripInfo && <TripInformation info={tripInfo} tourId={confTourId} print={print} viewerRole={role} viewerPersona={personaKey ?? null} initiallyCollapsed={tripInfoStartsCollapsed(days)} />}

      {/* Multi-group tours: pick a group to see just its schedule. Items that
          apply to everyone always show. Printing honors the selection. */}
      {tourGroups.length > 0 && !print && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: .6, display: "inline-flex", alignItems: "center", gap: 4 }}><Tag size={11} />Group</span>
          {[{ id: null as string | null, name: "Everyone" }, ...tourGroups].map(g => {
            const on = groupFilter === g.id;
            return (
              <button key={g.id ?? "all"} type="button" onClick={() => setGroupFilter(g.id)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${on ? BRAND.blue : "var(--border)"}`, background: on ? BRAND.blue + "18" : "var(--surface)", color: on ? BRAND.blue : "var(--muted)", fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
                {g.name}
              </button>
            );
          })}
        </div>
      )}
      {tourGroups.length > 0 && print && groupFilter && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
          Group: {tourGroups.find(g => g.id === groupFilter)?.name}
        </div>
      )}

      {days.length === 0 && (
        <div style={{ background: "var(--surface-2)", border: "2px dashed var(--border)", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "var(--muted-2)", fontSize: 13 }}>
          No itinerary days have been added yet.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: print ? 8 : 16 }}>
        {days.map(day => {
          // Strict per-persona filtering: only items where visibility[persona] === true.
          // Then the host-controlled display order (sort_order; drag & drop aware).
          const items = orderAgendaItems(
            (personaKey ? day.agenda_items.filter(i => isItemVisibleTo(i, personaKey)) : day.agenda_items)
              .filter(i => itemMatchesGroup(i, groupFilter)),
          );
          if (items.length === 0) return null; // hide days with nothing visible to this persona
          const collapsed = print ? false : !!collapsedDays[day.id];
          return (
          <div key={day.id} className={print ? "print-day" : undefined} style={{ background: "var(--surface)", border: "1.5px solid var(--border-soft)", borderRadius: print ? 8 : 12, overflow: "hidden", boxShadow: print ? "none" : "0 1px 4px rgba(0,0,0,.04)" }}>
            <div
              onClick={print ? undefined : () => toggleDay(day.id)}
              role="button"
              aria-expanded={!collapsed}
              className={print ? "print-day-header" : undefined}
              style={{ background: BRAND.navy, padding: print ? "5px 14px" : "10px 16px", display: "flex", alignItems: "center", gap: 10, cursor: print ? "default" : "pointer", breakInside: print ? "avoid" : undefined }}
            >
              {!print && (collapsed
                ? <ChevronRight size={16} color="rgba(255,255,255,.7)" style={{ flexShrink: 0 }} />
                : <ChevronDown size={16} color="rgba(255,255,255,.7)" style={{ flexShrink: 0 }} />)}
              <span style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", color: "#fff", fontWeight: 400, fontSize: 15 }}>Day {day.day_number}</span>
              <span style={{ color: "#D1E8FF", fontSize: 13 }}>{day.date}</span>
              <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
            </div>
            {!collapsed && (
            <div>
              {items.map((item, idx) => (
                <div key={item.id} className={print ? "print-item" : undefined} style={{ padding: print ? "6px 14px" : "12px 16px", borderTop: idx > 0 ? "1px solid var(--surface-3)" : undefined, breakInside: print ? "avoid" : undefined }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {/* Times: bold, navy like the title, one step larger so they
                        pull the eye first (August 2026 request). */}
                    {(item.time || item.end_time) && (
                      <span style={{ fontSize: print ? 12 : 13, fontWeight: 700, color: "var(--ink)", minWidth: 60, paddingTop: 3, flexShrink: 0, lineHeight: 1.35 }}>
                        {item.time}
                        {item.end_time && <span style={{ display: "block", fontSize: print ? 11 : 12 }}>– {item.end_time}</span>}
                      </span>
                    )}
                    <TypeDot type={item.type} travelMethod={(item.travel_methods ?? [])[0] ?? null} subtype={(item.activity_subtypes ?? [])[0] ?? null} size={24} color={resolveIconColor(item)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{item.title}</span>
                        {item.custom_type_label?.trim() && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", background: "#8b5cf618", borderRadius: 4, padding: "1px 6px" }}>{item.custom_type_label}</span>
                        )}
                        {/* The leading TypeDot icon conveys the item type; no redundant
                            type/sub-type text tags here. */}
                        {/* Meal money — one chip per entry; "group" shows no dollar figure. */}
                        {item.type === "food" && (item.meal_money ?? []).map((mm, i) => {
                          const amt = typeof mm.amount === "number" ? mm.amount : null;
                          // Every meal chip is the Dining yellow (matches the meal
                          // icon); no per-option colors (August 2026 request).
                          const style = { color: "var(--amber-text)", background: "var(--amber-bg)" };
                          const label = mm.type === "disney_dining"
                            ? `Disney Dining Dollars${amt != null ? ` $${amt}` : ""}`
                            : mm.type === "cash"
                            ? `Cash${amt != null ? ` $${amt}` : ""}`
                            : mm.type === "hotel_breakfast"
                            ? "Hotel Breakfast"
                            : mm.type === "delivered"
                            ? "Delivered Meal"
                            : mm.type === "group"
                            ? "Group Meal"
                            : `Stipend${amt != null ? ` $${amt}` : ""}`;
                          return (
                            <span key={`m-${mm.type}-${i}`} style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 6px", ...style }}>{label}</span>
                          );
                        })}
                      </div>

                      {vis.address && item.address?.trim() && (
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: mt(4) }}>{item.address}</div>
                      )}

                      {/* whiteSpace: pre-wrap keeps line breaks / bullet lists on
                          their own lines — on screen AND in the print/PDF view. */}
                      {vis.detail && item.detail && (
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: mt(3), whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.detail}</div>
                      )}

                      {item.public_note && (
                        <div style={{ fontSize: 12, color: "#1d4ed8", background: "var(--sky-bg-soft)", borderRadius: 6, padding: "5px 10px", marginTop: mt(6), whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          {item.public_note}
                        </div>
                      )}

                      {/* Map links are useless on paper — omit them entirely in print. */}
                      {!print && vis.mapLink && item.map_link?.trim() && (
                        <div style={{ marginTop: mt(4) }}>
                          <GoogleMapsLink address={item.address} mapLink={item.map_link} color={BRAND.blue} fontSize={11} />
                        </div>
                      )}

                      <AgendaImages urls={item.image_urls} fullWidth print={print} />

                      {/* A bare "Website" link does nothing on paper — omit in print. */}
                      {!print && (item.website || item.elevate_url?.trim()) && (
                        <div style={{ fontSize: 12, marginTop: mt(3), display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                          {item.website && (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: BRAND.blue, textDecoration: "none", fontWeight: 600 }}
                            >
                              Website
                            </a>
                          )}
                          {/* "Elevate Your Experience": Infinity travel assets and social links. */}
                          {item.elevate_url?.trim() && (
                            <a
                              href={/^https?:\/\//i.test(item.elevate_url.trim()) ? item.elevate_url.trim() : `https://${item.elevate_url.trim()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: BRAND.blue, textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <Sparkles size={12} />Elevate Your Experience
                            </a>
                          )}
                        </div>
                      )}

                      {vis.contactName && item.contact_name && (
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: mt(4) }}>
                          {item.contact_name}
                          {vis.contactPhone && item.contact_phone && ` · ${item.contact_phone}`}
                          {vis.contactEmail && item.contact_email && ` · ${item.contact_email}`}
                        </div>
                      )}

                      {vis.cost && item.cost > 0 && (
                        <div style={{ fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: "var(--text-2)" }}>
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
                        <div style={{ background: "var(--amber-bg-soft)", border: "1px solid var(--amber-border)", borderRadius: 8, padding: "8px 12px", marginTop: mt(6) }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "var(--amber-text)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                            <Bus size={12} style={{ flexShrink: 0 }} />Bus Driver Note
                          </div>
                          <div style={{ fontSize: 12, color: "var(--amber-text)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{item.driver_note}</div>
                        </div>
                      )}

                      {vis.internalNote && item.internal_note && (
                        <div style={{ fontSize: 12, color: "var(--purple-text)", background: "var(--purple-bg-soft)", borderRadius: 6, padding: "5px 10px", marginTop: mt(6), whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                          Note: {item.internal_note}
                        </div>
                      )}

                      {/* Bus-driver maps for this stop — host + driver only (same
                          gate as driver notes). Shown on screen and in print. */}
                      {vis.driverNote && (item.driver_map_urls?.length ?? 0) > 0 && (
                        <div style={{ marginTop: mt(6) }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: "var(--amber-text)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>
                            <Bus size={12} style={{ flexShrink: 0 }} />Driver Maps
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {item.driver_map_urls.map(url => (
                              print ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={url} className="agenda-photo" src={url} alt="Driver map" style={{ width: 150, height: 106, objectFit: "cover", borderRadius: 6, border: "1px solid var(--amber-border)" }} />
                              ) : (
                                <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="Driver map" style={{ width: 110, height: 78, objectFit: "cover", borderRadius: 6, border: "1px solid var(--amber-border)", display: "block" }} />
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {showFeedback && item.feedback_enabled && (
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

      {/* Quiet whole-tour feedback card — always available at the bottom. */}
      {showGeneral && tourId && (
        <GeneralFeedback variant="card" tourId={tourId} role={role} done={done} onSubmitted={markGeneralDone} preview={!!embedded} />
      )}

      <div style={{ textAlign: "center", marginTop: print ? 10 : 28, paddingBottom: print ? 6 : 20, fontSize: 11, color: "var(--muted-2)" }}>
        Powered by Infinity Tours + Events
      </div>
    </div>
  );
}
