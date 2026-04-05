create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.teams (name)
values ('Standardlag')
on conflict (name) do nothing;

alter table public.profiles
add column if not exists team_id uuid references public.teams(id);

update public.profiles
set team_id = (
  select id
  from public.teams
  where name = 'Standardlag'
  limit 1
)
where team_id is null;

update public.profiles
set role = 'head_admin'
where username = 'jac.nel1';
