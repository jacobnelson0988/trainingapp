alter table public.workout_templates
  add column if not exists running_interval_program jsonb;

alter table public.workout_logs
  add column if not exists running_interval_execution jsonb,
  add column if not exists running_total_elapsed_seconds integer;

create table if not exists public.player_running_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  running_interval_program jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists player_running_presets_user_id_idx
  on public.player_running_presets(user_id);

create or replace function public.set_player_running_presets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_running_presets_set_updated_at on public.player_running_presets;
create trigger player_running_presets_set_updated_at
before update on public.player_running_presets
for each row
execute function public.set_player_running_presets_updated_at();

alter table public.player_running_presets enable row level security;

drop policy if exists "Players can read own running presets" on public.player_running_presets;
create policy "Players can read own running presets"
  on public.player_running_presets
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Players can create own running presets" on public.player_running_presets;
create policy "Players can create own running presets"
  on public.player_running_presets
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Players can update own running presets" on public.player_running_presets;
create policy "Players can update own running presets"
  on public.player_running_presets
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Players can delete own running presets" on public.player_running_presets;
create policy "Players can delete own running presets"
  on public.player_running_presets
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
