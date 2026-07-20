-- July 2026 feature-request batch (Amy Hill's list, sent 7/20/26)
-- Applied to production via Supabase MCP on 2026-07-20 as
-- migration "feature_requests_july_2026". Kept here as the source-of-truth copy.

-- 1. Agenda items: optional end time + bus icon color (mirrors flight_icon_color)
alter table agenda_items add column if not exists end_time text;
alter table agenda_items add column if not exists bus_icon_color text;

-- 2. Tours: independently editable Trip Information top section
--    trip_info_overrides: { flight: text, hotel: text, bus: text } free-text blocks
--    custom_trip_rows: [{ id, label, value, url }] host-named extra rows / links
--    teachers: [{ name, email }] multiple teachers
--    tour_hosts_list: [{ name, phone }] multiple tour hosts
--    driver_map_urls: map images for bus drivers and hosts only
alter table tours add column if not exists trip_info_overrides jsonb not null default '{}'::jsonb;
alter table tours add column if not exists custom_trip_rows jsonb not null default '[]'::jsonb;
alter table tours add column if not exists teachers jsonb not null default '[]'::jsonb;
alter table tours add column if not exists tour_hosts_list jsonb not null default '[]'::jsonb;
alter table tours add column if not exists driver_map_urls text[] not null default '{}';

-- 3. Timestamped, collapsible overview notes (multiple per tour)
create table if not exists tour_notes (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  text text not null,
  created_by uuid references tour_hosts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tour_notes_tour_id_idx on tour_notes(tour_id);
alter table tour_notes enable row level security;
drop policy if exists "Read tour notes" on tour_notes;
create policy "Read tour notes" on tour_notes for select to authenticated using (true);
drop policy if exists "Tour hosts insert tour notes" on tour_notes;
create policy "Tour hosts insert tour notes" on tour_notes for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));
drop policy if exists "Tour hosts update tour notes" on tour_notes;
create policy "Tour hosts update tour notes" on tour_notes for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));
drop policy if exists "Tour hosts delete tour notes" on tour_notes;
create policy "Tour hosts delete tour notes" on tour_notes for delete to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));
grant all on table public.tour_notes to authenticated, service_role;

-- 4. Normalize agenda_items.sort_order to the CURRENT time-sorted display order,
--    so switching the app to manual (drag) ordering is visually a no-op.
--    Mirrors the client timeToMinutes(): "5:20 PM" / "14:30" formats.
create or replace function public._time_to_minutes(t text)
returns int language plpgsql immutable as $$
declare m text[]; h int; mi int; mer text;
begin
  if t is null or btrim(t) = '' then return null; end if;
  m := regexp_match(btrim(t), '^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$');
  if m is not null then
    h := m[1]::int; mi := coalesce(m[2], '0')::int; mer := lower(m[3]);
    if mi > 59 then return null; end if;
    if mer = 'a' then
      if h = 12 then h := 0; end if;
    else
      if h <> 12 then h := h + 12; end if;
    end if;
    if h > 23 then return null; end if;
    return h * 60 + mi;
  end if;
  m := regexp_match(btrim(t), '^(\d{1,2}):(\d{2})$');
  if m is null then return null; end if;
  h := m[1]::int; mi := m[2]::int;
  if h > 23 or mi > 59 then return null; end if;
  return h * 60 + mi;
end $$;

update agenda_items ai set sort_order = o.rn
from (
  select id, row_number() over (
    partition by day_id
    order by (public._time_to_minutes("time") is null),
             public._time_to_minutes("time"),
             sort_order, created_at, id
  ) as rn
  from agenda_items
) o
where o.id = ai.id and ai.sort_order is distinct from o.rn;

-- 5. get_shared_tour: STRICT SUPERSET of the current version — every existing
--    field kept, plus planning_tour_host, trip_info_overrides, custom_trip_rows,
--    teachers, tour_hosts_list, driver_map_urls.
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
