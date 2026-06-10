"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TourConfirmationRow } from "@/lib/types";

// Tour-level confirmations live in the existing public storage bucket.
const STORAGE_BUCKET = "agenda-images";

const TYPES = [
  { key: "flight", label: "Flight Confirmation" },
  { key: "hotel",  label: "Hotel Confirmation" },
  { key: "bus",    label: "Bus Confirmation" },
] as const;

const linkStyle: React.CSSProperties = { color: "#0369a1", textDecoration: "none", fontWeight: 600, fontSize: 12 };

export default function TripConfirmationsRow({ tourId }: { tourId: string }) {
  const [rows, setRows] = useState<TourConfirmationRow[]>([]);
  const [busyType, setBusyType] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("tour_confirmations").select("*").eq("tour_id", tourId).order("uploaded_at", { ascending: false });
      if (active) setRows((data ?? []) as TourConfirmationRow[]);
    })();
    return () => { active = false; };
  }, [tourId]);

  const byType = (t: string) => rows.find(r => r.type === t) ?? null;

  async function handleUpload(type: string, file: File | undefined) {
    if (!file) return;
    setBusyType(type);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tourId}/tour-confirmations/${type}-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      console.error("Confirmation upload failed", upErr.message);
    } else {
      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from("tour_confirmations")
        .insert({ tour_id: tourId, type, label: TYPES.find(t => t.key === type)?.label ?? null, file_url: pub.publicUrl, uploaded_by: user?.id ?? null })
        .select().single();
      if (error) console.error("Confirmation insert failed", error.message);
      else if (row) setRows(prev => [row as TourConfirmationRow, ...prev.filter(r => r.type !== type)]);
    }
    setBusyType(null);
    const el = inputs.current[type]; if (el) el.value = "";
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("tour_confirmations").delete().eq("id", id);
    setRows(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {TYPES.map(t => {
        const c = byType(t.key);
        return (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {c
              ? <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
              : <Circle size={15} color="#cbd5e1" style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, color: c ? "#1e293b" : "#94a3b8" }}>{t.label}</span>
            {c ? (
              <>
                <a href={c.file_url} target="_blank" rel="noreferrer" style={linkStyle}>View</a>
                <button type="button" title="Remove confirmation" onClick={() => remove(c.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, lineHeight: 0, flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <input ref={el => { inputs.current[t.key] = el; }} type="file" accept="image/*,.pdf" style={{ display: "none" }}
                  onChange={e => handleUpload(t.key, e.target.files?.[0])} />
                <button type="button" onClick={() => inputs.current[t.key]?.click()} disabled={busyType === t.key}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  <Upload size={12} />{busyType === t.key ? "Uploading…" : "Upload"}
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
