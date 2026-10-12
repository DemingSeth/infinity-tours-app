-- Quote Builder access (October 2026): Seth, Mike and Greta only, for now.
-- Replaces the creator-only write policies and the read-by-anyone policy on
-- quotes. Any of the three can open, edit, duplicate or delete any quote.
-- Keep the email list in step with QUOTE_BUILDER_EMAILS in lib/roles.ts.
-- SECURITY DEFINER because tour_hosts RLS only lets a user read their own row;
-- it only ever checks the caller.

create or replace function public.can_use_quote_builder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tour_hosts th
    where th.id = auth.uid()
      and th.is_active
      and lower(th.email) in (
        'seth@aileverageautomation.com',
        'mike@infinitytours.us',
        'greta@infinitytours.us'
      )
  );
$$;

revoke all on function public.can_use_quote_builder() from public, anon;
grant execute on function public.can_use_quote_builder() to authenticated;

drop policy if exists "Authenticated users read all quotes" on public.quotes;
drop policy if exists "Creators insert own quotes" on public.quotes;
drop policy if exists "Creators update own quotes" on public.quotes;
drop policy if exists "Creators delete own quotes" on public.quotes;
drop policy if exists "Creators or admins update quotes" on public.quotes;
drop policy if exists "Creators or admins delete quotes" on public.quotes;

create policy "Quote Builder users read quotes" on public.quotes
  for select to authenticated using (public.can_use_quote_builder());

create policy "Quote Builder users create quotes" on public.quotes
  for insert to authenticated with check (public.can_use_quote_builder() and created_by = auth.uid());

create policy "Quote Builder users update quotes" on public.quotes
  for update to authenticated using (public.can_use_quote_builder()) with check (public.can_use_quote_builder());

create policy "Quote Builder users delete quotes" on public.quotes
  for delete to authenticated using (public.can_use_quote_builder());
