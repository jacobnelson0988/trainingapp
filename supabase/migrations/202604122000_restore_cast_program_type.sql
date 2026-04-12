update public.exercises
set
  exercise_type = 'reps_only',
  default_reps_mode = 'fixed'
where name in (
  'Kastprogram nivå A',
  'Kastprogram nivå B',
  'Kastprogram nivå C',
  'Kastprogram nivå D'
);
