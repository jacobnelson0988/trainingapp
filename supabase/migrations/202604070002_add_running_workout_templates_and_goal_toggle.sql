alter table public.profiles
  add column if not exists individual_goals_enabled boolean not null default true;

alter table public.workout_templates
  add column if not exists workout_kind text not null default 'gym',
  add column if not exists running_type text,
  add column if not exists running_interval_time text,
  add column if not exists running_intervals_count integer,
  add column if not exists running_distance numeric,
  add column if not exists running_time text;

alter table public.workout_logs
  add column if not exists running_origin text;

update public.workout_logs
set running_origin = 'free'
where workout_kind = 'running'
  and running_origin is null;

create index if not exists workout_templates_team_id_workout_kind_idx
  on public.workout_templates(team_id, workout_kind);
