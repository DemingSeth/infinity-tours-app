-- Grant table access to PostgREST roles
grant usage on schema public to anon, authenticated, service_role;

grant all on table public.tour_hosts    to anon, authenticated, service_role;
grant all on table public.tours         to anon, authenticated, service_role;
grant all on table public.agenda_days   to anon, authenticated, service_role;
grant all on table public.agenda_items  to anon, authenticated, service_role;
grant all on table public.agenda_feedback to anon, authenticated, service_role;
grant all on table public.tour_members  to anon, authenticated, service_role;
grant all on table public.vendors       to anon, authenticated, service_role;
grant all on table public.post_trip     to anon, authenticated, service_role;

grant all on all sequences in schema public to anon, authenticated, service_role;
