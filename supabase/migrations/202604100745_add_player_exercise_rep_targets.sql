create table if not exists public.player_exercise_rep_targets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  rep_range_key text not null,
  target_weight numeric not null,
  source text not null default 'coach',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, exercise_id, rep_range_key)
);

create index if not exists player_exercise_rep_targets_player_id_idx
  on public.player_exercise_rep_targets (player_id);

create index if not exists player_exercise_rep_targets_exercise_id_idx
  on public.player_exercise_rep_targets (exercise_id);

alter table public.player_exercise_rep_targets
  drop constraint if exists player_exercise_rep_targets_rep_range_key_check;

alter table public.player_exercise_rep_targets
  add constraint player_exercise_rep_targets_rep_range_key_check
  check (rep_range_key in ('1_3', '4_5', '6_10', '11_15', '16_20'));

alter table public.player_exercise_rep_targets
  drop constraint if exists player_exercise_rep_targets_source_check;

alter table public.player_exercise_rep_targets
  add constraint player_exercise_rep_targets_source_check
  check (source in ('coach', 'recommendation', 'manual_override'));

alter table public.player_exercise_rep_targets enable row level security;

create or replace function public.set_player_exercise_rep_targets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_exercise_rep_targets_set_updated_at on public.player_exercise_rep_targets;

create trigger player_exercise_rep_targets_set_updated_at
before update on public.player_exercise_rep_targets
for each row
execute function public.set_player_exercise_rep_targets_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_exercise_rep_targets'
      and policyname = 'Coach and admin can manage exercise rep targets'
  ) then
    create policy "Coach and admin can manage exercise rep targets"
      on public.player_exercise_rep_targets
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('coach', 'head_admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role in ('coach', 'head_admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_exercise_rep_targets'
      and policyname = 'Player can read own exercise rep targets'
  ) then
    create policy "Player can read own exercise rep targets"
      on public.player_exercise_rep_targets
      for select
      to authenticated
      using (player_id = auth.uid());
  end if;
end
$$;
