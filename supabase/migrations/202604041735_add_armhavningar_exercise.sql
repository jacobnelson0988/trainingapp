insert into public.exercises (
  name,
  exercise_type,
  guide,
  description,
  media_url,
  default_reps_mode,
  muscle_groups
)
select
  'Armhävningar',
  'reps_only',
  null,
  null,
  null,
  'max',
  array['Bröst', 'Triceps']::text[]
where not exists (
  select 1
  from public.exercises
  where lower(name) = lower('Armhävningar')
);
