-- October 2026 (Amy): Summary of Itinerary checkbox + admin tour ownership transfer.
-- Additive only. Safe to apply before the app deploy.

-- 1. Per-item summary choice. null = automatic (the summary rules decide),
--    true = always show, false = always leave out.
alter table public.agenda_items
  add column if not exists summary_include boolean;

comment on column public.agenda_items.summary_include is
  'Summary of Itinerary checkbox: null = automatic, true = show, false = hide.';

-- 2. Only an admin may change who owns a tour. Before this, tours.tour_host_id
--    was writable by anyone allowed to edit the tour (any listed host or
--    consultant). Server-side contexts with no signed-in user (SQL editor,
--    service role) are allowed through so Seth can still repair data.
create or replace function public.guard_tour_owner_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tour_host_id is distinct from old.tour_host_id
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change who owns a tour.';
  end if;
  return new;
end;
$$;

drop trigger if exists tours_guard_owner_change on public.tours;
create trigger tours_guard_owner_change
  before update of tour_host_id on public.tours
  for each row execute function public.guard_tour_owner_change();

-- 3. Admin transfer. Re-checks admin rights server-side and refuses an
--    inactive or unknown new owner. Messages are written to be shown as-is.
create or replace function public.admin_transfer_tour(p_tour uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can transfer a tour.';
  end if;

  select tour_host_id into v_old from public.tours where id = p_tour for update;
  if not found then
    raise exception 'That tour could not be found.';
  end if;

  if not exists (select 1 from public.tour_hosts where id = p_new_owner and is_active) then
    raise exception 'Pick an active staff member to take over this tour.';
  end if;

  if v_old = p_new_owner then
    return;
  end if;

  update public.tours set tour_host_id = p_new_owner, updated_at = now() where id = p_tour;
end;
$$;

revoke all on function public.admin_transfer_tour(uuid, uuid) from public, anon;
grant execute on function public.admin_transfer_tour(uuid, uuid) to authenticated;
revoke all on function public.guard_tour_owner_change() from public, anon, authenticated;
