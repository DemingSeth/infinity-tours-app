"use client";

import { useState } from "react";
import Image from "next/image";
import { BRAND, ROLES, DEFAULT_VISIBILITY, PERSONAS, activePersonaKeys } from "@/lib/helpers";
import { I, Field, Inp, Btn } from "@/components/tour/ui";
import FocalPointPicker from "@/components/tour/FocalPointPicker";
import BannerLibraryPicker from "@/components/tour/BannerLibraryPicker";
import BannerLibraryManager from "@/components/tour/BannerLibraryManager";
import type { TourRow } from "@/lib/types";

const ROLES_TYPED = ROLES as Record<string, { label: string; color: string; bg: string }>;

function BannerUploader({ tour, isOwner, onTourChange }: {
  tour: TourRow; isOwner: boolean; onTourChange: (patch: Record<string, any>) => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState({ x: 50, y: 50 });

  const focusX = tour.banner_focus_x ?? 50;
  const focusY = tour.banner_focus_y ?? 50;

  // Apply a chosen library image (reset focus, open the focal adjuster) or clear it.
  function chooseImage(url: string | null) {
    if (url) {
      onTourChange({ banner_image_url: url, banner_focus_x: 50, banner_focus_y: 50 });
      setDraft({ x: 50, y: 50 });
      setAdjusting(true);
    } else {
      onTourChange({ banner_image_url: null });
      setAdjusting(false);
    }
  }

  function openAdjust() {
    setDraft({ x: focusX, y: focusY });
    setAdjusting(true);
  }

  function saveFocus() {
    onTourChange({ banner_focus_x: draft.x, banner_focus_y: draft.y });
    setAdjusting(false);
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Banner Image</div>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.6 }}>
        Choose from the approved image library to show behind the itinerary header. Leave empty for the default navy header.
      </p>

      {/* Saved-state preview (header crop at the saved focal point) */}
      {tour.banner_image_url && !adjusting && (
        <div style={{ position: "relative", width: "100%", height: 130, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9", marginBottom: 12 }}>
          <Image src={tour.banner_image_url} alt="Tour banner" fill sizes="(max-width: 720px) 100vw, 680px" style={{ objectFit: "cover", objectPosition: `${focusX}% ${focusY}%` }} />
        </div>
      )}

      {/* Focal point picker */}
      {tour.banner_image_url && adjusting && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
            Drag the focal point to the most important part of the photo. The header keeps this point visible when it crops.
          </div>
          <FocalPointPicker imageUrl={tour.banner_image_url} x={draft.x} y={draft.y} onChange={(x, y) => setDraft({ x, y })} />

          {/* Live header crop preview */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Header preview</div>
            <div style={{ position: "relative", width: "100%", maxWidth: 360, height: 96, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9" }}>
              <Image src={tour.banner_image_url} alt="Header preview" fill sizes="360px" style={{ objectFit: "cover", objectPosition: `${draft.x}% ${draft.y}%` }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.70))" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <Btn onClick={saveFocus} disabled={!isOwner}><I n="check" s={13} />Save Focus</Btn>
            <Btn variant="muted" onClick={() => setAdjusting(false)}>Cancel</Btn>
            <button
              type="button"
              onClick={() => setDraft({ x: 50, y: 50 })}
              style={{ background: "none", border: "none", color: "#0369a1", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
            >
              Reset to Center
            </button>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Focus: {draft.x}% / {draft.y}%</span>
          </div>
        </div>
      )}

      {!adjusting && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => setPicking(true)} disabled={!isOwner}>
            {tour.banner_image_url ? "Change Banner Image" : "Choose Banner Image"}
          </Btn>
          {tour.banner_image_url && isOwner && (
            <Btn variant="muted" onClick={openAdjust}>Adjust Focus</Btn>
          )}
          {tour.banner_image_url && isOwner && (
            <Btn variant="muted" onClick={() => chooseImage(null)}>Remove Banner</Btn>
          )}
        </div>
      )}

      {picking && (
        <BannerLibraryPicker
          tourDestination={tour.destination}
          currentUrl={tour.banner_image_url}
          onSelect={chooseImage}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

function PersonaConfig({ tour, isOwner, onTourChange }: {
  tour: TourRow; isOwner: boolean; onTourChange: (patch: Record<string, any>) => void;
}) {
  const active = activePersonaKeys(tour.active_personas);
  const labels = (tour.persona_labels || {}) as Record<string, string>;
  const [draft, setDraft] = useState<Record<string, string>>({ ...labels });

  function toggle(key: string) {
    const p = PERSONAS.find(x => x.key === key);
    if (!p || p.locked || !isOwner) return;
    const next = active.includes(key) ? active.filter(k => k !== key) : [...active, key];
    onTourChange({ active_personas: PERSONAS.filter(x => next.includes(x.key)).map(x => x.key) });
  }

  function saveLabel(key: string) {
    const v = (draft[key] ?? "").trim();
    const next = { ...labels };
    if (v) next[key] = v; else delete next[key];
    onTourChange({ persona_labels: next });
  }

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
      <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Participant Personas</div>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.6 }}>
        Choose which participant types are active for this tour. Active personas control the preview buttons, access codes, and labels shown to travelers. Customize any label (e.g. &ldquo;Choir Member&rdquo;).
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PERSONAS.map(p => {
          const on = active.includes(p.key);
          return (
            <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: on ? "#f8fafc" : "#fff", border: "1px solid #eef2f7", borderRadius: 9 }}>
              <input
                type="checkbox"
                checked={on}
                disabled={p.locked || !isOwner}
                onChange={() => toggle(p.key)}
                title={p.locked ? "Tour Host is always on" : undefined}
                style={{ accentColor: BRAND.navy, width: 16, height: 16, cursor: p.locked || !isOwner ? "default" : "pointer", flexShrink: 0 }}
              />
              <div style={{ width: 96, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: on ? BRAND.navy : "#94a3b8" }}>
                {p.default}{p.locked && <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}> 🔒</span>}
              </div>
              <Inp
                value={draft[p.key] ?? ""}
                placeholder={`Label (default: ${p.default})`}
                onChange={e => setDraft(d => ({ ...d, [p.key]: e.target.value }))}
                onBlur={() => saveLabel(p.key)}
                disabled={!isOwner}
                style={{ flex: 1, padding: "6px 10px", fontSize: 12 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  viewerIsAdmin: boolean;
  currentUserId: string;
  onTourChange: (patch: Record<string, any>) => void;
}

export default function SettingsTab({ tour, isOwner, viewerIsAdmin, currentUserId, onTourChange }: Props) {
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
      {/* Manage Banner Library — admin only, above the chooser */}
      {viewerIsAdmin && (
        <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Manage Banner Library</div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.6 }}>
            Approved images that all tour hosts can choose from. Admin only.
          </p>
          <BannerLibraryManager currentHostId={currentUserId} />
        </div>
      )}

      {/* Banner Image — choose from the library */}
      <BannerUploader tour={tour} isOwner={isOwner} onTourChange={onTourChange} />

      {/* Participant Personas */}
      <PersonaConfig tour={tour} isOwner={isOwner} onTourChange={onTourChange} />

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

      {/* Itinerary Visibility Matrix */}
      <div style={{ background: "#fff", border: "1.5px solid #e8eef4", borderRadius: 14, padding: 20 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',Georgia,serif", fontSize: 15, fontWeight: 700, color: BRAND.navy, marginBottom: 6 }}>Itinerary Item Visibility</div>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px", lineHeight: 1.6 }}>
          Control which details each role sees on itinerary items. Tour Hosts always see everything.
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
