-- 001_meter_init.sql : My Meters schema
-- Runs in the SAME Supabase project as My Expenses (shared login). Every table is prefixed meter_
-- so it never clashes with the expense tables.
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Conventions (all tables, same as My Expenses):
--   id          uuid, generated on the client (offline-first); server default only as fallback
--   user_id     owner; defaults to the signed-in user (auth.uid())
--   created_at / updated_at   updated_at is set by trigger on insert and update (server clock,
--                             used for incremental sync pulls: "where updated_at > last_pulled")
--   deleted_at  soft delete, so deletions also sync to other devices
-- Units used, daily average and projection are NOT stored: they are computed from the readings.

-- ---------------------------------------------------------------------------
-- updated_at trigger function (identical to the one My Expenses created; safe to re-run)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- meter_categories: Bijli, Gas, Pani...
-- ---------------------------------------------------------------------------
create table public.meter_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  icon        text not null default 'gauge' check (icon in ('zap', 'flame', 'droplet', 'gauge')),
  unit        text not null default 'units',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- meter_meters: one physical meter, named by the user (e.g. "Ghar ka meter")
-- ---------------------------------------------------------------------------
create table public.meter_meters (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id  uuid not null references public.meter_categories (id) on delete restrict,
  name         text not null,
  -- Alert when the month's units reach this (null = no alert)
  alert_limit  numeric(14,3) check (alert_limit is null or alert_limit > 0),
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- ---------------------------------------------------------------------------
-- meter_cycles: one billing month of a meter, started with the opening reading from the bill
-- ---------------------------------------------------------------------------
create table public.meter_cycles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meter_id         uuid not null references public.meter_meters (id) on delete cascade,
  start_date       date not null,
  -- Expected next bill reading date; used for the end-of-month projection
  end_date         date not null,
  opening_reading  numeric(14,3) not null check (opening_reading >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  check (end_date > start_date)
);

-- ---------------------------------------------------------------------------
-- meter_readings: a reading noted during a cycle
-- ---------------------------------------------------------------------------
create table public.meter_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  meter_id    uuid not null references public.meter_meters (id) on delete cascade,
  cycle_id    uuid not null references public.meter_cycles (id) on delete cascade,
  reading     numeric(14,3) not null check (reading >= 0),
  taken_at    timestamptz not null default now(),
  note        text,
  -- Path in the meter-photos bucket: <user_id>/<file>.jpg
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- Triggers (insert too: rows created offline arrive with the device's older clock)
-- ---------------------------------------------------------------------------
create trigger meter_categories_set_updated_at before insert or update on public.meter_categories for each row execute function public.set_updated_at();
create trigger meter_meters_set_updated_at     before insert or update on public.meter_meters     for each row execute function public.set_updated_at();
create trigger meter_cycles_set_updated_at     before insert or update on public.meter_cycles     for each row execute function public.set_updated_at();
create trigger meter_readings_set_updated_at   before insert or update on public.meter_readings   for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes: incremental sync pulls (user_id, updated_at) + foreign keys
-- ---------------------------------------------------------------------------
create index meter_categories_user_updated_idx on public.meter_categories (user_id, updated_at);
create index meter_meters_user_updated_idx     on public.meter_meters     (user_id, updated_at);
create index meter_cycles_user_updated_idx     on public.meter_cycles     (user_id, updated_at);
create index meter_readings_user_updated_idx   on public.meter_readings   (user_id, updated_at);

create index meter_meters_category_idx on public.meter_meters   (category_id);
create index meter_cycles_meter_idx    on public.meter_cycles   (meter_id);
create index meter_readings_meter_idx  on public.meter_readings (meter_id);
create index meter_readings_cycle_idx  on public.meter_readings (cycle_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user sees and changes only their own rows
-- ---------------------------------------------------------------------------
alter table public.meter_categories enable row level security;
alter table public.meter_meters     enable row level security;
alter table public.meter_cycles     enable row level security;
alter table public.meter_readings   enable row level security;

grant select, insert, update, delete
  on public.meter_categories, public.meter_meters, public.meter_cycles, public.meter_readings
  to authenticated;

-- meter_categories
create policy "meter_categories_select_own" on public.meter_categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "meter_categories_insert_own" on public.meter_categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "meter_categories_update_own" on public.meter_categories for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meter_categories_delete_own" on public.meter_categories for delete to authenticated
  using ((select auth.uid()) = user_id);

-- meter_meters: must also point at the user's own category
create policy "meter_meters_select_own" on public.meter_meters for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "meter_meters_insert_own" on public.meter_meters for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_categories c where c.id = category_id and c.user_id = (select auth.uid()))
  );
create policy "meter_meters_update_own" on public.meter_meters for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_categories c where c.id = category_id and c.user_id = (select auth.uid()))
  );
create policy "meter_meters_delete_own" on public.meter_meters for delete to authenticated
  using ((select auth.uid()) = user_id);

-- meter_cycles: must also point at the user's own meter
create policy "meter_cycles_select_own" on public.meter_cycles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "meter_cycles_insert_own" on public.meter_cycles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_meters m where m.id = meter_id and m.user_id = (select auth.uid()))
  );
create policy "meter_cycles_update_own" on public.meter_cycles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_meters m where m.id = meter_id and m.user_id = (select auth.uid()))
  );
create policy "meter_cycles_delete_own" on public.meter_cycles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- meter_readings: must also point at the user's own meter and cycle
create policy "meter_readings_select_own" on public.meter_readings for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "meter_readings_insert_own" on public.meter_readings for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_meters m where m.id = meter_id and m.user_id = (select auth.uid()))
    and exists (select 1 from public.meter_cycles c where c.id = cycle_id and c.user_id = (select auth.uid()))
  );
create policy "meter_readings_update_own" on public.meter_readings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.meter_meters m where m.id = meter_id and m.user_id = (select auth.uid()))
    and exists (select 1 from public.meter_cycles c where c.id = cycle_id and c.user_id = (select auth.uid()))
  );
create policy "meter_readings_delete_own" on public.meter_readings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for meter photos, one folder per user (<user_id>/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meter-photos', 'meter-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "meter_photos_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meter_photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meter_photos_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meter_photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'meter-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
