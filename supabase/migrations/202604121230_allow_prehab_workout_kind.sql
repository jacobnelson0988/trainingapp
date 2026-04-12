alter table public.workout_templates
drop constraint if exists workout_templates_workout_kind_check;

alter table public.workout_templates
add constraint workout_templates_workout_kind_check
check (workout_kind in ('gym', 'running', 'prehab'));
