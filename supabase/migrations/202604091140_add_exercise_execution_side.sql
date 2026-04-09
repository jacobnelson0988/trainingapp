alter table public.exercises
add column if not exists execution_side text not null default 'standard';

alter table public.exercises
drop constraint if exists exercises_execution_side_check;

alter table public.exercises
add constraint exercises_execution_side_check
check (execution_side in ('standard', 'single_leg', 'single_arm'));
