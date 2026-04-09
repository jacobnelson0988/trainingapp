alter table public.workout_templates
add column if not exists team_id uuid references public.teams(id),
add column if not exists info text,
add column if not exists warmup_cardio text,
add column if not exists warmup_technique text,
add column if not exists workout_kind text,
add column if not exists running_type text,
add column if not exists running_interval_time text,
add column if not exists running_intervals_count integer,
add column if not exists running_distance numeric,
add column if not exists running_time text;

update public.workout_templates
set workout_kind = 'gym'
where workout_kind is null;

update public.workout_templates
set running_type = 'intervals'
where workout_kind = 'running'
  and running_type is null;

alter table public.workout_templates
alter column workout_kind set default 'gym';

alter table public.workout_templates
drop constraint if exists workout_templates_workout_kind_check;

alter table public.workout_templates
add constraint workout_templates_workout_kind_check
check (workout_kind in ('gym', 'running'));

alter table public.workout_templates
drop constraint if exists workout_templates_running_type_check;

alter table public.workout_templates
add constraint workout_templates_running_type_check
check (
  running_type is null
  or running_type in ('intervals', 'distance')
);

create index if not exists workout_templates_team_id_idx
on public.workout_templates(team_id);

create index if not exists workout_templates_team_id_workout_kind_idx
on public.workout_templates(team_id, workout_kind);

alter table public.workout_template_exercises
add column if not exists custom_guide text,
add column if not exists target_sets integer,
add column if not exists target_reps integer,
add column if not exists target_reps_mode text,
add column if not exists target_reps_min integer,
add column if not exists target_reps_max integer,
add column if not exists target_reps_text text,
add column if not exists target_duration_text text;

update public.workout_template_exercises
set target_reps_mode = 'fixed'
where target_reps_mode is null;

update public.workout_template_exercises
set
  target_reps_mode = 'fixed',
  target_reps_text = case
    when target_reps_mode = 'range'
      and coalesce(target_reps_text, '') = ''
      and target_reps_min is not null
      and target_reps_max is not null
      then target_reps_min::text || '-' || target_reps_max::text
    when target_reps_mode = 'time'
      and coalesce(target_reps_text, '') = ''
      and target_reps is not null
      then target_reps::text
    else target_reps_text
  end
where target_reps_mode in ('range', 'time');

alter table public.workout_template_exercises
alter column target_reps_mode set default 'fixed';

alter table public.workout_template_exercises
drop constraint if exists workout_template_exercises_target_reps_mode_check;

alter table public.workout_template_exercises
add constraint workout_template_exercises_target_reps_mode_check
check (target_reps_mode in ('fixed', 'max'));

create index if not exists workout_template_exercises_workout_template_id_idx
on public.workout_template_exercises(workout_template_id);

create index if not exists workout_template_exercises_exercise_id_idx
on public.workout_template_exercises(exercise_id);

create table if not exists public.workout_template_exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  workout_template_exercise_id uuid not null references public.workout_template_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workout_template_exercise_id, alternative_exercise_id)
);

create index if not exists workout_template_exercise_alternatives_template_exercise_idx
on public.workout_template_exercise_alternatives(workout_template_exercise_id);

create index if not exists workout_template_exercise_alternatives_alternative_exercise_idx
on public.workout_template_exercise_alternatives(alternative_exercise_id);

create table if not exists public.warmup_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  cardio text,
  technique text,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create index if not exists warmup_templates_team_id_idx
on public.warmup_templates(team_id);

alter table public.exercises
add column if not exists description text,
add column if not exists media_url text,
add column if not exists execution_side text not null default 'standard';

alter table public.exercises
drop constraint if exists exercises_execution_side_check;

alter table public.exercises
add constraint exercises_execution_side_check
check (execution_side in ('standard', 'single_leg', 'single_arm'));
