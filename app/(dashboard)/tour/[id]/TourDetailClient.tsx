"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND, STATUSES, formatAgendaDate, expandStateName } from "@/lib/helpers";
import StatusPill from "@/components/shared/StatusPill";
import OverviewTab from "@/components/tour/OverviewTab";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import AgendaTab from "@/components/tour/AgendaTab";
import RosterTab from "@/components/tour/RosterTab";
import ConfirmationsTab from "@/components/tour/ConfirmationsTab";
import PostTripTab from "@/components/tour/PostTripTab";
import SettingsTab from "@/components/tour/SettingsTab";

// Icon paths (subset used in tabs)
const ICONS: Record<string, string> = {
  map:      "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4",
  users:    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z",
  home:     "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  flag:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  note:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zm6.93-3c0-.36-.04-.72-.09-1.06l2.3-1.8-2.2-3.8-2.7 1.08A7 7 0 0014 5.43V2.7h-4v2.73a7 7 0 00-2.24 1.27L5.07 5.62 2.87 9.42l2.3 1.8C5.04 11.58 5 11.78 5 12s.04.42.07.62L2.87 14.42l2.2 3.8 2.69-1.08A7 7 0 0010 18.57V21h4v-2.43a7 7 0 002.24-1.27l2.69 1.08 2.2-3.8-2.3-1.8c.05-.34.1-.7.1-1.08z",
  check:    "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
};

const I = ({ n, s = 13 }: { n: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={ICONS[n] ?? ""} />
  </svg>
);

const TABS = [
  { id: "overview", label: "Overview",  icon: "home"     },
  { id: "agenda",   label: "Itinerary", icon: "map"      },
  { id: "roster",   label: "Roster",    icon: "users"    },
  { id: "vendors",  label: "Confirmations", icon: "check" },
  { id: "post",     label: "Post-Trip", icon: "note"     },
  { id: "settings", label: "Settings",  icon: "settings" },
];

interface Props {
  tour: any;
  initialMembers: any[];
  initialDays: any[];
  initialPostTrip: any;
  initialPostTripReview: any;
  currentUserId: string;
  viewerIsAdmin: boolean;
}

export default function TourDetailClient({ tour: initialTour, initialMembers, initialDays, initialPostTrip, initialPostTripReview, currentUserId, viewerIsAdmin }: Props) {
  const router = useRouter();
  const [tour, setTour] = useState(initialTour);
  const [members, setMembers] = useState(initialMembers);
  const [days, setDays] = useState(initialDays);
  const [tab, setTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [cascadePrompt, setCascadePrompt] = useState<{ newStartDate: string; dayCount: number } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  const isOwner = tour.tour_host_id === currentUserId;

  // Count itinerary items with no linked confirmation — surfaced on the
  // Confirmations tab label so consultants see outstanding work at a glance.
  // Count only genuinely outstanding items: no confirmation linked AND not
  // marked "no confirmation required".
  const unconfirmedCount = days.reduce(
    (n, d) => n + d.agenda_items.filter((i: any) => !(i.confirmation_urls?.length) && !i.confirmation_not_required).length,
    0,
  );

  async function handleTourChange(patch: Record<string, any>) {
    const prevStartDate = tour.start_date;
    const optimistic = { ...tour, ...patch };
    setTour(optimistic);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("tours").update(patch).eq("id", tour.id);
    setSaving(false);

    if ("start_date" in patch && patch.start_date && patch.start_date !== prevStartDate && days.length > 0) {
      setCascadePrompt({ newStartDate: patch.start_date, dayCount: days.length });
    }
  }

  async function applyCascade(newStartDate: string) {
    const supabase = createClient();
    const startDate = new Date(newStartDate + "T12:00:00");
    const updates = days.map((day: any, i: number) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return { id: day.id, date: formatAgendaDate(d) };
    });
    await Promise.all(updates.map((u: { id: string; date: string }) =>
      supabase.from("agenda_days").update({ date: u.date }).eq("id", u.id)
    ));
    setDays((prev: any[]) => prev.map((day: any, i: number) => ({ ...day, date: updates[i].date })));
    setCascadePrompt(null);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "7px 13px", fontSize: 12, color: "#64748b", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginTop: 3, flexShrink: 0 }}
        >
          Back
        </button>
        <div style={{ marginTop: 2, flexShrink: 0, filter: "invert(1)" }}>
          <InfinityLogoImg height={48} showText={false} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {isOwner && editingName ? (
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && nameVal.trim()) { handleTourChange({ name: nameVal.trim() }); setEditingName(false); }
                  if (e.key === "Escape") setEditingName(false);
                }}
                onBlur={() => { if (nameVal.trim()) handleTourChange({ name: nameVal.trim() }); setEditingName(false); }}
                autoFocus
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: BRAND.navy, border: "none", borderBottom: `2px solid ${BRAND.navy}`, outline: "none", background: "transparent", padding: "0 2px", minWidth: 200 }}
              />
            ) : (
              <h2
                onClick={isOwner ? () => { setNameVal(tour.name); setEditingName(true); } : undefined}
                title={isOwner ? "Click to edit tour name" : undefined}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 700, color: BRAND.navy, margin: 0, cursor: isOwner ? "text" : "default" }}
              >
                {tour.name}
              </h2>
            )}
            <StatusPill status={tour.status} />
            {saving && <span style={{ fontSize: 11, color: "#94a3b8" }}>Saving...</span>}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
            {/* School/group name omitted (redundant with the title); state names spelled out in full. */}
            {[expandStateName(tour.destination), tour.dates].filter(Boolean).join(" · ")}
          </div>
        </div>
        {isOwner && (
          <select
            value={tour.status}
            onChange={e => handleTourChange({ status: e.target.value })}
            style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#1e293b", fontFamily: "inherit", background: "#fff", outline: "none", width: 140 }}
          >
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 1, borderBottom: "2px solid #f1f5f9", marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "9px 14px",
              fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
              color: tab === t.id ? BRAND.navy : "#94a3b8",
              borderBottom: tab === t.id ? `2px solid ${BRAND.navy}` : "2px solid transparent",
              marginBottom: -2, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <I n={t.icon} />{t.label}
            {t.id === "vendors" && unconfirmedCount > 0 && (
              <span style={{ marginLeft: 2, background: "#f97316", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 7px", lineHeight: 1.5 }}>
                {unconfirmedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          tour={tour}
          members={members}
          isOwner={isOwner}
          onChange={handleTourChange}
        />
      )}
      {tab === "agenda" && (
        <AgendaTab
          tour={tour}
          days={days}
          members={members}
          isOwner={isOwner}
          onDaysChange={setDays}
          onTourChange={handleTourChange}
        />
      )}
      {tab === "roster" && (
        <RosterTab
          tour={tour}
          members={members}
          isOwner={isOwner}
          onMembersChange={setMembers}
        />
      )}
      {tab === "vendors" && (
        <ConfirmationsTab
          tourId={tour.id}
          days={days}
          onDaysChange={setDays}
          isOwner={isOwner}
        />
      )}
      {tab === "post" && (
        <PostTripTab
          tour={tour}
          days={days}
          initialPostTrip={initialPostTrip}
          initialReview={initialPostTripReview}
          currentUserId={currentUserId}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          tour={tour}
          isOwner={isOwner}
          viewerIsAdmin={viewerIsAdmin}
          currentUserId={currentUserId}
          onTourChange={handleTourChange}
        />
      )}

      {cascadePrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 17, fontWeight: 700, color: BRAND.navy, marginBottom: 10 }}>
              Update Itinerary Dates?
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 18px", lineHeight: 1.6 }}>
              Would you like to update your itinerary day dates to match the new tour dates? This will reassign dates starting from <strong>{formatAgendaDate(new Date(cascadePrompt.newStartDate + "T12:00:00"))}</strong> across all <strong>{cascadePrompt.dayCount}</strong> existing day{cascadePrompt.dayCount !== 1 ? "s" : ""}.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCascadePrompt(null)}
                style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Keep Existing Dates
              </button>
              <button
                onClick={() => applyCascade(cascadePrompt.newStartDate)}
                style={{ flex: 1, background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Update Itinerary Dates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
