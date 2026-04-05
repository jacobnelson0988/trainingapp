alter table public.exercises
add column if not exists aliases text[] not null default '{}',
add column if not exists display_name text;

update public.exercises
set aliases = '{}'
where aliases is null;
