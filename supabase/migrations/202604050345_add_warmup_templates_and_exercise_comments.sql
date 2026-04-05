create table if not exists public.warmup_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  cardio text,
  technique text,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

alter table public.workout_templates
add column if not exists warmup_cardio text;

alter table public.workout_templates
add column if not exists warmup_technique text;

alter table public.workout_logs
add column if not exists exercise_comment text;
