alter table public.workout_logs
  drop constraint if exists workout_logs_free_activity_type_check;

alter table public.workout_logs
  add constraint workout_logs_free_activity_type_check
  check (
    free_activity_type is null
    or free_activity_type in (
      'running',
      'football',
      'orienteering',
      'swimming',
      'cycling',
      'racket_sport',
      'handball',
      'custom'
    )
  );
