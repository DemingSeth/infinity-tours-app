"use client";

import { Link2 } from "lucide-react";
import { STATUSES, BRAND } from "@/lib/helpers";
import type { TourWithHostAndMembers } from "@/lib/types";

// Future metrics — surfaced now as muted placeholders so the vision is visible.
// "Waiver Completion" was replaced by the live "Revenue Split" tile below, and
// "QuickBooks Sync" was merged into the combined "Financial Integrations" tile.
const COMING_SOON = [
  { label: "Revenue (Total)", hint: "Billing + margins" },
  { label: "Avg Tour Size", hint: "Travelers per tour" },
] as const;

// ── Demo financial estimate ───────────────────────────────────────────────────
// The current `tours` schema has NO dedicated money columns — there is no
// deposit_amount, total_price, or contract_amount (verified against the live
// table). Until a QuickBooks sync lands, we approximate revenue from the columns
// we DO have: a per-traveler list price × student_count, split into "received"
// (deposits / paid balances) vs "pending" (outstanding balance) by tour status.
// A future QuickBooks integration would replace this whole block with real
// deposit_amount / total_price figures pulled from accounting.
const PRICE_PER_TRAVELER = 2200; // demo list price per traveler (USD)
const DEPOSIT_RATE = 0.25;       // assumed deposit collected once a tour is committed

function computeRevenue(tours: TourWithHostAndMembers[]) {
  let received = 0;
  let pending = 0;
  for (const t of tours) {
    // No "cancelled" status exists in the schema, so every tour is counted.
    const contract = (t.student_count ?? 0) * PRICE_PER_TRAVELER;
    let paid = 0;
    if (t.status === "closed" || t.status === "in-progress") paid = contract;      // paid in full
    else if (t.status === "committed") paid = contract * DEPOSIT_RATE;             // deposit collected
    // "bid" → nothing collected yet
    received += paid;
    pending += contract - paid;
  }
  return { received, pending };
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function StatsRow({ tours }: { tours: TourWithHostAndMembers[] }) {
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s.id] = 0;
  for (const t of tours) if (counts[t.status] !== undefined) counts[t.status] += 1;

  const { received, pending } = computeRevenue(tours);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Primary status tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {STATUSES.map(st => (
          <div
            key={st.id}
            style={{
              background: "#fff", border: `1.5px solid ${st.dot}33`, borderRadius: 14,
              padding: "16px 18px", position: "relative", overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,.04)",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: st.dot }} />
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: st.dot }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.7 }}>
                {st.label}
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: BRAND.navy, lineHeight: 1, fontFamily: "'Fjalla One', Georgia, sans-serif" }}>
              {counts[st.id]}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              tour{counts[st.id] !== 1 ? "s" : ""}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary metric row: two coming-soon placeholders + live revenue + integrations */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {COMING_SOON.map(m => (
          <ComingSoonTile key={m.label} label={m.label} hint={m.hint} />
        ))}

        {/* Live financial tile — Revenue Received vs Pending (replaces Waiver Completion) */}
        <div
          style={{
            background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14,
            padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
            Revenue Split
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 9, padding: "6px 10px" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: 0.5 }}>Received</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#16a34a", fontFamily: "'Fjalla One', Georgia, sans-serif" }}>{usd(received)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, padding: "6px 10px" }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: 0.5 }}>Pending</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#d97706", fontFamily: "'Fjalla One', Georgia, sans-serif" }}>{usd(pending)}</span>
            </div>
          </div>
        </div>

        {/* Merged integrations stub — QuickBooks + AMEX (replaces standalone QuickBooks tile) */}
        <div
          style={{
            background: "#f8fafc", border: "1.5px dashed #e2e8f0", borderRadius: 14,
            padding: "14px 18px", opacity: 0.85,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
              <Link2 size={13} />Financial Integrations
            </span>
            <span style={{ fontSize: 8.5, fontWeight: 700, color: "#94a3b8", background: "#eef2f7", borderRadius: 20, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
              Coming Soon
            </span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#cbd5e1", lineHeight: 1, fontFamily: "'Fjalla One', Georgia, sans-serif" }}>
            —
          </div>
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 5 }}>
            QuickBooks Sync + AMEX Reconciliation — Coming Soon
          </div>
        </div>
      </div>
    </section>
  );
}

function ComingSoonTile({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      style={{
        background: "#f8fafc", border: "1.5px dashed #e2e8f0", borderRadius: 14,
        padding: "14px 18px", opacity: 0.85,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </span>
        <span style={{ fontSize: 8.5, fontWeight: 700, color: "#94a3b8", background: "#eef2f7", borderRadius: 20, padding: "2px 7px", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
          Coming Soon
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#cbd5e1", lineHeight: 1, fontFamily: "'Fjalla One', Georgia, sans-serif" }}>
        —
      </div>
      <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 5 }}>{hint}</div>
    </div>
  );
}
