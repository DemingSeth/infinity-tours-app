"use client";

import { BRAND } from "@/lib/helpers";
import type { VendorRow } from "@/lib/types";

interface Props {
  vendors: VendorRow[];
}

export default function VendorsTab({ vendors }: Props) {
  if (vendors.length === 0) {
    return (
      <div style={{ background: "#f8fafc", border: "2px dashed #e2e8f0", borderRadius: 12, padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
        No vendors in the directory yet.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
        Vendor directory is shared across all tours. Flagged vendors appear highlighted.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {vendors.map(v => (
          <div key={v.id} style={{ background: v.flag ? "#fff5f5" : "#fff", border: `1.5px solid ${v.flag ? "#fca5a5" : "#e8eef4"}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, color: v.flag ? "#b91c1c" : BRAND.navy, fontSize: 13 }}>
                  {v.flag && "⚠ "}{v.name}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{v.category}</div>
              </div>
              <div style={{ display: "flex", gap: 1 }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ fontSize: 13, color: s <= v.rating ? "#f59e0b" : "#e2e8f0" }}>★</span>
                ))}
              </div>
            </div>
            {v.notes && (
              <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{v.notes}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
