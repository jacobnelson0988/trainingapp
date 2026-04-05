alter table public.workout_templates
add column if not exists team_id uuid references public.teams(id);

create index if not exists workout_templates_team_id_idx
on public.workout_templates(team_id);

update public.workout_templates
set team_id = (
  select id
  from public.teams
  where name = 'Standardlag'
  limit 1
)
where team_id is null
  and lower(code) not in ('a', 'b', 'c', 'test');

delete from public.workout_template_exercises
where workout_template_id in (
  select id
  from public.workout_templates
  where lower(code) in ('a', 'b', 'c', 'test')
);

delete from public.workout_templates
where lower(code) in ('a', 'b', 'c', 'test');
