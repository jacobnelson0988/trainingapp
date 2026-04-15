alter table public.workout_logs
  add column if not exists free_activity_type text;

update public.workout_logs
set free_activity_type = 'running'
where workout_kind = 'running'
  and coalesce(running_origin, 'free') <> 'assigned'
  and free_activity_type is null;

alter table public.workout_logs
  drop constraint if exists workout_logs_free_activity_type_check;

alter table public.workout_logs
  add constraint workout_logs_free_activity_type_check
  check (
    free_activity_type is null
    or free_activity_type in ('running', 'football', 'orienteering')
  );

create index if not exists workout_logs_user_id_free_activity_type_created_at_idx
  on public.workout_logs (user_id, free_activity_type, created_at desc);
