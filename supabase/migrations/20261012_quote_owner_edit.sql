-- Quote Page (October 2026): same model as itineraries. Everyone with Quote
-- Page access (active admins) sees every quote and can duplicate any of them;
-- only the person who made a quote can edit or delete it. Builds on
-- can_use_quote_builder() from 20261012_quote_builder_access.sql.

drop policy if exists "Quote Builder users update quotes" on public.quotes;
drop policy if exists "Quote Builder users delete quotes" on public.quotes;

create policy "Quote owners update their quotes" on public.quotes
  for update to authenticated
  using (public.can_use_quote_builder() and created_by = auth.uid())
  with check (public.can_use_quote_builder() and created_by = auth.uid());

create policy "Quote owners delete their quotes" on public.quotes
  for delete to authenticated
  using (public.can_use_quote_builder() and created_by = auth.uid());
