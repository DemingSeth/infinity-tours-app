"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Image as ImageIcon } from "lucide-react";
import { BRAND } from "@/lib/helpers";
import { createClient } from "@/lib/supabase/client";
import { Modal, Btn } from "@/components/tour/ui";
import BannerLibraryManager from "@/components/tour/BannerLibraryManager";
import StatsRow from "@/components/overview/StatsRow";
import PipelineSummary from "@/components/overview/PipelineSummary";
import CalendarView from "@/components/overview/CalendarView";
import VisibilitySettingsModal from "@/components/overview/VisibilitySettingsModal";
import type { TourWithHostAndMembers, HostRole } from "@/lib/types";

// Admin-only card: library image count + a button to manage the library.
function BannerLibraryCard({ currentHostId }: { currentHostId: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { count } = await supabase.from("banner_image_library").select("*", { count: "exact", head: true });
      if (active) setCount(count ?? 0);
    })();
    return () => { active = false; };
  }, [open]);

  return (
    <>
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.navy, flexShrink: 0 }}>
            <ImageIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: BRAND.navy, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>Banner Library</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {count === null ? "Loading…" : `${count} approved image${count !== 1 ? "s" : ""}`} · Admin
            </div>
          </div>
        </div>
        <Btn onClick={() => setOpen(true)}>Manage Banner Images</Btn>
      </div>
      {open && (
        <Modal title="Banner Image Library" onClose={() => setOpen(false)} wide>
          <BannerLibraryManager currentHostId={currentHostId} />
        </Modal>
      )}
    </>
  );
}

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
            Infinity Tours Dashboard
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

      {viewerRole === "admin" && <BannerLibraryCard currentHostId={currentHostId} />}

      <StatsRow tours={tours} />
      <PipelineSummary tours={tours} currentHostId={currentHostId} onOpenTour={openTour} />
      <CalendarView tours={tours} onOpenTour={openTour} />

      {showSettings && <VisibilitySettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
