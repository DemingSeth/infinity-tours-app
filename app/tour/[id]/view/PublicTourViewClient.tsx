"use client";

import { useState } from "react";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND, ROLES, expandStateName, activePersonaKeys, personaLabel, getPersona } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, AccessCodes, TripInfo } from "@/lib/types";

interface Props {
  tourId: string;
  tourName: string;
  tourDestination: string | null;
  tourDates: string | null;
  tourBannerUrl: string | null;
  tourBannerFocusX: number;
  tourBannerFocusY: number;
  tripInfo: TripInfo | null;
  accessCodes: AccessCodes;
  activePersonas: string[];
  personaLabels: Record<string, string>;
  days: AgendaDayWithItems[];
}

const PERSONA_DESC: Record<string, string> = {
  tour_host: "Full coordinator access",
  teacher: "Full schedule with contacts",
  student: "Day-by-day itinerary",
  chaperone: "Day-by-day itinerary",
  bus_driver: "Addresses and driving notes",
};

export default function PublicTourViewClient({ tourName, tourDestination, tourDates, tourBannerUrl, tourBannerFocusX, tourBannerFocusY, tripInfo, accessCodes, activePersonas, personaLabels, days }: Props) {
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<{ role: Role; label: string; personaKey: string } | null>(null);

  // Selectable personas (active ones), each mapped to its itinerary view + code.
  const options = activePersonaKeys(activePersonas).map(key => {
    const p = getPersona(key)!;
    return { key, label: personaLabel(key, personaLabels), viewRole: p.viewRole, codeKey: p.codeKey, desc: PERSONA_DESC[key] ?? "" };
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const opt = options.find(o => o.key === selectedPersona);
    if (!opt) return;
    const codes = accessCodes as unknown as Record<string, string>;
    const expected = codes[opt.codeKey];
    if (expected && code.trim() === expected) {
      setUnlocked({ role: opt.viewRole, label: opt.label, personaKey: opt.key });
    } else {
      setError("Incorrect access code. Please try again.");
    }
  }

  if (unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 16px" }}>
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
        />
      </div>
    );
  }

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "10px 14px", fontSize: 14, color: "#1e293b",
    fontFamily: "inherit", background: "#fff", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: BRAND.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ padding: "28px 32px 22px", textAlign: "center", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <InfinityLogoImg height={48} showText={false} />
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700, fontSize: 18, color: BRAND.navy }}>
              {tourName}
            </div>
            {(tourDestination || tourDates) && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {[expandStateName(tourDestination), tourDates].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>

          <div style={{ padding: "28px 32px 32px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 700, color: BRAND.navy, margin: "0 0 6px" }}>
              View Itinerary
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
              Select your role and enter the access code from your tour coordinator.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {options.map(opt => {
                const roleInfo = ROLES[opt.viewRole];
                const selected = selectedPersona === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setSelectedPersona(opt.key); setCode(""); setError(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      border: `1.5px solid ${selected ? roleInfo.color : "#e2e8f0"}`,
                      borderRadius: 10, background: selected ? roleInfo.bg : "#fff",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? roleInfo.color : "#1e293b" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{opt.desc}</div>
                    </div>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: roleInfo.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {selectedPersona && (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
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
                  <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    background: BRAND.navy, color: "#fff", border: "none", borderRadius: 8,
                    padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    fontFamily: "inherit", marginTop: 4,
                  }}
                >
                  View Itinerary
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
