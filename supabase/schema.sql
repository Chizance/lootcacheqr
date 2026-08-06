-- LootcacheQR — database schema
-- Paste this whole file into the Supabase SQL Editor (Dashboard > SQL Editor > New query) and run it.
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / DROP-then-CREATE for policies.

-- ---------------------------------------------------------------------------
-- Locations: nested, self-defined (e.g. Backyard > Shelf A > Bottom Row)
-- ---------------------------------------------------------------------------
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references locations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists locations_parent_id_idx on locations(parent_id);

-- ---------------------------------------------------------------------------
-- Bins: one row per physical bin/tote
-- ---------------------------------------------------------------------------
create table if not exists bins (
  id uuid primary key default gen_random_uuid(),
  number text not null default '',
  title text not null default '',
  description text not null default '',
  tags text[] not null default '{}',
  items text[] not null default '{}',
  photos text[] not null default '{}',
  location_id uuid references locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bins_location_id_idx on bins(location_id);

-- Keep updated_at current on every edit.
-- `set search_path = public` pins which schema this function resolves
-- unqualified names against, so it can't be tricked by a same-named object
-- created earlier in a caller's search path (Supabase advisor: function_search_path_mutable).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql
set search_path = public;

drop trigger if exists bins_set_updated_at on bins;
create trigger bins_set_updated_at
  before update on bins
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — this app has exactly two trusted users (you + your
-- partner), both signing in with a real Supabase account, so the policy is
-- simply "any signed-in user can do anything." No public/anonymous access.
-- ---------------------------------------------------------------------------
alter table locations enable row level security;
alter table bins enable row level security;

drop policy if exists "authenticated users can read locations" on locations;
create policy "authenticated users can read locations"
  on locations for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can write locations" on locations;
create policy "authenticated users can write locations"
  on locations for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated users can read bins" on bins;
create policy "authenticated users can read bins"
  on bins for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can write bins" on bins;
create policy "authenticated users can write bins"
  on bins for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Realtime — lets both phones see each other's edits live.
-- `alter publication ... add table` has no built-in "if not already added"
-- form, so it's wrapped in a check against pg_publication_tables to make
-- this file genuinely safe to re-run (unlike a bare ALTER PUBLICATION, which
-- errors with "already member of publication" on a second run).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bins'
  ) then
    alter publication supabase_realtime add table bins;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'locations'
  ) then
    alter publication supabase_realtime add table locations;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for bin photos.
-- Run this AFTER creating a bucket named "bin-photos" in
-- Dashboard > Storage > New bucket (leave it PRIVATE — do not check "Public bucket").
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated users can read bin photos" on storage.objects;
create policy "authenticated users can read bin photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'bin-photos');

drop policy if exists "authenticated users can upload bin photos" on storage.objects;
create policy "authenticated users can upload bin photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bin-photos');

drop policy if exists "authenticated users can update bin photos" on storage.objects;
create policy "authenticated users can update bin photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'bin-photos');

drop policy if exists "authenticated users can delete bin photos" on storage.objects;
create policy "authenticated users can delete bin photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bin-photos');
