alter table public.workout_logs
add column if not exists set_type text not null default 'work';

update public.workout_logs
set set_type = 'work'
where set_type is null;

alter table public.workout_logs
drop constraint if exists workout_logs_set_type_check;

alter table public.workout_logs
add constraint workout_logs_set_type_check
check (set_type in ('work', 'warmup'));

create index if not exists workout_logs_user_id_set_type_created_at_idx
  on public.workout_logs (user_id, set_type, created_at desc);

create index if not exists workout_logs_workout_session_id_set_type_idx
  on public.workout_logs (workout_session_id, set_type);
