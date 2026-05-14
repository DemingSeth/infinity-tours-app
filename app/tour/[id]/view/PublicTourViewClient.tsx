"use client";

import { useState } from "react";
import AgendaRoleView from "@/components/tour/AgendaRoleView";
import InfinityLogoImg from "@/components/shared/InfinityLogoImg";
import { BRAND, ROLES } from "@/lib/helpers";
import type { AgendaDayWithItems, Role, AccessCodes } from "@/lib/types";

interface Props {
  tourId: string;
  tourName: string;
  tourDestination: string | null;
  tourDates: string | null;
  accessCodes: AccessCodes;
  days: AgendaDayWithItems[];
}

const ROLE_OPTIONS: { role: Role; label: string; description: string }[] = [
  { role: "teacher",     label: "Teacher / Admin",     description: "Full schedule with contacts" },
  { role: "driver",      label: "Bus Driver",           description: "Addresses and driving notes" },
  { role: "student",     label: "Student / Chaperone",  description: "Day-by-day itinerary" },
  { role: "coordinator", label: "Tour Host",            description: "Full coordinator access" },
];

export default function PublicTourViewClient({ tourName, tourDestination, tourDates, accessCodes, days }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<Role | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    const codes = accessCodes as unknown as Record<string, string>;
    const expected = codes[selectedRole];
    if (expected && code.trim() === expected) {
      setUnlocked(selectedRole);
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
          days={days}
          role={unlocked}
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
                {[tourDestination, tourDates].filter(Boolean).join(" · ")}
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
              {ROLE_OPTIONS.map(opt => {
                const roleInfo = ROLES[opt.role];
                const selected = selectedRole === opt.role;
                return (
                  <button
                    key={opt.role}
                    onClick={() => { setSelectedRole(opt.role); setCode(""); setError(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      border: `1.5px solid ${selected ? roleInfo.color : "#e2e8f0"}`,
                      borderRadius: 10, background: selected ? roleInfo.bg : "#fff",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left", width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selected ? roleInfo.color : "#1e293b" }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{opt.description}</div>
                    </div>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: roleInfo.color, flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            {selectedRole && (
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
