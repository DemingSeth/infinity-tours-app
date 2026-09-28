-- September 2026: make the name and email fallbacks in can_edit_tour forgiving
-- of case and stray spaces ("Linda Deming " or "linda deming" typed by hand
-- still grants edit access). The account-id match is unchanged and still
-- preferred. Mirrors lib/roles.ts canEditTour().
create or replace function public.can_edit_tour(p_tour uuid, p_user uuid default auth.uid())
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
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
               or (nullif(trim(me.email), '') is not null and lower(trim(coalesce(p->>'contact', ''))) = lower(trim(me.email)))
               or (nullif(trim(me.name), '') is not null and lower(trim(coalesce(p->>'name', ''))) = lower(trim(me.name)))
         )
       )
  );
$function$;
