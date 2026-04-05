create table if not exists public.workout_template_exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  workout_template_exercise_id uuid not null references public.workout_template_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workout_template_exercise_id, alternative_exercise_id)
);
