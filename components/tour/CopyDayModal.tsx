"use client";

// Copy a whole itinerary day into another tour, or into this one (October 2026,
// Infinity request). The host picks a tour they can edit, then either adds the
// day as a new day (with a date they choose) or merges its items into a day
// that already exists there. Each item becomes a new row: confirmations,
// feedback and paid status are not copied (they belong to the original
// booking), photos are copied into the target tour's own storage folder so
// neither tour can delete a file the other still shows.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND, orderAgendaDays, orderAgendaItems, timeInsertIndex, parseAgendaDate, formatAgendaDate, toDateInput, suggestNextDate, agendaDayDateLabel } from "@/lib/helpers";
import { canEditTour, type EditorViewer } from "@/lib/roles";
import { storagePathFromUrl } from "@/components/tour/itemConfirmation";
import { Modal, Btn } from "@/components/tour/ui";
import type { AgendaDayRow, AgendaDayWithItems, AgendaItemWithFeedback, TourGroup } from "@/lib/types";

const STORAGE_BUCKET = "agenda-images";

type TourOption = {
  id: string;
  name: string;
  dates: string | null;
  start_date: string | null;
  groups: TourGroup[];
};

type TargetDay = AgendaDayRow & { agenda_items: { id: string; time: string | null; sort_order: number | null }[] };

export type BuildCopyRow = (
  item: AgendaItemWithFeedback,
  target: { tourId: string; dayId: string; sortOrder: number; newId: string; groupIds: string[] | null },
) => Record<string, unknown>;

export type CopiedIntoThisTour = {
  dayId: string;
  newDay: AgendaDayRow | null;
  items: AgendaItemWithFeedback[];
  reorder: Record<string, number>;
};

export default function CopyDayModal({ sourceTourId, sourceDay, sourceDayNumber, viewer, buildRow, onCopiedHere, onClose }: {
  sourceTourId: string;
  sourceDay: AgendaDayWithItems;
  sourceDayNumber: number;
  viewer: EditorViewer | null | undefined;
  buildRow: BuildCopyRow;
  onCopiedHere: (r: CopiedIntoThisTour) => void;
  onClose: () => void;
}) {
  const [tours, setTours] = useState<TourOption[] | null>(null);
  const [tourId, setTourId] = useState(sourceTourId);
  const [targetDays, setTargetDays] = useState<TargetDay[] | null>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newDate, setNewDate] = useState("");
  const [existingDayId, setExistingDayId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ tourId: string; tourName: string; label: string; count: number } | null>(null);

  const items = useMemo(() => orderAgendaItems(sourceDay.agenda_items ?? []), [sourceDay]);

  // Tours this viewer can edit (the same rule the database enforces), newest
  // first, with this tour at the top.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await createClient().from("tours")
        .select("id, name, dates, start_date, groups, tour_host_id, consultants, tour_hosts_list")
        .order("start_date", { ascending: false, nullsFirst: false });
      if (!active) return;
      if (error) { console.error("[copy day] tours load failed", error.message); setTours([]); return; }
      const editable = (data ?? []).filter(t => t.id === sourceTourId || canEditTour(t, viewer)) as (TourOption & Record<string, unknown>)[];
      const mapped = editable.map(t => ({ id: t.id, name: t.name, dates: t.dates ?? null, start_date: t.start_date ?? null, groups: Array.isArray(t.groups) ? t.groups as TourGroup[] : [] }));
      mapped.sort((a, b) => (a.id === sourceTourId ? -1 : b.id === sourceTourId ? 1 : 0));
      setTours(mapped);
    })();
    return () => { active = false; };
  }, [sourceTourId, viewer]);

  // The chosen tour's days, so the host can pick one or see where a new day lands.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await createClient().from("agenda_days")
        .select("id, tour_id, day_number, date, title, collapsed, sort_order, agenda_items(id, time, sort_order)")
        .eq("tour_id", tourId);
      if (!active) return;
      if (error) { console.error("[copy day] days load failed", error.message); setTargetDays([]); return; }
      const ordered = orderAgendaDays((data ?? []) as TargetDay[]);
      setTargetDays(ordered);
      setExistingDayId(ordered.find(d => d.id !== sourceDay.id)?.id ?? "");
      // New day defaults to the day after the target's last day; on an empty
      // tour, the tour's start date; otherwise this day's own date.
      const next = suggestNextDate(ordered.filter(d => d.date))
        ?? (tours?.find(t => t.id === tourId)?.start_date ? parseAgendaDate(tours!.find(t => t.id === tourId)!.start_date!) : null)
        ?? parseAgendaDate(sourceDay.date);
      setNewDate(next ? toDateInput(next) : "");
    })();
    return () => { active = false; };
  }, [tourId, sourceDay.id, sourceDay.date, tours]);

  const target = tours?.find(t => t.id === tourId) ?? null;
  const sameTour = tourId === sourceTourId;
  const existingChoices = (targetDays ?? []).filter(d => d.id !== sourceDay.id);

  // Copy one stored photo into the target tour's folder. Links that are not in
  // our storage (and any copy that fails) keep the original address.
  async function copyFile(url: string, newItemId: string, folder?: string): Promise<string> {
    const path = storagePathFromUrl(url);
    if (!path) return url;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const base = (path.split("/").pop() ?? "photo").replace(/^\d+-/, "");
      const newPath = `${tourId}/${newItemId}/${folder ? folder + "/" : ""}${Date.now()}-${base}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(newPath, blob, { contentType: blob.type || undefined, upsert: false });
      if (error) throw error;
      return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(newPath).data.publicUrl || url;
    } catch (e) {
      console.warn("[copy day] photo copy failed, sharing the original", e);
      return url;
    }
  }

  async function copy() {
    if (!target || !targetDays || busy) return;
    if (mode === "existing" && !existingDayId) return;
    setBusy(true);
    const supabase = createClient();
    let createdDay: AgendaDayRow | null = null;
    try {
      let dayId = existingDayId;
      let label = "";
      if (mode === "new") {
        const d = newDate ? new Date(newDate + "T12:00:00") : null;
        const maxSort = Math.max(0, ...targetDays.map(x => x.sort_order ?? 0));
        const maxNum = Math.max(0, ...targetDays.map(x => x.day_number ?? 0));
        const { data, error } = await supabase.from("agenda_days").insert({
          tour_id: tourId,
          day_number: maxNum + 1,
          date: d ? formatAgendaDate(d) : sourceDay.date,
          title: sourceDay.title?.trim() || null,
          collapsed: false,
          sort_order: maxSort + 1,
        }).select().single();
        if (error || !data) throw new Error(error?.message ?? "the new day was not created (permission?)");
        createdDay = data as AgendaDayRow;
        dayId = createdDay.id;
        label = `a new day${createdDay.date ? ` (${createdDay.date})` : ""}`;
      } else {
        const idx = targetDays.findIndex(x => x.id === dayId);
        const td = targetDays[idx];
        label = `Day ${idx + 1}${td?.date ? ` (${td.date})` : ""}`;
      }

      // Order: a new day keeps this day's order; merging slots each item by
      // its time among the items already there.
      const existing = mode === "existing"
        ? orderAgendaItems(targetDays.find(x => x.id === dayId)?.agenda_items ?? [])
        : [];
      type Slot = { kind: "old"; id: string; time: string | null } | { kind: "new"; item: AgendaItemWithFeedback; newId: string; time: string | null };
      const slots: Slot[] = existing.map(e => ({ kind: "old" as const, id: e.id, time: e.time }));
      for (const it of items) {
        const s: Slot = { kind: "new", item: it, newId: crypto.randomUUID(), time: it.time ?? null };
        if (mode === "new") slots.push(s);
        else slots.splice(timeInsertIndex(slots, it.time ?? null), 0, s);
      }

      const groupIds = target.groups.map(g => g.id);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s.kind !== "new") continue;
        const row = buildRow(s.item, { tourId, dayId, sortOrder: i + 1, newId: s.newId, groupIds });
        if (!sameTour) {
          const imgs = (s.item.image_urls ?? []);
          const maps = (s.item.driver_map_urls ?? []);
          const newImgs = await Promise.all(imgs.map(u => copyFile(u, s.newId)));
          const newMaps = await Promise.all(maps.map(u => copyFile(u, s.newId, "driver-maps")));
          const sizes = (s.item.image_sizes ?? {}) as Record<string, number>;
          row.image_urls = newImgs;
          row.driver_map_urls = newMaps;
          row.image_sizes = Object.fromEntries(imgs.map((u, k) => [newImgs[k], sizes[u]]).filter(([, h]) => h != null));
        }
        rows.push(row);
      }

      let inserted: AgendaItemWithFeedback[] = [];
      if (rows.length) {
        const { data, error } = await supabase.from("agenda_items").insert(rows).select();
        if (error || !data || data.length === 0) throw new Error(error?.message ?? "no items were copied (permission?)");
        inserted = (data as AgendaItemWithFeedback[]).map(r => ({ ...r, agenda_feedback: [] }));
      }

      // Existing items that moved down to make room keep a tidy order.
      const reorder: Record<string, number> = {};
      slots.forEach((s, i) => {
        if (s.kind === "old") {
          const prev = existing.find(e => e.id === s.id)?.sort_order;
          if (prev !== i + 1) reorder[s.id] = i + 1;
        }
      });
      await Promise.all(Object.entries(reorder).map(([id, so]) =>
        supabase.from("agenda_items").update({ sort_order: so }).eq("id", id)
          .then(({ error }) => { if (error) console.error("[copy day] sort_order persist failed", error.message); })));

      if (sameTour) onCopiedHere({ dayId, newDay: createdDay, items: inserted, reorder });
      setDone({ tourId, tourName: target.name, label, count: inserted.length });
    } catch (e) {
      // Do not leave an empty new day behind when the items failed.
      if (createdDay) await supabase.from("agenda_days").delete().eq("id", createdDay.id);
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`Could not copy the day: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  const title = sourceDay.title?.trim();
  const dayName = `Day ${sourceDayNumber}${sourceDay.date ? `, ${agendaDayDateLabel(sourceDay.date)}` : ""}${title ? ` · ${title}` : ""}`;
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" };

  if (done) {
    return (
      <Modal title="Day Copied" onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
            Copied {done.count} item{done.count !== 1 ? "s" : ""} into {done.label} on <strong style={{ color: "var(--ink)" }}>{done.tourId === sourceTourId ? "this tour" : done.tourName}</strong>.
            Confirmations and paid status were not copied, so the new items start unconfirmed and unpaid.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={onClose} variant="muted" style={{ flex: 1, justifyContent: "center" }}>Done</Btn>
            {done.tourId !== sourceTourId && (
              <a href={`/tour/${done.tourId}`} style={{ flex: 1, display: "inline-flex", justifyContent: "center", alignItems: "center", borderRadius: 8, background: BRAND.navy, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none", padding: "8px 16px" }}>
                Open {done.tourName}
              </a>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Copy Day" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
          Copy <strong style={{ color: "var(--ink)" }}>{dayName}</strong> ({items.length} item{items.length !== 1 ? "s" : ""}) to a tour you can edit. Each copy can be changed on its own afterward.
        </div>

        <div>
          <div style={labelStyle}>Copy to tour</div>
          {tours === null ? (
            <div style={{ fontSize: 12, color: "var(--muted-2)" }}>Loading tours…</div>
          ) : (
            <select value={tourId} onChange={e => { setTargetDays(null); setMode("new"); setTourId(e.target.value); }} style={inputStyle}>
              {tours.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id === sourceTourId ? `This tour (${t.name})` : `${t.name}${t.dates ? `, ${t.dates}` : ""}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <div style={labelStyle}>Where</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
              <input type="radio" name="copyday-mode" checked={mode === "new"} onChange={() => setMode("new")} style={{ accentColor: BRAND.navy }} />
              Add as a new day
            </label>
            {mode === "new" && (
              <div style={{ paddingLeft: 24 }}>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ ...inputStyle, width: "auto" }} />
                <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>
                  {title ? `Keeps the day title "${title}". ` : ""}You can change the date later.
                </div>
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: existingChoices.length ? "pointer" : "default", color: existingChoices.length ? "var(--text)" : "var(--muted-2)" }}>
              <input type="radio" name="copyday-mode" disabled={!existingChoices.length} checked={mode === "existing"} onChange={() => setMode("existing")} style={{ accentColor: BRAND.navy }} />
              Add the items to a day that is already there
            </label>
            {mode === "existing" && (
              <div style={{ paddingLeft: 24 }}>
                <select value={existingDayId} onChange={e => setExistingDayId(e.target.value)} style={inputStyle}>
                  {(targetDays ?? []).map((d, i) => d.id === sourceDay.id ? null : (
                    <option key={d.id} value={d.id}>
                      Day {i + 1}{d.date ? `, ${d.date}` : ""}{d.title ? ` · ${d.title}` : ""}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 4 }}>Items are slotted in by their times.</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "8px 10px" }}>
          Copied: times, details, notes, addresses, contacts, costs, photos and who sees each item.
          Not copied: confirmation files and paid status (the copies start unconfirmed and unpaid){sameTour ? "" : ", and group tags the other tour does not have"}.
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onClose} variant="muted" style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
          <Btn onClick={copy} disabled={busy || !targetDays || !target || (mode === "existing" && !existingDayId) || (mode === "new" && !newDate && !sourceDay.date)} style={{ flex: 1, justifyContent: "center" }}>
            {busy ? "Copying…" : "Copy Day"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
