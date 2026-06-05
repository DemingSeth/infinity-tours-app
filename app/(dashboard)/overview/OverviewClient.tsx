"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { BRAND } from "@/lib/helpers";
import StatsRow from "@/components/overview/StatsRow";
import PipelineSummary from "@/components/overview/PipelineSummary";
import CalendarView from "@/components/overview/CalendarView";
import VisibilitySettingsModal from "@/components/overview/VisibilitySettingsModal";
import type { TourWithHostAndMembers, HostRole } from "@/lib/types";

interface Props {
  tours: TourWithHostAndMembers[];
  currentHostId: string;
  // Architected for future visibility gating (host vs admin); not enforced yet.
  viewerRole: HostRole;
}

export default function OverviewClient({ tours, currentHostId, viewerRole }: Props) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const openTour = (id: string) => router.push(`/tour/${id}`);

  return (
    <div data-viewer-role={viewerRole} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif", margin: 0, letterSpacing: -0.5 }}>
            Command Center
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 4, marginBottom: 0 }}>
            All tours across Infinity Tours · <strong>{tours.length}</strong> total
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="Visibility settings"
          aria-label="Visibility settings"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer" }}
        >
          <Settings size={17} />
        </button>
      </header>

      <StatsRow tours={tours} />
      <PipelineSummary tours={tours} currentHostId={currentHostId} onOpenTour={openTour} />
      <CalendarView tours={tours} onOpenTour={openTour} />

      {showSettings && <VisibilitySettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
