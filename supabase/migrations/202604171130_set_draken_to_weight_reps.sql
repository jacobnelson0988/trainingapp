update public.exercises
set
  exercise_type = 'weight_reps',
  updated_at = timezone('utc', now())
where lower(name) = 'draken';
