"use client";

import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { TourHostRow } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import InfinityLogo from "@/components/shared/InfinityLogo";
import { BRAND } from "@/lib/helpers";

interface Props {
  children: React.ReactNode;
  user: User;
  tourHost: TourHostRow | null;
}

export default function DashboardShell({ children, user, tourHost }: Props) {
  const router = useRouter();
  const initials = tourHost?.initials ||
    (tourHost?.name || user.email || "TH").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Top nav */}
      <header style={{ background: BRAND.navy, padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div
          onClick={() => router.push("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <InfinityLogo height={26} color="#fff" showText={true} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: BRAND.teal,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
            }}>
              {initials}
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
              {tourHost?.name || user.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, padding: 24, maxWidth: 1400, width: "100%", margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
