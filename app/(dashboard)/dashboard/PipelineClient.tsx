"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/helpers";
import PipelineView from "@/components/pipeline/PipelineView";
import NewTourModal from "@/components/pipeline/NewTourModal";

interface Props {
  initialTours: any[];
  currentHostId: string;
  currentHostName: string;
}

export default function PipelineClient({ initialTours, currentHostId, currentHostName }: Props) {
  const router = useRouter();
  const [tours, setTours] = useState(initialTours);
  const [showNewTour, setShowNewTour] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  // Tour pending delete confirmation (accidental duplicates / cancelled trips).
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirmed() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const supabase = createClient();
    // FK cascades remove agenda days/items, roster, notes, etc. RLS restricts
    // this to the tour's owner. Inspect the result — a silent zero-row delete
    // must not look like success.
    const { data, error } = await supabase.from("tours").delete().eq("id", deleteTarget.id).select("id");
    setDeleting(false);
    if (error || !data || data.length === 0) {
      window.alert(`Could not delete tour: ${error?.message ?? "only the tour's owner can delete it"}`);
      return;
    }
    setTours(prev => prev.filter(t => t.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function handleNewTour(fields: {
    name: string; school: string; destination: string;
    dates: string; status: string; transport_type: string;
    activePersonas: string[]; personaLabels: Record<string, string>;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tours")
      .insert({
        tour_host_id: currentHostId,
        name: fields.name,
        school: fields.school,
        destination: fields.destination,
        dates: fields.dates,
        status: fields.status as any,
        transport_type: fields.transport_type as any,
        access_codes: { coordinator: "", teacher: "", driver: "", student: "", chaperone: "" },
        active_personas: fields.activePersonas,
        persona_labels: fields.personaLabels,
      })
      .select("*, tour_hosts(id, name, initials), tour_members(id, type, waiver)")
      .single();

    if (!error && data) {
      setShowNewTour(false);
      router.push(`/tour/${data.id}`);
    }
  }

  async function handleDuplicate(tourId: string) {
    setDuplicating(tourId);
    const supabase = createClient();

    // Load full tour with agenda
    const { data: source } = await supabase
      .from("tours")
      .select("*")
      .eq("id", tourId)
      .single();

    if (!source) { setDuplicating(null); return; }

    // Create new tour shell
    const { data: newTour, error } = await supabase
      .from("tours")
      .insert({
        tour_host_id: currentHostId,
        name: `${source.name} (copy)`,
        school: source.school,
        contact_name: source.contact_name,
        contact_email: source.contact_email,
        contact_phone: source.contact_phone,
        planning_tour_host: source.planning_tour_host,
        traveling_tour_host: source.traveling_tour_host,
        destination: source.destination,
        alt_destination: source.alt_destination,
        dates: source.dates,
        start_date: source.start_date,
        end_date: source.end_date,
        date_flexible: source.date_flexible,
        status: "bid",
        transport_type: source.transport_type,
        bus_capacity: source.bus_capacity,
        company_pct: source.company_pct,
        room_config: source.room_config,
        activities: source.activities,
        notes: source.notes,
        access_codes: { coordinator: "", teacher: "", driver: "", student: "" },
        // Newer tour-level fields — carried over so a duplicate looks like the
        // original (personas, labels, bus info, trip-info edits, banner).
        active_personas: source.active_personas,
        persona_labels: source.persona_labels,
        general_feedback_enabled: source.general_feedback_enabled,
        bus_company: source.bus_company,
        bus_driver_contact: source.bus_driver_contact,
        participant_counts: source.participant_counts,
        participants_display_override: source.participants_display_override,
        trip_info_overrides: source.trip_info_overrides,
        custom_trip_rows: source.custom_trip_rows,
        teachers: source.teachers,
        tour_hosts_list: source.tour_hosts_list,
        driver_map_urls: source.driver_map_urls,
        banner_image_url: source.banner_image_url,
        banner_focus_x: source.banner_focus_x,
        banner_focus_y: source.banner_focus_y,
      })
      .select("*, tour_hosts(id, name, initials), tour_members(id, type, waiver)")
      .single();

    if (error || !newTour) { setDuplicating(null); return; }

    // Copy agenda days + items
    const { data: days } = await supabase
      .from("agenda_days")
      .select("*, agenda_items(*)")
      .eq("tour_id", tourId)
      .order("sort_order");

    if (days?.length) {
      for (const day of days) {
        const { data: newDay } = await supabase
          .from("agenda_days")
          .insert({
            tour_id: newTour.id,
            day_number: day.day_number,
            date: day.date,
            collapsed: day.collapsed,
            sort_order: day.sort_order,
          })
          .select("id")
          .single();

        if (newDay && day.agenda_items?.length) {
          const items = day.agenda_items.map((item: any) => ({
            day_id: newDay.id,
            tour_id: newTour.id,
            sort_order: item.sort_order,
            time: item.time,
            end_time: item.end_time,
            type: item.type,
            title: item.title,
            detail: item.detail,
            public_note: item.public_note,
            address: item.address,
            map_link: item.map_link,
            website: item.website,
            travel_methods: item.travel_methods,
            activity_subtypes: item.activity_subtypes,
            travel_method: item.travel_method,
            activity_subtype: item.activity_subtype,
            flight_icon_color: item.flight_icon_color,
            bus_icon_color: item.bus_icon_color,
            contact_name: item.contact_name,
            contact_phone: item.contact_phone,
            contact_email: item.contact_email,
            cost: item.cost,
            cost_paid: false,
            driver_note: item.driver_note,
            internal_note: item.internal_note,
            meal_money: item.meal_money,
            meal_pay_type: item.meal_pay_type,
            stipend_amount: item.stipend_amount,
            item_visibility: item.item_visibility,
            persona_visibility: item.persona_visibility,
            feedback_enabled: item.feedback_enabled,
            image_urls: item.image_urls,
            confirmation_not_required: item.confirmation_not_required,
          }));
          await supabase.from("agenda_items").insert(items);
        }
      }
    }

    setTours(prev => [newTour, ...prev]);
    setDuplicating(null);
    router.push(`/tour/${newTour.id}`);
  }

  return (
    <>
      <PipelineView
        tours={tours}
        currentHostId={currentHostId}
        currentHostName={currentHostName}
        duplicatingId={duplicating}
        onSelectTour={(id) => router.push(`/tour/${id}`)}
        onNewTour={() => setShowNewTour(true)}
        onDuplicate={handleDuplicate}
        onDelete={(id) => setDeleteTarget(tours.find(t => t.id === id) ?? null)}
      />
      {showNewTour && (
        <NewTourModal
          onClose={() => setShowNewTour(false)}
          onCreate={handleNewTour}
        />
      )}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ fontFamily: "'Fjalla One',Georgia,sans-serif", letterSpacing: "0.03em", fontSize: 17, fontWeight: 400, color: BRAND.navy, marginBottom: 10 }}>
              Delete Tour?
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 8px", lineHeight: 1.6 }}>
              You&rsquo;re about to permanently delete <strong>{deleteTarget.name}</strong>
              {deleteTarget.school ? <> ({deleteTarget.school})</> : null}, including its itinerary, roster, confirmations, and notes.
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 18px", lineHeight: 1.6 }}>
              Use this for accidental duplicates or groups that are no longer traveling. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ flex: 1, background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? "Deleting…" : "Delete Tour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
