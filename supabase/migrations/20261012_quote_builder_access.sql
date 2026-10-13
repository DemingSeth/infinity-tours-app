-- Quote Builder access (October 2026): active admins only (Seth, Mike, Greta,
-- Amy, Heidi), not Tour Hosts. Replaces the read-by-anyone and creator-only
-- write policies on quotes: any active admin can open, edit, duplicate or
-- delete any quote. Mirrors canUseQuoteBuilder() in lib/roles.ts. Built on
-- is_admin(), never an inline role comparison. SECURITY DEFINER because
-- tour_hosts RLS only lets a user read their own row; it only checks the caller.

create or replace function public.can_use_quote_builder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
     and exists (select 1 from public.tour_hosts th where th.id = auth.uid() and th.is_active);
$$;

revoke all on function public.can_use_quote_builder() from public, anon;
grant execute on function public.can_use_quote_builder() to authenticated;

drop policy if exists "Authenticated users read all quotes" on public.quotes;
drop policy if exists "Creators insert own quotes" on public.quotes;
drop policy if exists "Creators update own quotes" on public.quotes;
drop policy if exists "Creators delete own quotes" on public.quotes;
drop policy if exists "Creators or admins update quotes" on public.quotes;
drop policy if exists "Creators or admins delete quotes" on public.quotes;
drop policy if exists "Quote Builder users read quotes" on public.quotes;
drop policy if exists "Quote Builder users create quotes" on public.quotes;
drop policy if exists "Quote Builder users update quotes" on public.quotes;
drop policy if exists "Quote Builder users delete quotes" on public.quotes;

create policy "Quote Builder users read quotes" on public.quotes
  for select to authenticated using (public.can_use_quote_builder());
create policy "Quote Builder users create quotes" on public.quotes
  for insert to authenticated with check (public.can_use_quote_builder() and created_by = auth.uid());
create policy "Quote Builder users update quotes" on public.quotes
  for update to authenticated using (public.can_use_quote_builder()) with check (public.can_use_quote_builder());
create policy "Quote Builder users delete quotes" on public.quotes
  for delete to authenticated using (public.can_use_quote_builder());
