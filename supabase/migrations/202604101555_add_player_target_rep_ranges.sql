alter table public.player_exercise_targets
add column if not exists target_reps_min integer,
add column if not exists target_reps_max integer,
add column if not exists target_reps_text text;

