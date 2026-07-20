-- July 2026 feature-request batch, round 2 (Seth follow-up)
-- Applied to production via Supabase MCP as migration
-- "feature_requests_july_2026_round2". Source-of-truth copy.

-- 1. Per-item bus-driver map images (host + driver only). Multiple per item.
alter table agenda_items add column if not exists driver_map_urls text[] not null default '{}';

-- 2. Notes Log priority (Low / Medium / High; Medium default).
alter table tour_notes add column if not exists priority text not null default 'medium'
  check (priority in ('low','medium','high'));

-- 3. Multiple tour consultants (travel planners) per tour, mirroring teachers /
--    tour_hosts_list shape: [{ name, contact }]. Legacy planning_tour_host stays
--    synced to consultants[0].name by the app.
alter table tours add column if not exists consultants jsonb not null default '[]'::jsonb;

-- 4. Personnel directory for the host/consultant dropdowns. tour_hosts RLS is
--    own-record-only, so a SECURITY DEFINER function is required to list staff
--    accounts. Returns only non-sensitive identity fields to authenticated users.
create or replace function public.list_personnel()
  returns table (id uuid, name text, email text, phone text, role text)
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select th.id, th.name, th.email, th.phone, th.role
  from tour_hosts th
  order by th.name;
$function$;
grant execute on function public.list_personnel() to authenticated;

-- 5. get_shared_tour: STRICT SUPERSET — everything the round-1 version returned,
--    plus tours.consultants. (Per-item driver_map_urls flows automatically via
--    to_jsonb(ai) on agenda_items, so no change is needed for items.)
create or replace function public.get_shared_tour(p_tour_id uuid)
  returns jsonb
  language sql
  stable security definer
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
      'planning_tour_host', t.planning_tour_host,
      'start_date', t.start_date, 'end_date', t.end_date,
      'bus_capacity', t.bus_capacity, 'room_config', t.room_config,
      'general_feedback_enabled', t.general_feedback_enabled,
      'bus_company', t.bus_company,
      'participant_counts', t.participant_counts,
      'participants_display_override', t.participants_display_override,
      'trip_info_overrides', t.trip_info_overrides,
      'custom_trip_rows', t.custom_trip_rows,
      'teachers', t.teachers,
      'tour_hosts_list', t.tour_hosts_list,
      'consultants', t.consultants,
      'driver_map_urls', t.driver_map_urls
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
