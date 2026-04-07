alter table public.workout_logs
  add column if not exists workout_kind text,
  add column if not exists running_type text,
  add column if not exists interval_time text,
  add column if not exists intervals_count integer,
  add column if not exists running_distance numeric,
  add column if not exists running_time text,
  add column if not exists average_pulse integer;

update public.workout_logs
set workout_kind = 'gym'
where workout_kind is null;

alter table public.workout_logs
  alter column workout_kind set default 'gym';

create index if not exists workout_logs_user_id_created_at_idx
  on public.workout_logs (user_id, created_at desc);

create index if not exists workout_logs_workout_session_id_idx
  on public.workout_logs (workout_session_id);

create table if not exists public.player_exercise_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  target_sets integer,
  target_reps integer,
  target_weight numeric,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, exercise_id)
);

create index if not exists player_exercise_goals_player_id_idx
  on public.player_exercise_goals (player_id);

create index if not exists player_exercise_goals_exercise_id_idx
  on public.player_exercise_goals (exercise_id);

alter table public.player_exercise_goals enable row level security;

create or replace function public.set_player_exercise_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_exercise_goals_set_updated_at on public.player_exercise_goals;

create trigger player_exercise_goals_set_updated_at
before update on public.player_exercise_goals
for each row
execute function public.set_player_exercise_goals_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_exercise_goals'
      and policyname = 'Coach and admin can manage exercise goals'
  ) then
    create policy "Coach and admin can manage exercise goals"
      on public.player_exercise_goals
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
      and tablename = 'player_exercise_goals'
      and policyname = 'Player can read own exercise goals'
  ) then
    create policy "Player can read own exercise goals"
      on public.player_exercise_goals
      for select
      to authenticated
      using (player_id = auth.uid());
  end if;
end
$$;
