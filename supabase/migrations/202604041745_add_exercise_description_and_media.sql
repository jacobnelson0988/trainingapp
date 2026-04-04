alter table public.exercises
add column if not exists description text,
add column if not exists media_url text;
