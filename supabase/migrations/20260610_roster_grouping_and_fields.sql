-- Roster v1: structured participant fields + participant grouping foundation.
-- Additive only — safe to run on an existing database. No grouping UI ships in
-- this pass; these tables let grouping (chaperone / bus / rooming) become an
-- additive layer later instead of a migration rework.

-- ─── 1. Structured roster fields on tour_members ──────────────────────────────
-- Previously dietary/allergy info was crammed into the free-text `notes` field.
alter table tour_members add column if not exists dietary_restrictions text;
alter table tour_members add column if not exists allergies text;
alter table tour_members add column if not exists custom_attributes jsonb not null default '{}'::jsonb;

-- ─── 2. Participant grouping foundation ───────────────────────────────────────
-- A participant can belong to one or more groups (join table). A group has a
-- type — chaperone today, bus / rooming later — and may be led by a chaperone
-- (a tour_member). Adding a new group type is just a new `type` value; no schema
-- rework needed.
create table if not exists participant_groups (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  type text not null default 'chaperone' check (type in ('chaperone','bus','rooming','other')),
  name text not null,
  chaperone_member_id uuid references tour_members(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists participant_groups_tour_id_idx on participant_groups(tour_id);

create table if not exists participant_group_members (
  group_id uuid references participant_groups(id) on delete cascade not null,
  member_id uuid references tour_members(id) on delete cascade not null,
  primary key (group_id, member_id)
);
create index if not exists participant_group_members_member_id_idx on participant_group_members(member_id);

-- ─── 3. RLS — mirror tour_members: authenticated read, tour's host writes ──────
alter table participant_groups enable row level security;
alter table participant_group_members enable row level security;

drop policy if exists "Read participant groups" on participant_groups;
create policy "Read participant groups"
  on participant_groups for select to authenticated using (true);

drop policy if exists "Tour hosts insert participant groups" on participant_groups;
create policy "Tour hosts insert participant groups"
  on participant_groups for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

drop policy if exists "Tour hosts update participant groups" on participant_groups;
create policy "Tour hosts update participant groups"
  on participant_groups for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

drop policy if exists "Tour hosts delete participant groups" on participant_groups;
create policy "Tour hosts delete participant groups"
  on participant_groups for delete to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

drop policy if exists "Read participant group members" on participant_group_members;
create policy "Read participant group members"
  on participant_group_members for select to authenticated using (true);

drop policy if exists "Tour hosts insert participant group members" on participant_group_members;
create policy "Tour hosts insert participant group members"
  on participant_group_members for insert to authenticated
  with check (exists (
    select 1 from participant_groups g join tours t on t.id = g.tour_id
    where g.id = group_id and t.tour_host_id = auth.uid()
  ));

drop policy if exists "Tour hosts delete participant group members" on participant_group_members;
create policy "Tour hosts delete participant group members"
  on participant_group_members for delete to authenticated
  using (exists (
    select 1 from participant_groups g join tours t on t.id = g.tour_id
    where g.id = group_id and t.tour_host_id = auth.uid()
  ));
