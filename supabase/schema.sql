-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists tour_hosts (
  id uuid references auth.users primary key,
  name text not null,
  email text not null,
  phone text,
  initials text,
  company text default 'Infinity Tours + Events',
  role text not null default 'host' check (role in ('host', 'admin')),
  created_at timestamptz default now()
);

create table if not exists tours (
  id uuid primary key default gen_random_uuid(),
  tour_host_id uuid references tour_hosts(id) not null,
  name text not null,
  school text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  planning_tour_host text,
  traveling_tour_host text,
  destination text,
  alt_destination text,
  dates text,
  start_date date,
  end_date date,
  date_flexible boolean default false,
  status text default 'bid' check (status in ('bid','committed','in-progress','closed')),
  transport_type text default 'flight',
  bus_capacity integer default 55,
  company_pct numeric default 12,
  room_config jsonb default '{"boysPerRoom": 4, "girlsPerRoom": 4}',
  student_count integer default 0,
  boys_count integer default 0,
  girls_count integer default 0,
  activities text[] default '{}',
  notes text,
  access_codes jsonb default '{"coordinator": "", "teacher": "", "driver": "", "student": ""}',
  -- Optional banner photo (chosen from banner_image_library) shown behind the
  -- itinerary header tile. Null → solid navy header. Focus is the object-position
  -- focal point (percent across/down) used when the banner is cropped.
  banner_image_url text,
  banner_focus_x integer default 50,
  banner_focus_y integer default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agenda_days (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  day_number integer not null,
  date text not null,
  collapsed boolean default false,
  sort_order integer default 0
);

create table if not exists agenda_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references agenda_days(id) on delete cascade not null,
  tour_id uuid references tours(id) on delete cascade not null,
  sort_order integer default 0,
  time text,
  type text default 'activity',
  title text not null,
  detail text,
  public_note text,
  address text,
  map_link text,
  website text,
  travel_method text,
  contact_name text,
  contact_phone text,
  contact_email text,
  cost numeric default 0,
  cost_paid boolean default false,
  driver_note text,
  internal_note text,
  meal_pay_type text,
  stipend_amount numeric,
  item_visibility jsonb,
  image_urls text[] not null default '{}',
  created_at timestamptz default now()
);

create table if not exists agenda_feedback (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references agenda_items(id) on delete cascade not null,
  tour_id uuid references tours(id) on delete cascade not null,
  role text not null,
  sentiment text default '😐',
  text text,
  submitted_at timestamptz default now()
);

create table if not exists tour_members (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade not null,
  name text not null,
  type text not null,
  gender text,
  waiver boolean default false,
  notes text,
  sort_order integer default 0
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  rating integer default 4 check (rating between 1 and 5),
  flag boolean default false,
  notes text,
  created_by uuid references tour_hosts(id),
  created_at timestamptz default now()
);

create table if not exists post_trip (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references tours(id) on delete cascade unique not null,
  notes text,
  school_feedback text,
  what_worked text,
  what_to_improve text,
  do_next_time text,
  do_not_repeat text,
  completed boolean default false,
  updated_at timestamptz default now()
);

-- Curated banner images that tour hosts choose from. Managed by admins only
-- (see RLS below); all authenticated hosts may browse. Files live in the
-- public `banner-images` storage bucket (see storage-policies.sql).
create table if not exists banner_image_library (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  label text not null,
  destination text,
  uploaded_by uuid references tour_hosts(id),
  created_at timestamptz default now()
);

-- ─── Updated_at trigger ────────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tours_updated_at
  before update on tours
  for each row execute procedure update_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table tour_hosts enable row level security;
alter table tours enable row level security;
alter table agenda_days enable row level security;
alter table agenda_items enable row level security;
alter table agenda_feedback enable row level security;
alter table tour_members enable row level security;
alter table vendors enable row level security;
alter table post_trip enable row level security;
alter table banner_image_library enable row level security;

-- tour_hosts
create policy "Hosts read own record"
  on tour_hosts for select to authenticated
  using (id = auth.uid());

create policy "Hosts insert own record"
  on tour_hosts for insert to authenticated
  with check (id = auth.uid());

create policy "Hosts update own record"
  on tour_hosts for update to authenticated
  using (id = auth.uid());

-- tours
create policy "Authenticated users read all tours"
  on tours for select to authenticated
  using (true);

create policy "Tour hosts insert own tours"
  on tours for insert to authenticated
  with check (tour_host_id = auth.uid());

create policy "Tour hosts update own tours"
  on tours for update to authenticated
  using (tour_host_id = auth.uid());

create policy "Tour hosts delete own tours"
  on tours for delete to authenticated
  using (tour_host_id = auth.uid());

-- agenda_days
create policy "Read agenda days for accessible tours"
  on agenda_days for select to authenticated
  using (true);

create policy "Tour hosts insert agenda days"
  on agenda_days for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts update agenda days"
  on agenda_days for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts delete agenda days"
  on agenda_days for delete to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

-- agenda_items
create policy "Read agenda items for accessible tours"
  on agenda_items for select to authenticated
  using (true);

create policy "Tour hosts insert agenda items"
  on agenda_items for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts update agenda items"
  on agenda_items for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts delete agenda items"
  on agenda_items for delete to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

-- agenda_feedback (public — anyone with tour URL can submit)
create policy "Read feedback"
  on agenda_feedback for select to authenticated
  using (true);

create policy "Anyone can insert feedback"
  on agenda_feedback for insert
  with check (true);

-- tour_members
create policy "Read tour members"
  on tour_members for select to authenticated
  using (true);

create policy "Tour hosts insert tour members"
  on tour_members for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts update tour members"
  on tour_members for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts delete tour members"
  on tour_members for delete to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

-- vendors
create policy "Authenticated users read vendors"
  on vendors for select to authenticated
  using (true);

create policy "Authenticated users insert vendors"
  on vendors for insert to authenticated
  with check (true);

create policy "Creators update vendors"
  on vendors for update to authenticated
  using (created_by = auth.uid());

-- post_trip
create policy "Read post trip"
  on post_trip for select to authenticated
  using (true);

create policy "Tour hosts insert post trip"
  on post_trip for insert to authenticated
  with check (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

create policy "Tour hosts update post trip"
  on post_trip for update to authenticated
  using (exists (select 1 from tours where id = tour_id and tour_host_id = auth.uid()));

-- banner_image_library: everyone browses, only admins manage.
create policy "Authenticated read banner library"
  on banner_image_library for select to authenticated
  using (true);

create policy "Admins insert banner library"
  on banner_image_library for insert to authenticated
  with check (exists (select 1 from tour_hosts th where th.id = auth.uid() and th.role = 'admin'));

create policy "Admins update banner library"
  on banner_image_library for update to authenticated
  using (exists (select 1 from tour_hosts th where th.id = auth.uid() and th.role = 'admin'));

create policy "Admins delete banner library"
  on banner_image_library for delete to authenticated
  using (exists (select 1 from tour_hosts th where th.id = auth.uid() and th.role = 'admin'));
