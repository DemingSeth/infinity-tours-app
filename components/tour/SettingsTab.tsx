"use client";

import { useState } from "react";
import { BRAND, ROLES, DEFAULT_VISIBILITY } from "@/lib/helpers";
import { I, Field, Inp, Btn } from "@/components/tour/ui";
import type { TourRow } from "@/lib/types";

const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

const VIS_FIELDS = [
  { key: "detail",       label: "Detail / Notes" },
  { key: "address",      label: "Address" },
  { key: "mapLink",      label: "Google Maps Link" },
  { key: "contactName",  label: "Contact Name" },
  { key: "contactPhone", label: "Contact Phone" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "cost",         label: "Cost" },
  { key: "costPaid",     label: "Paid / Unpaid Status" },
  { key: "driverNote",   label: "Driver Notes" },
  { key: "internalNote", label: "Internal Notes" },
];

const VIS_ROLES = ["teacher", "driver", "student"] as const;

interface Props {
  tour: TourRow;
  isOwner: boolean;
  onTourChange: (patch: Record<string, any>) => void;
}

export default function SettingsTab({ tour, isOwner, onTourChange }: Props) {
  const [vis, setVis] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(VIS_ROLES.map(r => [r, { ...(DEFAULT_VISIBILITY as any)[r] }]))
  );
  const [visSaved, setVisSaved] = useState(false);

  const toggleVis = (role: string, field: string) =>
    setVis(v => ({ ...v, [role]: { ...v[role], [field]: !v[role][field] } }));

  const saveVis = () => { setVisSaved(true); setTimeout(() => setVisSaved(false), 2500); };

  const roomConfig = tour.room_config || { boysPerRoom: 4, girlsPerRoom: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Room & Bus Configuration */}
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 12 }}>Room &amp; Bus Configuration</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Field label="Boys per Room" third>
            <Inp type="number" min={1} value={roomConfig.boysPerRoom}
              onChange={e => onTourChange({ room_config: { ...roomConfig, boysPerRoom: parseInt(e.target.value) || 1 } })}
              disabled={!isOwner} />
          </Field>
          <Field label="Girls per Room" third>
            <Inp type="number" min={1} value={roomConfig.girlsPerRoom}
              onChange={e => onTourChange({ room_config: { ...roomConfig, girlsPerRoom: parseInt(e.target.value) || 1 } })}
              disabled={!isOwner} />
          </Field>
          <Field label="Bus Capacity (seats)" third>
            <Inp type="number" min={1} value={tour.bus_capacity}
              onChange={e => onTourChange({ bus_capacity: parseInt(e.target.value) || 1 })}
              disabled={!isOwner} />
          </Field>
          <Field label="Company Margin %" third>
            <Inp type="number" min={0} max={100} step={0.5} value={tour.company_pct}
              onChange={e => onTourChange({ company_pct: parseFloat(e.target.value) || 0 })}
              disabled={!isOwner} />
          </Field>
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: 12, color: "#64748b" }}>
          Bus count includes all travelers except drivers. Room count uses student gender data. Changes here update immediately.
        </div>
      </div>

      {/* Agenda Visibility Matrix */}
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Agenda Item Visibility</div>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.6 }}>
          Control which details each role sees on agenda items. Tour Hosts always see everything.
        </p>
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "9px 14px", marginBottom: 14, fontSize: 12, color: "#0c4a6e" }}>
          <strong>Always visible to all roles:</strong> Item title, time, type, travel method, Public Notes, meal payment info, Google Maps link, and Website link.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6 }}>Field</th>
                {VIS_ROLES.map(r => (
                  <th key={r} style={{ textAlign: "center", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: ROLES_TYPED[r].color, textTransform: "uppercase", letterSpacing: .6 }}>
                    {ROLES_TYPED[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIS_FIELDS.map((f, i) => (
                <tr key={f.key} style={{ borderBottom: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 500, color: "#1e293b" }}>{f.label}</td>
                  {VIS_ROLES.map(r => (
                    <td key={r} style={{ textAlign: "center", padding: "9px 12px" }}>
                      <input
                        type="checkbox"
                        checked={vis[r]?.[f.key] ?? false}
                        onChange={() => toggleVis(r, f.key)}
                        style={{ accentColor: ROLES_TYPED[r].color, width: 15, height: 15, cursor: "pointer" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <Btn onClick={saveVis}><I n="check" s={13} />{visSaved ? "Saved" : "Save Visibility Settings"}</Btn>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Per-tour visibility storage coming in a future update</span>
        </div>
      </div>
    </div>
  );
}
