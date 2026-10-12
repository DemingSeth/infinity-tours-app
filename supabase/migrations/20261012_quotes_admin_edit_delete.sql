-- Quote Builder (October 2026): any admin can edit or delete any quote.
-- The Quote Builder is admin-only already; before this, only the quote's
-- creator could save or delete it, so an admin opening a colleague's quote saw
-- "Save failed". Insert stays tied to the creator. Uses is_admin(), never an
-- inline role comparison.

drop policy if exists "Creators update own quotes" on public.quotes;
drop policy if exists "Creators delete own quotes" on public.quotes;

create policy "Creators or admins update quotes" on public.quotes
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "Creators or admins delete quotes" on public.quotes
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
