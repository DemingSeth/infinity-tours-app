-- Request help button (October 2026).
--
-- Each staff member's personal link to the AI Leverage request portal (the CRM's
-- client_portals). A link is a bearer secret: whoever holds it submits requests
-- as that person, and an approver's link sends work straight to billing. So a
-- user may read ONLY their own row. There are no insert, update or delete
-- policies: links are written by the service role when they are issued in the
-- CRM, never from the browser.
create table if not exists public.help_portal_links (
  user_id    uuid primary key references public.tour_hosts(id) on delete cascade,
  url        text not null check (url like 'https://crm.aileverageautomation.com/portal/%'),
  role       text not null check (role in ('approver', 'submitter')),
  updated_at timestamptz not null default now()
);

alter table public.help_portal_links enable row level security;

revoke all on public.help_portal_links from anon;
revoke insert, update, delete on public.help_portal_links from authenticated;
grant select on public.help_portal_links to authenticated;

drop policy if exists help_portal_links_own on public.help_portal_links;
create policy help_portal_links_own on public.help_portal_links
  for select to authenticated
  using (user_id = auth.uid());
