"use client";

import { useState } from "react";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { BRAND, expandStateName, activePersonaKeys, personaLabel, personaColors, getPersona } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, TripInfo, TourGroup } from "@/lib/types";

interface Props {
  tourId: string;
  tourName: string;
  tourDestination: string | null;
  tourDates: string | null;
  tourBannerUrl: string | null;
  tourBannerFocusX: number;
  tourBannerFocusY: number;
  tripInfo: TripInfo | null;
  // Set server-side when a valid session cookie already exists for this tour, so
  // we render the itinerary immediately and never show the access-code prompt.
  initialUnlocked: { role: Role; label: string; personaKey: string } | null;
  activePersonas: string[];
  personaLabels: Record<string, string>;
  days: AgendaDayWithItems[];
  generalFeedbackEnabled: boolean;
  tourEndDate: string | null;
  groups: TourGroup[];
  // ?group= from the share link (pre-selects that group's schedule).
  initialGroup: string | null;
}

const PERSONA_DESC: Record<string, string> = {
  tour_host: "Full coordinator access",
  teacher: "Full schedule with contacts",
  student: "Day-by-day itinerary",
  chaperone: "Day-by-day itinerary",
  bus_driver: "Addresses and driving notes",
};

export default function PublicTourViewClient({ tourId, tourName, tourDestination, tourDates, tourBannerUrl, tourBannerFocusX, tourBannerFocusY, tripInfo, initialUnlocked, activePersonas, personaLabels, days, generalFeedbackEnabled, tourEndDate, groups, initialGroup }: Props) {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unlocked, setUnlocked] = useState<{ role: Role; label: string; personaKey: string } | null>(initialUnlocked);

  // Selectable personas (active ones), each mapped to its itinerary view + code.
  const options = activePersonaKeys(activePersonas).map(key => {
    const p = getPersona(key)!;
    return { key, label: personaLabel(key, personaLabels), viewRole: p.viewRole, codeKey: p.codeKey, desc: PERSONA_DESC[key] ?? "" };
  });

  // Validate the code server-side. On success the route sets a signed httpOnly
  // cookie so a refresh skips this prompt for the rest of the day on this device.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const opt = options.find(o => o.key === selectedPersona);
    if (!opt || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Seconds until 11:59:59 PM in the viewer's local timezone.
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const maxAgeSeconds = Math.max(60, Math.ceil((endOfDay.getTime() - Date.now()) / 1000));

      const res = await fetch("/api/tour-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourId, personaKey: opt.key, code: code.trim(), maxAgeSeconds }),
      });
      if (res.ok) {
        setUnlocked({ role: opt.viewRole, label: opt.label, personaKey: opt.key });
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error || "Incorrect access code. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page)", padding: "24px 16px" }}>
        {/* Viewer's light / dark switch, tucked above the itinerary. */}
        <div style={{ maxWidth: 680, margin: "0 auto 8px", display: "flex", justifyContent: "flex-end" }}>
          <ThemeToggle onNavy={false} />
        </div>
        <AgendaRoleView
          tourName={tourName}
          tourDestination={tourDestination}
          tourDates={tourDates}
          bannerUrl={tourBannerUrl}
          bannerFocusX={tourBannerFocusX}
          bannerFocusY={tourBannerFocusY}
          tripInfo={tripInfo}
          days={days}
          role={unlocked.role}
          roleLabel={unlocked.label}
          personaKey={unlocked.personaKey}
          tourId={tourId}
          generalFeedbackEnabled={generalFeedbackEnabled}
          tourEndDate={tourEndDate}
          groups={groups}
          initialGroup={initialGroup}
        />
      </div>
    );
  }

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid var(--border)", borderRadius: 8,
    padding: "10px 14px", fontSize: 14, color: "var(--text)",
    fontFamily: "inherit", background: "var(--surface)", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "var(--surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ padding: "28px 32px 22px", textAlign: "center", borderBottom: "1px solid var(--surface-3)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <InfinityLogoImg height={48} />
            </div>
            <div style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", letterSpacing: "0.03em", fontWeight: 400, fontSize: 18, color: "var(--ink)" }}>
              {tourName}
            </div>
            {(tourDestination || tourDates) && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          <div style={{ padding: "28px 32px 32px" }}>
            <h2 style={{ fontFamily: "'Fjalla One', Georgia, sans-serif", fontSize: 20, fontWeight: 400, color: "var(--ink)", margin: "0 0 6px" }}>
              View Itinerary
            </h2>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 20px" }}>
              Select your role and enter the access code from your tour coordinator.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {options.map(opt => {
                const c = personaColors(opt.key);
                const selected = selectedPersona === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setSelectedPersona(opt.key); setCode(""); setError(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      border: `1.5px solid ${selected ? c.color : "var(--border)"}`,
                      borderRadius: 10, background: selected ? c.bg : "var(--surface)",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? c.color : "var(--text)" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: "var(--muted-2)" }}>{opt.desc}</div>
                    </div>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {selectedPersona && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Access Code
                  </label>
                  <input
                    value={code}
                    onChange={e => { setCode(e.target.value); setError(null); }}
                    placeholder="Enter your access code"
                    autoFocus
                    style={inp}
                  />
                </div>

                {error && (
                  <div style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !code.trim()}
                  style={{
                    background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8,
                    padding: "12px 0", fontSize: 14, fontWeight: 600,
                    cursor: submitting || !code.trim() ? "default" : "pointer",
                    fontFamily: "inherit", marginTop: 4, opacity: submitting || !code.trim() ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Verifying…" : "View Itinerary"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
