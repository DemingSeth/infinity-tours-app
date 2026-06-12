-- Trip Information: manual participant counts + bus company / driver contact.
-- The UI says "Itinerary/Trip Information"; tables keep their original names.
-- Additive + idempotent — safe to paste into the Supabase SQL Editor.

-- Part A: per-persona manual count overrides, e.g. {"student": 26, "chaperone": 11}.
-- When a key is present, Trip Information uses it; otherwise it falls back to the
-- roster-derived count.
alter table tours
  add column if not exists participant_counts jsonb not null default '{}'::jsonb;

-- Part B: the bus company name (was parsed from the bus item title) ...
alter table tours
  add column if not exists bus_company text;

-- ... and the host-only bus driver contact, e.g. {"name": "Joe", "phone": "555-1234"}.
-- Intentionally NOT exposed by the public RPC below — host-facing only.
alter table tours
  add column if not exists bus_driver_contact jsonb;

-- Safety: this migration's RPC references general_feedback_enabled, so ensure the
-- column exists even if the general-tour-feedback migration hasn't run yet.
alter table tours
  add column if not exists general_feedback_enabled boolean not null default true;

-- Refresh the public itinerary payload (SECURITY DEFINER RPC) to add bus_company
-- and participant_counts. bus_driver_contact is deliberately omitted so it can
-- never reach participants. This is the authoritative definition — run it last
-- among RPC-affecting migrations.
create or replace function public.get_shared_tour(p_tour_id uuid)
  returns jsonb
  language sql
  stable
  security definer
  set search_path to 'public'
as $function$
  select jsonb_build_object(
    'tour', jsonb_build_object(
      'id', t.id, 'name', t.name, 'destination', t.destination, 'dates', t.dates,
      'access_codes', t.access_codes, 'banner_image_url', t.banner_image_url,
      'banner_focus_x', t.banner_focus_x, 'banner_focus_y', t.banner_focus_y,
      'active_personas', t.active_personas, 'persona_labels', t.persona_labels,
      'contact_name', t.contact_name, 'contact_email', t.contact_email,
      'traveling_tour_host', t.traveling_tour_host,
      'start_date', t.start_date, 'end_date', t.end_date,
      'bus_capacity', t.bus_capacity, 'room_config', t.room_config,
      'general_feedback_enabled', t.general_feedback_enabled,
      'bus_company', t.bus_company,
      'participant_counts', t.participant_counts
    ),
    'host', (
      select jsonb_build_object('name', th.name, 'phone', th.phone)
      from tour_hosts th where th.id = t.tour_host_id
    ),
    'days', coalesce((
      select jsonb_agg(d order by d.sort_order)
      from (
        select ad.id, ad.tour_id, ad.day_number, ad.date, ad.collapsed, ad.sort_order,
          coalesce(
            (select jsonb_agg(to_jsonb(ai) order by ai.sort_order)
             from agenda_items ai where ai.day_id = ad.id),
            '[]'::jsonb
          ) as agenda_items
        from agenda_days ad where ad.tour_id = t.id
      ) d
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('type', tm.type))
      from tour_members tm where tm.tour_id = t.id
    ), '[]'::jsonb),
    'confirmations', coalesce((
      select jsonb_agg(jsonb_build_object('type', tc.type, 'label', tc.label, 'file_url', tc.file_url) order by tc.uploaded_at desc)
      from tour_confirmations tc where tc.tour_id = t.id
    ), '[]'::jsonb)
  )
  from tours t
  where t.id = p_tour_id;
$function$;
