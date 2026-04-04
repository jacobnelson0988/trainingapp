alter table public.exercises
add column if not exists muscle_groups text[] not null default '{}'::text[];

