-- October 21, 2026: last setup-period requests.
-- 1. A host-written title beside "Day N  date" on each itinerary day.
-- 2. "Pay at Venue" payment option on itinerary items (beside Deposit Paid).
-- 3. get_shared_tour returns the day title so shared links and print show it.
-- Additive only. Run before deploying the matching app commit.

alter table public.agenda_days add column if not exists title text;
alter table public.agenda_items add column if not exists pay_at_venue boolean not null default false;

CREATE OR REPLACE FUNCTION public.get_shared_tour(p_tour_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'confirmations_teacher_visible', t.confirmations_teacher_visible,
      'internal_notes_teacher_visible', t.internal_notes_teacher_visible,
      'summary_personas', to_jsonb(t.summary_personas),
      'trip_info_row_order', to_jsonb(t.trip_info_row_order)
    ),
    'host', (
      select jsonb_build_object('name', th.name, 'phone', th.phone)
      from tour_hosts th where th.id = t.tour_host_id
    ),
    'days', coalesce((
      select jsonb_agg(d order by d.sort_order)
      from (
        select ad.id, ad.tour_id, ad.day_number, ad.date, ad.title, ad.collapsed, ad.sort_order,
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
