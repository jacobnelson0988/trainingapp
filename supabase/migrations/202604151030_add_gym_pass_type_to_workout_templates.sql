alter table public.workout_templates
  add column if not exists gym_pass_type text;

update public.workout_templates
set gym_pass_type = 'individual'
where workout_kind = 'gym'
  and gym_pass_type is null;

update public.workout_templates
set gym_pass_type = null
where workout_kind <> 'gym';

alter table public.workout_templates
  drop constraint if exists workout_templates_gym_pass_type_check;

alter table public.workout_templates
  add constraint workout_templates_gym_pass_type_check
  check (
    gym_pass_type is null
    or gym_pass_type in ('shared', 'individual')
  );

create index if not exists workout_templates_team_id_gym_pass_type_idx
  on public.workout_templates (team_id, gym_pass_type);
