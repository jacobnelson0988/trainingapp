alter table public.workout_template_exercises
add column if not exists target_reps_min integer,
add column if not exists target_reps_max integer,
add column if not exists target_reps_text text,
add column if not exists target_duration_text text;
