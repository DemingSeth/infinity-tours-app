"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

  async function handleNewTour(fields: {
    name: string; school: string; destination: string;
    dates: string; status: string; transport_type: string;
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
        access_codes: { coordinator: "", teacher: "", driver: "", student: "" },
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
        date_flexible: source.date_flexible,
        status: "bid",
        transport_type: source.transport_type,
        bus_capacity: source.bus_capacity,
        company_pct: source.company_pct,
        room_config: source.room_config,
        activities: source.activities,
        notes: source.notes,
        access_codes: { coordinator: "", teacher: "", driver: "", student: "" },
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
            type: item.type,
            title: item.title,
            detail: item.detail,
            public_note: item.public_note,
            address: item.address,
            map_link: item.map_link,
            website: item.website,
            travel_method: item.travel_method,
            contact_name: item.contact_name,
            contact_phone: item.contact_phone,
            contact_email: item.contact_email,
            cost: item.cost,
            cost_paid: false,
            driver_note: item.driver_note,
            internal_note: item.internal_note,
            meal_pay_type: item.meal_pay_type,
            stipend_amount: item.stipend_amount,
            item_visibility: item.item_visibility,
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
      />
      {showNewTour && (
        <NewTourModal
          onClose={() => setShowNewTour(false)}
          onCreate={handleNewTour}
        />
      )}
    </>
  );
}
