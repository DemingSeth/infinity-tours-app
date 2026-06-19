-- ════════════════════════════════════════════════════════════════════════════
-- Quote Builder (Phase 1) — additive table
--
-- Self-contained store for print-ready tour quotes. The whole QuoteData object
-- (see lib/quotes/types.ts) lives in `data` jsonb; the hero image reference is
-- `data.heroPhotoUrl`. The only link to existing schema is the nullable
-- `tour_id` reference, so a quote may optionally be associated with a tour.
--
-- DO NOT APPLY automatically. Run this in the Supabase SQL Editor by hand.
-- Access model mirrors `tours`: any authenticated user may read; only the
-- creator may insert/update/delete.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid null references tours(id) on delete set null,
  data jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_tour_id_idx on quotes(tour_id);
create index if not exists quotes_created_by_idx on quotes(created_by);

-- Reuse the repo's standard updated_at trigger function (defined in schema.sql).
create trigger quotes_updated_at
  before update on quotes
  for each row execute procedure update_updated_at();

-- ─── Row Level Security (mirrors `tours`) ───────────────────────────────────────
alter table quotes enable row level security;

create policy "Authenticated users read all quotes"
  on quotes for select to authenticated
  using (true);

create policy "Creators insert own quotes"
  on quotes for insert to authenticated
  with check (created_by = auth.uid());

create policy "Creators update own quotes"
  on quotes for update to authenticated
  using (created_by = auth.uid());

create policy "Creators delete own quotes"
  on quotes for delete to authenticated
  using (created_by = auth.uid());
