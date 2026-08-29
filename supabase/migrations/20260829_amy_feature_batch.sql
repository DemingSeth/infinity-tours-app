-- August 2026 feature batch (Amy / Infinity Tours)
--
-- 1. New columns: item elevate link, meeting icon color, item group tags,
--    tour groups, teacher confirmation visibility.
-- 2. Multi-editor access: the tour owner, any staff account listed as a Tour
--    Host or Tour Consultant on the tour, and admins can all edit the tour and
--    everything scoped to it. Previously only tours.tour_host_id could write.
-- 3. get_shared_tour recreated as a strict superset (+ groups,
--    confirmations_teacher_visible) so the public itinerary can filter by group
--    and gate confirmation links.

-- ── 1. Columns ─────────────────────────────────────────────────────────────────
alter table public.agenda_items add column if not exists elevate_url text;
alter table public.agenda_items add column if not exists meeting_icon_color text;
alter table public.agenda_items add column if not exists group_tags text[] not null default '{}';

alter table public.tours add column if not exists groups jsonb not null default '[]'::jsonb;
alter table public.tours add column if not exists confirmations_teacher_visible boolean not null default false;

-- ── 2. Multi-editor access ─────────────────────────────────────────────────────
-- Who may edit a tour: the owner, admins, and any staff account listed in
-- tours.consultants / tours.tour_hosts_list. Listed people match on the account
-- id stored by the staff dropdown, with an email fallback (consultant contact
-- is an email) and an exact-name fallback for entries saved before ids existed.
create or replace function public.can_edit_tour(p_tour uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null and exists (
    select 1
      from tours t
      left join tour_hosts me on me.id = p_user
     where t.id = p_tour
       and (
         t.tour_host_id = p_user
         or public.is_admin(p_user)
         or exists (
           select 1
             from jsonb_array_elements(coalesce(t.consultants, '[]'::jsonb) || coalesce(t.tour_hosts_list, '[]'::jsonb)) p
            where (p->>'id') = p_user::text
               or (me.email is not null and lower(coalesce(p->>'contact', '')) = lower(me.email))
               or (me.name is not null and coalesce(p->>'name', '') = me.name)
         )
       )
  );
$$;

grant execute on function public.can_edit_tour(uuid, uuid) to authenticated;

-- tours: update for editors; delete stays owner + admin.
drop policy if exists "Tour hosts update own tours" on public.tours;
create policy "Tour editors update tours" on public.tours
  for update to authenticated
  using (public.can_edit_tour(id))
  with check (public.can_edit_tour(id));

drop policy if exists "Tour hosts delete own tours" on public.tours;
create policy "Tour owners and admins delete tours" on public.tours
  for delete to authenticated
  using (tour_host_id = auth.uid() or public.is_admin());

-- agenda_days
drop policy if exists "Tour hosts insert agenda days" on public.agenda_days;
drop policy if exists "Tour hosts update agenda days" on public.agenda_days;
drop policy if exists "Tour hosts delete agenda days" on public.agenda_days;
create policy "Tour editors insert agenda days" on public.agenda_days for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update agenda days" on public.agenda_days for update to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors delete agenda days" on public.agenda_days for delete to authenticated using (public.can_edit_tour(tour_id));

-- agenda_items
drop policy if exists "Tour hosts insert agenda items" on public.agenda_items;
drop policy if exists "Tour hosts update agenda items" on public.agenda_items;
drop policy if exists "Tour hosts delete agenda items" on public.agenda_items;
create policy "Tour editors insert agenda items" on public.agenda_items for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update agenda items" on public.agenda_items for update to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors delete agenda items" on public.agenda_items for delete to authenticated using (public.can_edit_tour(tour_id));

-- tour_members
drop policy if exists "Tour hosts insert tour members" on public.tour_members;
drop policy if exists "Tour hosts update tour members" on public.tour_members;
drop policy if exists "Tour hosts delete tour members" on public.tour_members;
create policy "Tour editors insert tour members" on public.tour_members for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update tour members" on public.tour_members for update to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors delete tour members" on public.tour_members for delete to authenticated using (public.can_edit_tour(tour_id));

-- participant_groups / members
drop policy if exists "Tour hosts insert participant groups" on public.participant_groups;
drop policy if exists "Tour hosts update participant groups" on public.participant_groups;
drop policy if exists "Tour hosts delete participant groups" on public.participant_groups;
create policy "Tour editors insert participant groups" on public.participant_groups for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update participant groups" on public.participant_groups for update to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors delete participant groups" on public.participant_groups for delete to authenticated using (public.can_edit_tour(tour_id));

drop policy if exists "Tour hosts insert participant group members" on public.participant_group_members;
drop policy if exists "Tour hosts delete participant group members" on public.participant_group_members;
create policy "Tour editors insert participant group members" on public.participant_group_members for insert to authenticated
  with check (exists (select 1 from participant_groups g where g.id = group_id and public.can_edit_tour(g.tour_id)));
create policy "Tour editors delete participant group members" on public.participant_group_members for delete to authenticated
  using (exists (select 1 from participant_groups g where g.id = group_id and public.can_edit_tour(g.tour_id)));

-- post_trip / post_trip_reviews
drop policy if exists "Tour hosts insert post trip" on public.post_trip;
drop policy if exists "Tour hosts update post trip" on public.post_trip;
create policy "Tour editors insert post trip" on public.post_trip for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update post trip" on public.post_trip for update to authenticated using (public.can_edit_tour(tour_id));

drop policy if exists "Tour hosts insert post trip reviews" on public.post_trip_reviews;
drop policy if exists "Tour hosts update post trip reviews" on public.post_trip_reviews;
create policy "Tour editors insert post trip reviews" on public.post_trip_reviews for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update post trip reviews" on public.post_trip_reviews for update to authenticated using (public.can_edit_tour(tour_id));

-- tour_notes
drop policy if exists "Tour hosts insert tour notes" on public.tour_notes;
drop policy if exists "Tour hosts update tour notes" on public.tour_notes;
drop policy if exists "Tour hosts delete tour notes" on public.tour_notes;
create policy "Tour editors insert tour notes" on public.tour_notes for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors update tour notes" on public.tour_notes for update to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors delete tour notes" on public.tour_notes for delete to authenticated using (public.can_edit_tour(tour_id));

-- tour_confirmations (select was owner-only, so a listed editor could not even
-- see the attached confirmations in the host view)
drop policy if exists "Hosts read own tour confirmations" on public.tour_confirmations;
drop policy if exists "Hosts insert own tour confirmations" on public.tour_confirmations;
drop policy if exists "Hosts delete own tour confirmations" on public.tour_confirmations;
create policy "Tour editors read tour confirmations" on public.tour_confirmations for select to authenticated using (public.can_edit_tour(tour_id));
create policy "Tour editors insert tour confirmations" on public.tour_confirmations for insert to authenticated with check (public.can_edit_tour(tour_id));
create policy "Tour editors delete tour confirmations" on public.tour_confirmations for delete to authenticated using (public.can_edit_tour(tour_id));

-- ── 3. get_shared_tour: strict superset ───────────────────────────────────────
create or replace function public.get_shared_tour(p_tour_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
      'driver_map_urls', t.driver_map_urls,
      'groups', t.groups,
      'confirmations_teacher_visible', t.confirmations_teacher_visible
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
$$;
